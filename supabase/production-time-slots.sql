-- 正式環境(Demo 網站)的每週時段;不含任何訂位資料。可重複執行(已存在的時段不變)。
-- 執行:supabase db query --remote --yes -f supabase/production-time-slots.sql
-- 與 seed.sql 的時段相同:週一至週五 08:00–16:00(每段 12 人)、週末 09:00–17:00(每段 16 人)
insert into public.time_slots (weekday, start_time, capacity)
select d, t::time, 12
from generate_series(1, 5) as d,
     unnest(array['08:00', '10:00', '12:00', '14:00', '16:00']) as t
union all
select d, t::time, 16
from unnest(array[0, 6]) as d,
     unnest(array['09:00', '11:00', '13:00', '15:00', '17:00']) as t
on conflict (weekday, start_time) where weekday is not null do nothing;
