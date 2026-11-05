-- RLS 與權限:anon 一律拒絕、非 staff 看不到資料、staff 只能讀取與改狀態
begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

-- ---- fixture(以 postgres 身分建立)----
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'staff@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'other-staff@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'customer@test.local');
insert into public.staff (user_id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

insert into public.time_slots (id, slot_date, start_time, capacity)
  overriding system value
  values (910001, '2099-01-01', '10:00', 10);
insert into public.reservations (id, slot_id, reservation_date, name, email, party_size, updated_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 910001, '2099-01-01', 'Test A', 'a@test.local', 2, '2000-01-01'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 910001, '2099-01-01', 'Test B', 'b@test.local', 3, '2000-01-01');

-- ---- 結構:三張表都啟用 RLS,is_staff 不在 public ----
select ok((select relrowsecurity from pg_class where oid = 'public.time_slots'::regclass), 'time_slots 啟用 RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.reservations'::regclass), 'reservations 啟用 RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.staff'::regclass), 'staff 啟用 RLS');
select hasnt_function('public', 'is_staff', 'is_staff 不在 public schema(不會被當 RPC 呼叫)');

-- ---- anon ----
set local role anon;
select throws_ok('select * from public.reservations', '42501', null, 'anon 不能讀 reservations');
select throws_ok('select * from public.time_slots', '42501', null, 'anon 不能讀 time_slots');
select throws_ok('select * from public.staff', '42501', null, 'anon 不能讀 staff');
select throws_ok(
  $$insert into public.reservations (slot_id, reservation_date, name, email, party_size)
    values (910001, '2099-01-01', 'x', 'x@test.local', 1)$$,
  '42501', null, 'anon 不能直接新增訂位');
select throws_ok(
  $$select public.create_reservation(910001, '2099-01-01', 'x', 'x@test.local', 1::smallint)$$,
  '42501', null, 'anon 不能呼叫 create_reservation');
select throws_ok($$select * from public.get_availability('2099-01-01')$$,
  '42501', null, 'anon 不能呼叫 get_availability');
select throws_ok('select private.is_staff()', '42501', null, 'anon 不能使用 private schema');
reset role;

-- ---- 已登入但不是 staff ----
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.reservations), 0::bigint, '非 staff 看不到任何訂位');
select is((select count(*) from public.time_slots), 0::bigint, '非 staff 看不到任何時段');
select is((select count(*) from public.staff), 0::bigint, '非 staff 在 staff 表查不到資料');
update public.reservations set status = 'cancelled'
  where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select throws_ok(
  $$insert into public.reservations (slot_id, reservation_date, name, email, party_size)
    values (910001, '2099-01-01', 'x', 'x@test.local', 1)$$,
  '42501', null, '非 staff 不能直接新增訂位');
select throws_ok(
  $$insert into public.time_slots (slot_date, start_time, capacity) values ('2099-01-02', '10:00', 5)$$,
  '42501', null, '非 staff 不能新增時段(RLS with check)');
select throws_ok(
  $$select public.create_reservation(910001, '2099-01-01', 'x', 'x@test.local', 1::smallint)$$,
  '42501', null, '非 staff 不能呼叫 create_reservation');
reset role;
select is(
  (select status::text from public.reservations where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'pending', '非 staff 的 update 沒有改到任何資料');

-- ---- staff ----
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.reservations where email like '%@test.local'), 2::bigint,
  'staff 可以讀取所有訂位');
select is((select count(*) from public.time_slots where id = 910001), 1::bigint, 'staff 可以讀取時段');
select results_eq('select user_id::text from public.staff',
  $$values ('11111111-1111-1111-1111-111111111111')$$, 'staff 只看得到自己的 staff 資料');
select lives_ok(
  $$update public.reservations set status = 'confirmed' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'staff 可以更新訂位狀態');
select is(
  (select status::text from public.reservations where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'confirmed', '狀態確實更新為 confirmed');
select throws_ok(
  $$update public.reservations set name = 'hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '42501', null, 'staff 不能修改訂位的其他欄位');
select throws_ok(
  $$delete from public.reservations where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  '42501', null, 'staff 不能刪除訂位');
select throws_ok(
  $$insert into public.staff (user_id) values ('33333333-3333-3333-3333-333333333333')$$,
  '42501', null, 'staff 不能透過 API 新增其他 staff');
select lives_ok(
  $$insert into public.time_slots (slot_date, start_time, capacity) values ('2099-01-02', '10:00', 5)$$,
  'staff 可以新增時段');
select throws_ok(
  $$delete from public.time_slots where id = 910001$$,
  '42501', null, 'staff 不能刪除時段(改用 is_active 停用)');
reset role;

select is(
  (select updated_at > '2000-01-01'::timestamptz from public.reservations where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  true, '更新狀態時 updated_at 會自動更新');

select * from finish();
rollback;
