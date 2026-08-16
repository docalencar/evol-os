begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(32);

select has_function('public', 'get_tenant_people_directory_v1', array['uuid']);
select is((select prosecdef from pg_proc where oid = 'public.get_tenant_people_directory_v1(uuid)'::regprocedure),true,'People directory is SECURITY DEFINER');
select is((select provolatile from pg_proc where oid = 'public.get_tenant_people_directory_v1(uuid)'::regprocedure),'s'::"char",'People directory is STABLE');
select is((select proconfig from pg_proc where oid = 'public.get_tenant_people_directory_v1(uuid)'::regprocedure),array['search_path=public, pg_temp']::text[],'search_path is hardened');
select is((select pg_get_userbyid(proowner) from pg_proc where oid = 'public.get_tenant_people_directory_v1(uuid)'::regprocedure),'postgres','People directory is owned by postgres');
select ok(has_function_privilege('authenticated','public.get_tenant_people_directory_v1(uuid)','execute'),'authenticated can execute People directory');
select ok(not has_function_privilege('anon','public.get_tenant_people_directory_v1(uuid)','execute'),'anon cannot execute People directory');
select ok(not has_function_privilege('service_role','public.get_tenant_people_directory_v1(uuid)','execute'),'service_role has no human People-directory authority');
select ok(not has_function_privilege('public','public.get_tenant_people_directory_v1(uuid)','execute'),'PUBLIC cannot execute People directory');
select ok(not has_table_privilege('authenticated','public.people','select'),'authenticated still cannot SELECT people');
select is((select proargnames from pg_proc where oid = 'public.get_tenant_people_directory_v1(uuid)'::regprocedure),array['p_company_id','person_id','full_name','status','manager_id','manager_name','team_id','team_name','position_id','position_name']::text[],'contract column names are exact');
select is((select proargmodes from pg_proc where oid = 'public.get_tenant_people_directory_v1(uuid)'::regprocedure),array['i','t','t','t','t','t','t','t','t','t']::"char"[],'one selector and nine columns are exposed');
select is((select array_agg(format_type(type_oid,null) order by ordinal) from (select type_oid,ordinal from pg_proc p,unnest(p.proallargtypes) with ordinality as t(type_oid,ordinal) where p.oid='public.get_tenant_people_directory_v1(uuid)'::regprocedure) as types),array['uuid','uuid','text','text','uuid','text','uuid','text','uuid','text']::text[],'contract types are exact');
select ok(not ((select proargnames from pg_proc where oid='public.get_tenant_people_directory_v1(uuid)'::regprocedure) && array['company_id','user_id','email','phone','salary','birth_date','hire_date','termination_date','avatar_url','disc_profile','created_at','updated_at']::text[]),'contract excludes contact, Auth, personal and audit fields');

insert into auth.users (id,email,email_confirmed_at) values
 ('83020000-0000-4000-8000-000000000001','people-owner@example.com',now()),('83020000-0000-4000-8000-000000000002','people-admin@example.com',now()),('83020000-0000-4000-8000-000000000003','people-hr@example.com',now()),('83020000-0000-4000-8000-000000000004','people-manager@example.com',now()),('83020000-0000-4000-8000-000000000005','people-employee@example.com',now()),('83020000-0000-4000-8000-000000000006','people-inactive@example.com',now()),('83020000-0000-4000-8000-000000000007','people-foreign@example.com',now()),('83020000-0000-4000-8000-000000000008','people-none@example.com',now());
insert into public.companies (id,name,slug) values
 ('83020000-0000-4000-8000-000000000101','People Alpha','people-alpha'),('83020000-0000-4000-8000-000000000102','People Beta','people-beta'),('83020000-0000-4000-8000-000000000103','People Empty','people-empty');
insert into public.company_members (id,company_id,user_id,role,status) values
 ('83020000-0000-4000-8000-000000000111','83020000-0000-4000-8000-000000000101','83020000-0000-4000-8000-000000000001','owner','active'),('83020000-0000-4000-8000-000000000112','83020000-0000-4000-8000-000000000101','83020000-0000-4000-8000-000000000002','admin','active'),('83020000-0000-4000-8000-000000000113','83020000-0000-4000-8000-000000000101','83020000-0000-4000-8000-000000000003','hr','active'),('83020000-0000-4000-8000-000000000114','83020000-0000-4000-8000-000000000101','83020000-0000-4000-8000-000000000004','manager','active'),('83020000-0000-4000-8000-000000000115','83020000-0000-4000-8000-000000000101','83020000-0000-4000-8000-000000000005','employee','active'),('83020000-0000-4000-8000-000000000116','83020000-0000-4000-8000-000000000101','83020000-0000-4000-8000-000000000006','admin','inactive'),('83020000-0000-4000-8000-000000000117','83020000-0000-4000-8000-000000000102','83020000-0000-4000-8000-000000000007','owner','active'),('83020000-0000-4000-8000-000000000118','83020000-0000-4000-8000-000000000103','83020000-0000-4000-8000-000000000001','owner','active');
insert into public.departments (id,company_id,name) values ('83020000-0000-4000-8000-000000000201','83020000-0000-4000-8000-000000000101','Alpha Department'),('83020000-0000-4000-8000-000000000202','83020000-0000-4000-8000-000000000102','Foreign Department');
insert into public.teams (id,company_id,name,department_id) values ('83020000-0000-4000-8000-000000000211','83020000-0000-4000-8000-000000000101','Alpha Team','83020000-0000-4000-8000-000000000201'),('83020000-0000-4000-8000-000000000212','83020000-0000-4000-8000-000000000102','Foreign Team','83020000-0000-4000-8000-000000000202');
insert into public.positions (id,company_id,name,department_id,status) values ('83020000-0000-4000-8000-000000000221','83020000-0000-4000-8000-000000000101','Alpha Position','83020000-0000-4000-8000-000000000201','active'),('83020000-0000-4000-8000-000000000222','83020000-0000-4000-8000-000000000102','Foreign Position','83020000-0000-4000-8000-000000000202','active');
insert into public.people (id,company_id,full_name,email,status,manager_id,team_id,position_id) values
 ('83020000-0000-4000-8000-000000000231','83020000-0000-4000-8000-000000000101','Alpha Manager','secret-manager@example.com','active',null,'83020000-0000-4000-8000-000000000211','83020000-0000-4000-8000-000000000221'),
 ('83020000-0000-4000-8000-000000000232','83020000-0000-4000-8000-000000000101','Beta Employee','secret-employee@example.com','on_leave','83020000-0000-4000-8000-000000000231','83020000-0000-4000-8000-000000000211','83020000-0000-4000-8000-000000000221'),
 ('83020000-0000-4000-8000-000000000233','83020000-0000-4000-8000-000000000101','Terminated Person','secret-terminated@example.com','terminated',null,null,null),
 ('83020000-0000-4000-8000-000000000234','83020000-0000-4000-8000-000000000102','Foreign Person','secret-foreign@example.com','active',null,'83020000-0000-4000-8000-000000000212','83020000-0000-4000-8000-000000000222');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"83020000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101')$$,'active owner is allowed');
select set_config('request.jwt.claims','{"sub":"83020000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101')$$,'active admin is allowed');
select set_config('request.jwt.claims','{"sub":"83020000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101')$$,'active hr is allowed');
select set_config('request.jwt.claims','{"sub":"83020000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101')$$,'active manager is allowed');
select set_config('request.jwt.claims','{"sub":"83020000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101')$$,'active employee is allowed');
select set_config('request.jwt.claims','{"sub":"83020000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','inactive membership is denied');
select set_config('request.jwt.claims','{"sub":"83020000-0000-4000-8000-000000000008","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','missing membership is denied');
select set_config('request.jwt.claims','{"sub":"83020000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000102')$$,'42501','TENANT_AUTHORIZATION_DENIED','foreign tenant selector is denied');
select is((select count(*) from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000103')),0::bigint,'authorized empty People directory returns zero rows');
select is((select count(*) from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101')),2::bigint,'only non-terminated tenant People are returned');
select results_eq($$select person_id,full_name,status,manager_id,manager_name,team_id,team_name,position_id,position_name from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101')$$,$$values ('83020000-0000-4000-8000-000000000231'::uuid,'Alpha Manager','active',null::uuid,null::text,'83020000-0000-4000-8000-000000000211'::uuid,'Alpha Team','83020000-0000-4000-8000-000000000221'::uuid,'Alpha Position'),('83020000-0000-4000-8000-000000000232'::uuid,'Beta Employee','on_leave','83020000-0000-4000-8000-000000000231'::uuid,'Alpha Manager','83020000-0000-4000-8000-000000000211'::uuid,'Alpha Team','83020000-0000-4000-8000-000000000221'::uuid,'Alpha Position')$$,'People fields, structural names and deterministic order are exact');
select is((select status from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101') where person_id='83020000-0000-4000-8000-000000000232'),'on_leave','persisted status is projected');
select is((select manager_name from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101') where person_id='83020000-0000-4000-8000-000000000232'),'Alpha Manager','tenant manager linkage is projected');
select is((select team_name from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101') where person_id='83020000-0000-4000-8000-000000000232'),'Alpha Team','tenant team linkage is projected');
select is((select position_name from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101') where person_id='83020000-0000-4000-8000-000000000232'),'Alpha Position','tenant position linkage is projected');
select ok(not exists(select 1 from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101') where full_name='Terminated Person'),'terminated People are excluded');
select ok(not exists(select 1 from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101') where full_name='Foreign Person'),'cross-tenant People never leak');
reset role;

select set_config('request.jwt.claims','{}',true);
select throws_ok($$select * from public.get_tenant_people_directory_v1('83020000-0000-4000-8000-000000000101')$$,'42501','AUTHENTICATION_REQUIRED','missing auth.uid is rejected explicitly');

select * from finish();
rollback;
