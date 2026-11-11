insert into public.time_slots (weekday, start_time, capacity)
select d, t::time, 12
from generate_series(1, 5) as d,
     unnest(array['08:00', '10:00', '12:00', '14:00', '16:00']) as t;

insert into public.time_slots (weekday, start_time, capacity)
select d, t::time, 16
from unnest(array[0, 6]) as d,
     unnest(array['09:00', '11:00', '13:00', '15:00', '17:00']) as t;

with days as (
  select ((now() at time zone 'Asia/Taipei')::date + n) as day
  from generate_series(1, 2) as n
),
slots as (
  select id, weekday, row_number() over (partition by weekday order by start_time) as slot_rank
  from public.time_slots
  where weekday is not null
),
fake(name, email, party_size, status, note, slot_rank) as (
  values
    ('示範顧客 王小明', 'demo1@example.com', 2::smallint, 'pending'::public.reservation_status, '靠窗座位', 1),
    ('示範顧客 林小華', 'demo2@example.com', 4::smallint, 'confirmed'::public.reservation_status, null, 1),
    ('示範顧客 陳大文', 'demo3@example.com', 3::smallint, 'cancelled'::public.reservation_status, '有嬰兒車', 1),
    ('Demo Guest Emma Wilson', 'demo4@example.com', 2::smallint, 'pending'::public.reservation_status, 'Window seat, please', 2),
    ('Demo Guest Liam Carter', 'demo5@example.com', 5::smallint, 'confirmed'::public.reservation_status, null, 2),
    ('Demo Guest Olivia Brooks', 'demo6@example.com', 3::smallint, 'cancelled'::public.reservation_status, 'Bringing a stroller', 2)
)
insert into public.reservations (slot_id, reservation_date, name, email, party_size, status, note)
select s.id, d.day, f.name, f.email, f.party_size, f.status, f.note
from days d
cross join fake f
join slots s on s.weekday = extract(dow from d.day) and s.slot_rank = f.slot_rank;
