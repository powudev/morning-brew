-- Morning Brew(Demo project):訂位系統 schema + RLS
--
-- 權限模型
--   anon          → 沒有任何資料表或函式權限。公開頁內容來自 content/*.json。
--   authenticated → 只有登記在 staff 的使用者能讀取/更新訂位(RLS)。
--   service_role  → 只有 Cloudflare Pages Function 持有,透過 create_reservation() 寫入訂位。

-- ---------------------------------------------------------------------------
-- 型別與資料表
-- ---------------------------------------------------------------------------

create type public.reservation_status as enum ('pending', 'confirmed', 'cancelled');

-- 時段:每週固定(weekday)或特定日期(slot_date)二擇一;capacity 以「人數」計
create table public.time_slots (
  id bigint generated always as identity primary key,
  weekday smallint check (weekday between 0 and 6), -- 0 = 週日,同 extract(dow)
  slot_date date,
  start_time time not null,
  capacity integer not null check (capacity between 1 and 200),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint time_slots_weekday_xor_date check ((weekday is null) <> (slot_date is null))
);

create unique index time_slots_weekday_time_key
  on public.time_slots (weekday, start_time) where weekday is not null;
create unique index time_slots_date_time_key
  on public.time_slots (slot_date, start_time) where slot_date is not null;

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  slot_id bigint not null references public.time_slots (id) on delete restrict,
  reservation_date date not null,
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (
    char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  phone text check (char_length(phone) <= 30),
  party_size smallint not null check (party_size between 1 and 8),
  note text check (char_length(note) <= 500),
  status public.reservation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reservations_date_slot_idx on public.reservations (reservation_date, slot_id);

-- 店家帳號:對應 auth.users
create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  display_name text check (char_length(display_name) <= 100),
  created_at timestamptz not null default now()
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 權限:先全部收回,再逐項開放(不依賴平台預設 grant)
-- ---------------------------------------------------------------------------

revoke all on public.time_slots, public.reservations, public.staff from anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- is_staff() 放在不經 Data API 暴露的 schema,避免被當成 RPC 呼叫
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create function private.is_staff()
returns boolean
language sql
stable
security definer -- staff 表本身有 RLS,需以 owner 身分查詢
set search_path = ''
as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()));
$$;

revoke execute on function private.is_staff() from public, anon;
grant execute on function private.is_staff() to authenticated;

alter table public.time_slots enable row level security;
alter table public.reservations enable row level security;
alter table public.staff enable row level security;

-- staff:登入者只能看到自己那一列(前端用來判斷是否為店家)
grant select on public.staff to authenticated;
create policy "staff can read own row"
  on public.staff for select to authenticated
  using (user_id = (select auth.uid()));

-- reservations:staff 可讀全部;只能改 status(欄位層級 grant)
grant select on public.reservations to authenticated;
grant update (status) on public.reservations to authenticated;

create policy "staff can read reservations"
  on public.reservations for select to authenticated
  using ((select private.is_staff()));

create policy "staff can update reservation status"
  on public.reservations for update to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

-- time_slots:staff 可讀、新增、修改(停用改 is_active,不刪除以保留訂位關聯)
grant select, insert, update (start_time, capacity, is_active) on public.time_slots to authenticated;

create policy "staff can read time slots"
  on public.time_slots for select to authenticated
  using ((select private.is_staff()));

create policy "staff can insert time slots"
  on public.time_slots for insert to authenticated
  with check ((select private.is_staff()));

create policy "staff can update time slots"
  on public.time_slots for update to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

-- ---------------------------------------------------------------------------
-- 訂位函式(只給 service_role,也就是 Pages Function)
-- ---------------------------------------------------------------------------

-- 某日可訂時段與剩餘人數(給 /reserve 表單顯示)
create function public.get_availability(p_date date)
returns table (slot_id bigint, start_time time, capacity integer, remaining integer)
language sql
stable
set search_path = ''
as $$
  select
    s.id,
    s.start_time,
    s.capacity,
    s.capacity - coalesce(sum(r.party_size) filter (where r.status <> 'cancelled'), 0)::integer
  from public.time_slots s
  left join public.reservations r
    on r.slot_id = s.id and r.reservation_date = p_date
  where s.is_active
    and (s.slot_date = p_date or (s.slot_date is null and s.weekday = extract(dow from p_date)))
  group by s.id
  order by s.start_time;
$$;

-- 建立訂位:鎖住時段列,在同一交易內檢查容量,避免同時送出造成超賣。
-- 錯誤以 message 代碼回傳,由 Pages Function 轉成使用者看得懂的訊息。
create function public.create_reservation(
  p_slot_id bigint,
  p_date date,
  p_name text,
  p_email text,
  p_party_size smallint,
  p_phone text default null,
  p_note text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_slot public.time_slots%rowtype;
  v_today date := (now() at time zone 'Asia/Taipei')::date;
  v_now_time time := (now() at time zone 'Asia/Taipei')::time;
  v_booked integer;
  v_id uuid;
begin
  if p_date < v_today or p_date > v_today + 30 then
    raise exception using errcode = 'P0001', message = 'INVALID_DATE';
  end if;

  select * into v_slot
  from public.time_slots
  where id = p_slot_id
  for update;

  if not found
    or not v_slot.is_active
    -- 用 is not distinct from:每週時段的 slot_date 是 null,用 = 會讓整個條件變 null 而放行
    or not (v_slot.slot_date is not distinct from p_date
            or (v_slot.slot_date is null and v_slot.weekday = extract(dow from p_date)))
  then
    raise exception using errcode = 'P0001', message = 'SLOT_NOT_AVAILABLE';
  end if;

  if p_date = v_today and v_slot.start_time <= v_now_time then
    raise exception using errcode = 'P0001', message = 'SLOT_IN_PAST';
  end if;

  select coalesce(sum(party_size), 0) into v_booked
  from public.reservations
  where slot_id = p_slot_id
    and reservation_date = p_date
    and status <> 'cancelled';

  if v_booked + p_party_size > v_slot.capacity then
    raise exception using errcode = 'P0001', message = 'SLOT_FULL';
  end if;

  insert into public.reservations (slot_id, reservation_date, name, email, phone, party_size, note)
  values (p_slot_id, p_date, p_name, p_email, nullif(p_phone, ''), p_party_size, nullif(p_note, ''))
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.get_availability(date) from public, anon, authenticated;
revoke execute on function public.create_reservation(bigint, date, text, text, smallint, text, text)
  from public, anon, authenticated;
grant execute on function public.get_availability(date) to service_role;
grant execute on function public.create_reservation(bigint, date, text, text, smallint, text, text)
  to service_role;

-- 函式為 security invoker,service_role 需有資料表權限(明寫,不依賴平台預設)
grant select, insert, update on public.time_slots, public.reservations to service_role;
grant select on public.staff to service_role;
