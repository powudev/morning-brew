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
fake(name, email, party_size, status, note) as (
  values
    ('示範顧客 王小明', 'demo1@example.com', 2::smallint, 'pending'::public.reservation_status, '靠窗座位'),
    ('示範顧客 林小華', 'demo2@example.com', 4::smallint, 'confirmed'::public.reservation_status, null),
    ('示範顧客 陳大文', 'demo3@example.com', 3::smallint, 'cancelled'::public.reservation_status, '有嬰兒車')
)
insert into public.reservations (slot_id, reservation_date, name, email, party_size, status, note)
select s.id, d.day, f.name, f.email, f.party_size, f.status, f.note
from days d
join public.time_slots s
  on s.weekday = extract(dow from d.day) and s.start_time = (select min(start_time) from public.time_slots where weekday = s.weekday)
cross join fake f;
