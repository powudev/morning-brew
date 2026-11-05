-- create_reservation() 與 get_availability():容量、日期、時段規則
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- 測試日期:台北時間今天 + 7 天(一定在可訂範圍內)
create temp table fx on commit drop as
select
  (now() at time zone 'Asia/Taipei')::date as today,
  (now() at time zone 'Asia/Taipei')::date + 7 as d;
grant select on fx to service_role;

-- fixture 時段:指定日期容量 4 人、停用時段、別的星期幾(容量 20,供欄位限制測試)、今天 00:00(已過)
insert into public.time_slots (id, slot_date, start_time, capacity, is_active)
  overriding system value
  select 920001, d, '23:01'::time, 4, true from fx
  union all select 920002, d, '23:02'::time, 4, false from fx
  union all select 920004, today, '00:00'::time, 4, true from fx;
insert into public.time_slots (id, weekday, start_time, capacity)
  overriding system value
  select 920003, ((extract(dow from d)::int + 1) % 7)::smallint, '23:03'::time, 20 from fx;

set local role service_role;

-- ---- 成功路徑 ----
select isnt(
  public.create_reservation(920001, (select d from fx), '測試 甲', 'a@test.local', 3::smallint, '0900-000-000', '靠窗'),
  null, '可以建立訂位並回傳 id');
select results_eq(
  $$select status::text, party_size::int, phone, note from public.reservations where email = 'a@test.local'$$,
  $$values ('pending', 3, '0900-000-000', '靠窗')$$,
  '新訂位狀態為 pending,欄位正確寫入');
select public.create_reservation(920001, (select d from fx), '測試 乙', 'b@test.local', 1::smallint, '', '');
select results_eq(
  $$select phone, note from public.reservations where email = 'b@test.local'$$,
  $$values (null::text, null::text)$$,
  '空字串的電話與備註存成 null');

-- ---- 容量 ----
select throws_ok(
  $$select public.create_reservation(920001, (select d from fx), '測試 丙', 'c@test.local', 1::smallint)$$,
  'P0001', 'SLOT_FULL', '已滿(3+1=4)後再訂 1 人被拒');
update public.reservations set status = 'cancelled' where email = 'b@test.local';
select lives_ok(
  $$select public.create_reservation(920001, (select d from fx), '測試 丁', 'd@test.local', 1::smallint)$$,
  '取消的訂位不佔容量,剛好填滿可以成功');
select throws_ok(
  $$select public.create_reservation(920001, (select d from fx), '測試 戊', 'e@test.local', 1::smallint)$$,
  'P0001', 'SLOT_FULL', '剛好滿額後再訂被拒');

-- ---- 日期 ----
select throws_ok(
  $$select public.create_reservation(920001, (select today - 1 from fx), 'x', 'x@test.local', 1::smallint)$$,
  'P0001', 'INVALID_DATE', '過去的日期被拒');
select throws_ok(
  $$select public.create_reservation(920001, (select today + 31 from fx), 'x', 'x@test.local', 1::smallint)$$,
  'P0001', 'INVALID_DATE', '超過 30 天後的日期被拒');

-- ---- 時段 ----
select throws_ok(
  $$select public.create_reservation(999999, (select d from fx), 'x', 'x@test.local', 1::smallint)$$,
  'P0001', 'SLOT_NOT_AVAILABLE', '不存在的時段被拒');
select throws_ok(
  $$select public.create_reservation(920002, (select d from fx), 'x', 'x@test.local', 1::smallint)$$,
  'P0001', 'SLOT_NOT_AVAILABLE', '停用的時段被拒');
select throws_ok(
  $$select public.create_reservation(920003, (select d from fx), 'x', 'x@test.local', 1::smallint)$$,
  'P0001', 'SLOT_NOT_AVAILABLE', '星期幾不符的時段被拒');
select throws_ok(
  $$select public.create_reservation(920001, (select d + 1 from fx), 'x', 'x@test.local', 1::smallint)$$,
  'P0001', 'SLOT_NOT_AVAILABLE', '指定日期時段不能用在其他日期');
select throws_ok(
  $$select public.create_reservation(920004, (select today from fx), 'x', 'x@test.local', 1::smallint)$$,
  'P0001', 'SLOT_IN_PAST', '今天已經過去的時段被拒');

-- ---- 欄位限制(資料庫最後一道防線)----
select throws_ok(
  $$select public.create_reservation(920003, (select d + 1 from fx), 'x', 'x@test.local', 9::smallint)$$,
  '23514', null, '人數超過 8 被拒');
select throws_ok(
  $$select public.create_reservation(920003, (select d + 1 from fx), 'x', 'x@test.local', 0::smallint)$$,
  '23514', null, '人數 0 被拒');
select throws_ok(
  $$select public.create_reservation(920003, (select d + 1 from fx), 'x', 'not-an-email', 1::smallint)$$,
  '23514', null, 'email 格式錯誤被拒');
select throws_ok(
  $$select public.create_reservation(920003, (select d + 1 from fx), '', 'x@test.local', 1::smallint)$$,
  '23514', null, '空白姓名被拒');
select throws_ok(
  $$select public.create_reservation(920003, (select d + 1 from fx), 'x', 'x@test.local', 1::smallint, null, repeat('a', 501))$$,
  '23514', null, '備註超過 500 字被拒');

-- ---- get_availability ----
select results_eq(
  $$select slot_id, capacity, remaining from public.get_availability((select d from fx))
    where slot_id between 920000 and 929999$$,
  $$values (920001::bigint, 4, 0)$$,
  'get_availability 只列啟用且適用該日的時段,剩餘人數扣除未取消訂位');
select results_eq(
  $$select slot_id, remaining from public.get_availability((select d + 1 from fx))
    where slot_id between 920000 and 929999$$,
  $$values (920003::bigint, 20)$$,
  'get_availability 依星期幾列出每週固定時段');

select * from finish();
rollback;
