-- UNEXECUTED SQL test preparation. Apply the reviewed draft via a local CLI
-- migration first. This tests database JWT/role contexts, not real Auth sessions.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(10);
insert into auth.users(id) select ('10000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,7) n;
insert into public.workspaces(id,name,slug) values
('20000000-0000-0000-0000-000000000001','AZZORA local','azzora-test'),
('20000000-0000-0000-0000-000000000002','Other local','other-test');
insert into public.team_members(id,workspace_id,name,job_title) select
('30000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
'20000000-0000-0000-0000-000000000001','Test person '||n,'Test role' from generate_series(1,6)n;
insert into public.workspace_members(workspace_id,auth_user_id,team_member_id,role,is_active) select
'20000000-0000-0000-0000-000000000001',
('10000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
('30000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
case n when 1 then 'owner_admin' when 2 then 'operations_manager' when 3 then 'project_manager' when 4 then 'site_supervisor' when 5 then 'designer' else 'owner_admin' end,n<>6
from generate_series(1,6)n;
insert into public.clients(id,workspace_id,name) values
('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Local client'),
('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Other client');
insert into public.projects(id,workspace_id,client_id,code,name,project_type,location,emirate,planned_start_date,target_completion_date) select
('50000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
case when n=3 then '20000000-0000-0000-0000-000000000002'::uuid else '20000000-0000-0000-0000-000000000001'::uuid end,
case when n=3 then '40000000-0000-0000-0000-000000000002'::uuid else '40000000-0000-0000-0000-000000000001'::uuid end,
'AZ-TEST-'||n,'Local Project '||n,'Office Fit-Out','Dubai','Dubai','2026-10-07','2027-01-01'
from generate_series(1,3)n;
insert into public.project_assignments(workspace_id,project_id,team_member_id,role,start_date,expected_end_date,status) select
'20000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',
('30000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
case n when 3 then 'Project Manager' when 4 then 'Site Supervisor' else 'Interior Designer' end,'2026-10-07','2027-01-01','Active'
from generate_series(3,5)n;
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('workspaces','team_members','workspace_members','clients','projects','project_phases','project_assignments','tasks','task_dependencies','milestones','task_comments','site_updates','site_update_photos','snags','snag_media','documents','handover_items','activities','task_attachments') and not c.relrowsecurity),'every business table has RLS');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select is((select count(*)::int from public.projects),2,'owner sees own workspace only');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select is((select count(*)::int from public.projects),2,'operations sees own workspace only');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select is((select count(*)::int from public.projects),1,'PM sees assigned project only');
select is((select count(*)::int from public.projects where id='50000000-0000-0000-0000-000000000002'),0,'direct unrelated project query denied');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select is((select count(*)::int from public.projects),1,'supervisor sees assigned project only');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select is((select count(*)::int from public.projects),1,'designer sees assigned project only');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000006',true);
select is((select count(*)::int from public.projects),0,'inactive member denied');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000007',true);
select is((select count(*)::int from public.projects),0,'non-member denied');
select ok(not has_table_privilege('authenticated','public.projects','insert'),'client writes remain denied at preparation checkpoint');
reset role;
select * from finish();
rollback;
