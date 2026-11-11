insert into public.time_slots (weekday, start_time, capacity)
select d, t::time, 12
from generate_series(1, 5) as d,
     unnest(array['08:00', '10:00', '12:00', '14:00', '16:00']) as t
union all
select d, t::time, 16
from unnest(array[0, 6]) as d,
     unnest(array['09:00', '11:00', '13:00', '15:00', '17:00']) as t
on conflict (weekday, start_time) where weekday is not null do nothing;
