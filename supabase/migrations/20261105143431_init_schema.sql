-- Access model:
--   anon          no table or function privileges at all
--   authenticated staff members (listed in public.staff) can read reservations and update status only
--   service_role  used by the Pages Function to call create_reservation()

create type public.reservation_status as enum ('pending', 'confirmed', 'cancelled');

create table public.time_slots (
  id bigint generated always as identity primary key,
  weekday smallint check (weekday between 0 and 6),
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

revoke all on public.time_slots, public.reservations, public.staff from anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create function private.is_staff()
returns boolean
language sql
stable
-- Runs as owner because public.staff itself has RLS.
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()));
$$;

revoke execute on function private.is_staff() from public, anon;
grant execute on function private.is_staff() to authenticated;

alter table public.time_slots enable row level security;
alter table public.reservations enable row level security;
alter table public.staff enable row level security;

grant select on public.staff to authenticated;
create policy "staff can read own row"
  on public.staff for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.reservations to authenticated;
grant update (status) on public.reservations to authenticated;

create policy "staff can read reservations"
  on public.reservations for select to authenticated
  using ((select private.is_staff()));

create policy "staff can update reservation status"
  on public.reservations for update to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

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

  -- Lock the slot row so concurrent bookings can't oversell it.
  select * into v_slot
  from public.time_slots
  where id = p_slot_id
  for update;

  if not found
    or not v_slot.is_active
    -- "is not distinct from": weekly slots have a null slot_date, and "=" would let NULL through.
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

grant select, insert, update on public.time_slots, public.reservations to service_role;
grant select on public.staff to service_role;
