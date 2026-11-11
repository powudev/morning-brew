begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

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

select ok((select relrowsecurity from pg_class where oid = 'public.time_slots'::regclass), 'time_slots has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.reservations'::regclass), 'reservations has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.staff'::regclass), 'staff has RLS enabled');
select hasnt_function('public', 'is_staff', 'is_staff is not in the public schema (not exposed as RPC)');

set local role anon;
select throws_ok('select * from public.reservations', '42501', null, 'anon cannot read reservations');
select throws_ok('select * from public.time_slots', '42501', null, 'anon cannot read time_slots');
select throws_ok('select * from public.staff', '42501', null, 'anon cannot read staff');
select throws_ok(
  $$insert into public.reservations (slot_id, reservation_date, name, email, party_size)
    values (910001, '2099-01-01', 'x', 'x@test.local', 1)$$,
  '42501', null, 'anon cannot insert reservations directly');
select throws_ok(
  $$select public.create_reservation(910001, '2099-01-01', 'x', 'x@test.local', 1::smallint)$$,
  '42501', null, 'anon cannot call create_reservation');
select throws_ok($$select * from public.get_availability('2099-01-01')$$,
  '42501', null, 'anon cannot call get_availability');
select throws_ok('select private.is_staff()', '42501', null, 'anon cannot use the private schema');
reset role;

select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.reservations), 0::bigint, 'non-staff sees no reservations');
select is((select count(*) from public.time_slots), 0::bigint, 'non-staff sees no time slots');
select is((select count(*) from public.staff), 0::bigint, 'non-staff sees no rows in staff');
update public.reservations set status = 'cancelled'
  where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select throws_ok(
  $$insert into public.reservations (slot_id, reservation_date, name, email, party_size)
    values (910001, '2099-01-01', 'x', 'x@test.local', 1)$$,
  '42501', null, 'non-staff cannot insert reservations directly');
select throws_ok(
  $$insert into public.time_slots (slot_date, start_time, capacity) values ('2099-01-02', '10:00', 5)$$,
  '42501', null, 'non-staff cannot insert time slots (RLS with check)');
select throws_ok(
  $$select public.create_reservation(910001, '2099-01-01', 'x', 'x@test.local', 1::smallint)$$,
  '42501', null, 'non-staff cannot call create_reservation');
reset role;
select is(
  (select status::text from public.reservations where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'pending', 'non-staff update changes nothing');

select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.reservations where email like '%@test.local'), 2::bigint,
  'staff can read all reservations');
select is((select count(*) from public.time_slots where id = 910001), 1::bigint, 'staff can read time slots');
select results_eq('select user_id::text from public.staff',
  $$values ('11111111-1111-1111-1111-111111111111')$$, 'staff sees only their own staff row');
select lives_ok(
  $$update public.reservations set status = 'confirmed' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'staff can update reservation status');
select is(
  (select status::text from public.reservations where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'confirmed', 'status is updated to confirmed');
select throws_ok(
  $$update public.reservations set name = 'hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '42501', null, 'staff cannot change other reservation columns');
select throws_ok(
  $$delete from public.reservations where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  '42501', null, 'staff cannot delete reservations');
select throws_ok(
  $$insert into public.staff (user_id) values ('33333333-3333-3333-3333-333333333333')$$,
  '42501', null, 'staff cannot add other staff through the API');
select lives_ok(
  $$insert into public.time_slots (slot_date, start_time, capacity) values ('2099-01-02', '10:00', 5)$$,
  'staff can insert time slots');
select throws_ok(
  $$delete from public.time_slots where id = 910001$$,
  '42501', null, 'staff cannot delete time slots (deactivate with is_active instead)');
reset role;

select is(
  (select updated_at > '2000-01-01'::timestamptz from public.reservations where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  true, 'updated_at is bumped when status changes');

select * from finish();
rollback;
