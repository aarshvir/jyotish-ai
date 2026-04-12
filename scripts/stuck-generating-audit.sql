-- Audit stuck report generation (run in Supabase SQL Editor)
-- Replace UUID with the report id from the URL.

select id, status, plan_type, native_name, birth_date,
       generation_started_at, generation_completed_at, created_at, updated_at
from public.reports
where id = '15fa424b-f6cf-4f08-80af-a3cf70527b5a';

-- All rows stuck in generating for a long time
select id, status, native_name, user_email,
       generation_started_at, updated_at, created_at
from public.reports
where status = 'generating'
  and coalesce(generation_started_at, created_at) < now() - interval '25 minutes'
order by coalesce(generation_started_at, created_at) asc
limit 50;
