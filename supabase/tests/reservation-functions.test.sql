begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

create temp table fx on commit drop as
select
  (now() at time zone 'Asia/Taipei')::date as today,
  (now() at time zone 'Asia/Taipei')::date + 7 as d;
grant select on fx to service_role;

insert into public.time_slots (id, slot_date, start_time, capacity, is_active)
  overriding system value
  select 920001, d, '23:01'::time, 4, true from fx
  union all select 920002, d, '23:02'::time, 4, false from fx
  union all select 920004, today, '00:00'::time, 4, true from fx;
insert into public.time_slots (id, weekday, start_time, capacity)
  overriding system value
  select 920003, ((extract(dow from d)::int + 1) % 7)::smallint, '23:03'::time, 20 from fx;

set local role service_role;

select isnt(
  public.create_reservation(920001, (select d from fx), 'Test A', 'a@test.local', 3::smallint, '0900-000-000', 'window seat'),
  null, 'creates a reservation and returns its id');
select results_eq(
  $$select status::text, party_size::int, phone, note from public.reservations where email = 'a@test.local'$$,
  $$values ('pending', 3, '0900-000-000', 'window seat')$$,
  'new reservation is pending with fields stored correctly');
select public.create_reservation(920001, (select d from fx), 'Test B', 'b@test.local', 1::smallint, '', '');
select results_eq(
  $$select phone, note from public.reservations where email = 'b@test.local'$$,
  $$values (null::text, null::text)$$,
  'empty phone and note are stored as null');

select throws_ok(
  $$select public.create_reservation(920001, (select d from fx), 'Test C', 'c@test.local', 1::smallint)$$,
  'P0001', 'SLOT_FULL', 'rejects 1 more guest once full (3+1=4)');
update public.reservations set status = 'cancelled' where email = 'b@test.local';
select lives_ok(
  $$select public.create_reservation(920001, (select d from fx), 'Test D', 'd@test.local', 1::smallint)$$,
  'cancelled reservations free capacity, filling the slot exactly succeeds');
select throws_ok(
  $$select public.create_reservation(920001, (select d from fx), 'Test E', 'e@test.local', 1::smallint)$$,
  'P0001', 'SLOT_FULL', 'rejects booking once exactly full');

select throws_ok(
  $$select public.create_reservation(920001, (select today - 1 from fx), 'x', 'x@test.local', 1::smallint)$$,
  'P0001', 'INVALID_DATE', 'rejects past dates');
select throws_ok(
  $$select public.create_reservation(920001, (select today + 31 from fx), 'x', 'x@test.local', 1::smallint)$$,
  'P0001', 'INVALID_DATE', 'rejects dates more than 30 days ahead');

select throws_ok(
  $$select public.create_reservation(999999, (select d from fx), 'x', 'x@test.local', 1::smallint)$$,
  'P0001', 'SLOT_NOT_AVAILABLE', 'rejects unknown slots');
select throws_ok(
  $$select public.create_reservation(920002, (select d from fx), 'x', 'x@test.local', 1::smallint)$$,
  'P0001', 'SLOT_NOT_AVAILABLE', 'rejects inactive slots');
select throws_ok(
  $$select public.create_reservation(920003, (select d from fx), 'x', 'x@test.local', 1::smallint)$$,
  'P0001', 'SLOT_NOT_AVAILABLE', 'rejects weekly slots on the wrong weekday');
select throws_ok(
  $$select public.create_reservation(920001, (select d + 1 from fx), 'x', 'x@test.local', 1::smallint)$$,
  'P0001', 'SLOT_NOT_AVAILABLE', 'rejects date-specific slots on other dates');
select throws_ok(
  $$select public.create_reservation(920004, (select today from fx), 'x', 'x@test.local', 1::smallint)$$,
  'P0001', 'SLOT_IN_PAST', 'rejects slots already past today');

select throws_ok(
  $$select public.create_reservation(920003, (select d + 1 from fx), 'x', 'x@test.local', 9::smallint)$$,
  '23514', null, 'rejects party size over 8');
select throws_ok(
  $$select public.create_reservation(920003, (select d + 1 from fx), 'x', 'x@test.local', 0::smallint)$$,
  '23514', null, 'rejects party size 0');
select throws_ok(
  $$select public.create_reservation(920003, (select d + 1 from fx), 'x', 'not-an-email', 1::smallint)$$,
  '23514', null, 'rejects invalid email');
select throws_ok(
  $$select public.create_reservation(920003, (select d + 1 from fx), '', 'x@test.local', 1::smallint)$$,
  '23514', null, 'rejects blank name');
select throws_ok(
  $$select public.create_reservation(920003, (select d + 1 from fx), 'x', 'x@test.local', 1::smallint, null, repeat('a', 501))$$,
  '23514', null, 'rejects notes over 500 characters');

select results_eq(
  $$select slot_id, capacity, remaining from public.get_availability((select d from fx))
    where slot_id between 920000 and 929999$$,
  $$values (920001::bigint, 4, 0)$$,
  'get_availability lists active slots for the date, remaining excludes non-cancelled bookings');
select results_eq(
  $$select slot_id, remaining from public.get_availability((select d + 1 from fx))
    where slot_id between 920000 and 929999$$,
  $$values (920003::bigint, 20)$$,
  'get_availability lists weekly slots by weekday');

select * from finish();
rollback;
