begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select plan(24);
select has_function('public','get_tenant_development_dashboard_v1',array['uuid']);
select is((select prosecdef from pg_proc where oid='public.get_tenant_development_dashboard_v1(uuid)'::regprocedure),true,'SECURITY DEFINER');
select is((select provolatile from pg_proc where oid='public.get_tenant_development_dashboard_v1(uuid)'::regprocedure),'s'::"char",'STABLE');
select is((select proconfig from pg_proc where oid='public.get_tenant_development_dashboard_v1(uuid)'::regprocedure),array['search_path=public, pg_temp']::text[],'search_path hardened');
select is((select pg_get_userbyid(proowner) from pg_proc where oid='public.get_tenant_development_dashboard_v1(uuid)'::regprocedure),'postgres','owner postgres');
select ok(has_function_privilege('authenticated','public.get_tenant_development_dashboard_v1(uuid)','execute'),'authenticated execute');
select ok(not has_function_privilege('public','public.get_tenant_development_dashboard_v1(uuid)','execute'),'PUBLIC denied');
select ok(not has_function_privilege('anon','public.get_tenant_development_dashboard_v1(uuid)','execute'),'anon denied');
select ok(not has_function_privilege('service_role','public.get_tenant_development_dashboard_v1(uuid)','execute'),'service_role denied');
select ok(not has_table_privilege('authenticated','public.development_plans','select'),'plans remain closed');
select ok(not has_table_privilege('authenticated','public.development_goals','select'),'goals remain closed');
select ok(not has_table_privilege('authenticated','public.development_actions','select'),'actions remain closed');
select ok(not has_table_privilege('authenticated','public.development_templates','select'),'templates remain closed');
select is((select proargnames from pg_proc where oid='public.get_tenant_development_dashboard_v1(uuid)'::regprocedure),array['p_company_id','record_type','record_id','parent_id','employee_id','owner_id','template_id','competency_id','label','status','priority','action_type','current_level','expected_level','target_level','start_date','due_date','completed_at','scope','suggested_duration_days']::text[],'exact contract');
insert into auth.users(id,email) select ('84010000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'dev'||n||'@example.com' from generate_series(1,7)n;
insert into public.companies(id,name,slug) values('84010000-0000-4000-8000-000000000101','Dev A','dev-a'),('84010000-0000-4000-8000-000000000102','Dev B','dev-b');
insert into public.company_members(id,company_id,user_id,role,status) select ('84010000-0000-4000-8000-'||lpad((100+n)::text,12,'0'))::uuid,'84010000-0000-4000-8000-000000000101',('84010000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,(array['owner','admin','hr','manager','employee','admin'])[n],case when n=6 then 'inactive' else 'active' end from generate_series(1,6)n;
insert into public.development_templates(id,company_id,name,scope,active) values
('84010000-0000-4000-8000-000000000201','84010000-0000-4000-8000-000000000101','Zulu Template','company',true),
('84010000-0000-4000-8000-000000000202','84010000-0000-4000-8000-000000000101','Alpha Template','company',true),
('84010000-0000-4000-8000-000000000203','84010000-0000-4000-8000-000000000101','Hidden Template','company',false);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"84010000-0000-4000-8000-000000000001","role":"authenticated"}',true); select lives_ok($$select * from public.get_tenant_development_dashboard_v1('84010000-0000-4000-8000-000000000101')$$,'owner allowed');
select set_config('request.jwt.claims','{"sub":"84010000-0000-4000-8000-000000000002","role":"authenticated"}',true); select lives_ok($$select * from public.get_tenant_development_dashboard_v1('84010000-0000-4000-8000-000000000101')$$,'admin allowed');
select set_config('request.jwt.claims','{"sub":"84010000-0000-4000-8000-000000000003","role":"authenticated"}',true); select lives_ok($$select * from public.get_tenant_development_dashboard_v1('84010000-0000-4000-8000-000000000101')$$,'hr allowed');
select set_config('request.jwt.claims','{"sub":"84010000-0000-4000-8000-000000000004","role":"authenticated"}',true); select lives_ok($$select * from public.get_tenant_development_dashboard_v1('84010000-0000-4000-8000-000000000101')$$,'manager allowed');
select set_config('request.jwt.claims','{"sub":"84010000-0000-4000-8000-000000000005","role":"authenticated"}',true); select is((select array_agg(label) from public.get_tenant_development_dashboard_v1('84010000-0000-4000-8000-000000000101') where record_id in ('84010000-0000-4000-8000-000000000201','84010000-0000-4000-8000-000000000202')),array['Alpha Template','Zulu Template']::text[],'real records execute and order deterministically');
select ok(not exists(select 1 from public.get_tenant_development_dashboard_v1('84010000-0000-4000-8000-000000000101') where record_id='84010000-0000-4000-8000-000000000203'),'inactive template excluded');
select set_config('request.jwt.claims','{"sub":"84010000-0000-4000-8000-000000000006","role":"authenticated"}',true); select throws_ok($$select * from public.get_tenant_development_dashboard_v1('84010000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','inactive denied');
select set_config('request.jwt.claims','{"sub":"84010000-0000-4000-8000-000000000007","role":"authenticated"}',true); select throws_ok($$select * from public.get_tenant_development_dashboard_v1('84010000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','no membership denied');
select set_config('request.jwt.claims','{"sub":"84010000-0000-4000-8000-000000000001","role":"authenticated"}',true); select throws_ok($$select * from public.get_tenant_development_dashboard_v1('84010000-0000-4000-8000-000000000102')$$,'42501','TENANT_AUTHORIZATION_DENIED','foreign tenant denied'); reset role;
select set_config('request.jwt.claims','{}',true); select throws_ok($$select * from public.get_tenant_development_dashboard_v1('84010000-0000-4000-8000-000000000101')$$,'42501','AUTHENTICATION_REQUIRED','auth required');
select * from finish(); rollback;
