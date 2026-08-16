begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(31);

select has_function('public', 'get_tenant_organization_directory_v1', array['uuid']);
select is((select prosecdef from pg_proc where oid =
  'public.get_tenant_organization_directory_v1(uuid)'::regprocedure), true,
  'organization directory is SECURITY DEFINER');
select is((select provolatile from pg_proc where oid =
  'public.get_tenant_organization_directory_v1(uuid)'::regprocedure), 's'::"char",
  'organization directory is STABLE');
select is((select proconfig from pg_proc where oid =
  'public.get_tenant_organization_directory_v1(uuid)'::regprocedure),
  array['search_path=public, pg_temp']::text[], 'search_path is hardened');
select is((select pg_get_userbyid(proowner) from pg_proc where oid =
  'public.get_tenant_organization_directory_v1(uuid)'::regprocedure), 'postgres',
  'organization directory is owned by postgres');
select ok(has_function_privilege('authenticated',
  'public.get_tenant_organization_directory_v1(uuid)', 'execute'),
  'authenticated can execute organization directory');
select ok(not has_function_privilege('anon',
  'public.get_tenant_organization_directory_v1(uuid)', 'execute'),
  'anon cannot execute organization directory');
select ok(not has_function_privilege('service_role',
  'public.get_tenant_organization_directory_v1(uuid)', 'execute'),
  'service_role has no human organization-directory authority');
select ok(not has_function_privilege('public',
  'public.get_tenant_organization_directory_v1(uuid)', 'execute'),
  'PUBLIC cannot execute organization directory');
select ok(not has_table_privilege('authenticated', 'public.departments', 'select'),
  'authenticated still cannot SELECT departments');
select ok(not has_table_privilege('authenticated', 'public.teams', 'select'),
  'authenticated still cannot SELECT teams');
select ok(not has_table_privilege('authenticated', 'public.positions', 'select'),
  'authenticated still cannot SELECT positions');
select is((select proargnames from pg_proc where oid =
  'public.get_tenant_organization_directory_v1(uuid)'::regprocedure), array[
    'p_company_id', 'entity_type', 'entity_id', 'name', 'status',
    'department_id', 'parent_entity_id']::text[], 'contract column names are exact');
select is((select proargmodes from pg_proc where oid =
  'public.get_tenant_organization_directory_v1(uuid)'::regprocedure),
  array['i','t','t','t','t','t','t']::"char"[], 'one selector and six columns are exposed');
select is((select array_agg(format_type(type_oid, null) order by ordinal)
  from (select type_oid, ordinal from pg_proc p,
    unnest(p.proallargtypes) with ordinality as t(type_oid, ordinal)
    where p.oid = 'public.get_tenant_organization_directory_v1(uuid)'::regprocedure
  ) as types), array['uuid','text','uuid','text','text','uuid','uuid']::text[],
  'contract types are exact');
select ok(not ((select proargnames from pg_proc where oid =
  'public.get_tenant_organization_directory_v1(uuid)'::regprocedure) && array[
    'company_id','manager_id','user_id','description','created_at','updated_at','deleted_at'
  ]::text[]), 'contract excludes tenant authority, People identity and audit fields');
select ok(pg_get_functiondef(
  'public.get_tenant_organization_directory_v1(uuid)'::regprocedure)
  ~ $$'department'::text[\s\S]*'team'::text[\s\S]*'position'::text$$,
  'entity type source is closed to department, team and position');

insert into auth.users (id, email, email_confirmed_at) values
  ('83010000-0000-4000-8000-000000000001','org-owner@example.com',now()),
  ('83010000-0000-4000-8000-000000000002','org-admin@example.com',now()),
  ('83010000-0000-4000-8000-000000000003','org-hr@example.com',now()),
  ('83010000-0000-4000-8000-000000000004','org-manager@example.com',now()),
  ('83010000-0000-4000-8000-000000000005','org-employee@example.com',now()),
  ('83010000-0000-4000-8000-000000000006','org-inactive@example.com',now()),
  ('83010000-0000-4000-8000-000000000007','org-foreign@example.com',now()),
  ('83010000-0000-4000-8000-000000000008','org-none@example.com',now());

insert into public.companies (id, name, slug) values
  ('83010000-0000-4000-8000-000000000101','Org Alpha','org-alpha'),
  ('83010000-0000-4000-8000-000000000102','Org Beta','org-beta'),
  ('83010000-0000-4000-8000-000000000103','Org Empty','org-empty');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('83010000-0000-4000-8000-000000000111','83010000-0000-4000-8000-000000000101','83010000-0000-4000-8000-000000000001','owner','active'),
  ('83010000-0000-4000-8000-000000000112','83010000-0000-4000-8000-000000000101','83010000-0000-4000-8000-000000000002','admin','active'),
  ('83010000-0000-4000-8000-000000000113','83010000-0000-4000-8000-000000000101','83010000-0000-4000-8000-000000000003','hr','active'),
  ('83010000-0000-4000-8000-000000000114','83010000-0000-4000-8000-000000000101','83010000-0000-4000-8000-000000000004','manager','active'),
  ('83010000-0000-4000-8000-000000000115','83010000-0000-4000-8000-000000000101','83010000-0000-4000-8000-000000000005','employee','active'),
  ('83010000-0000-4000-8000-000000000116','83010000-0000-4000-8000-000000000101','83010000-0000-4000-8000-000000000006','admin','inactive'),
  ('83010000-0000-4000-8000-000000000117','83010000-0000-4000-8000-000000000102','83010000-0000-4000-8000-000000000007','owner','active'),
  ('83010000-0000-4000-8000-000000000118','83010000-0000-4000-8000-000000000103','83010000-0000-4000-8000-000000000001','owner','active');

insert into public.departments (id, company_id, name, parent_department_id, deleted_at) values
  ('83010000-0000-4000-8000-000000000201','83010000-0000-4000-8000-000000000101','Alpha Department',null,null),
  ('83010000-0000-4000-8000-000000000202','83010000-0000-4000-8000-000000000101','Deleted Department',null,now()),
  ('83010000-0000-4000-8000-000000000203','83010000-0000-4000-8000-000000000102','Foreign Department',null,null);
insert into public.teams (id, company_id, name, department_id, deleted_at) values
  ('83010000-0000-4000-8000-000000000211','83010000-0000-4000-8000-000000000101','Alpha Team','83010000-0000-4000-8000-000000000201',null),
  ('83010000-0000-4000-8000-000000000212','83010000-0000-4000-8000-000000000101','Deleted Team',null,now()),
  ('83010000-0000-4000-8000-000000000213','83010000-0000-4000-8000-000000000102','Foreign Team','83010000-0000-4000-8000-000000000203',null);
insert into public.positions (id, company_id, name, department_id, status, deleted_at) values
  ('83010000-0000-4000-8000-000000000221','83010000-0000-4000-8000-000000000101','Alpha Position','83010000-0000-4000-8000-000000000201','active',null),
  ('83010000-0000-4000-8000-000000000222','83010000-0000-4000-8000-000000000101','Deleted Position',null,'inactive',now()),
  ('83010000-0000-4000-8000-000000000223','83010000-0000-4000-8000-000000000102','Foreign Position','83010000-0000-4000-8000-000000000203','active',null);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"83010000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_organization_directory_v1('83010000-0000-4000-8000-000000000101')$$,'active owner is allowed');
select set_config('request.jwt.claims','{"sub":"83010000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_organization_directory_v1('83010000-0000-4000-8000-000000000101')$$,'active admin is allowed');
select set_config('request.jwt.claims','{"sub":"83010000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_organization_directory_v1('83010000-0000-4000-8000-000000000101')$$,'active hr is allowed');
select set_config('request.jwt.claims','{"sub":"83010000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_organization_directory_v1('83010000-0000-4000-8000-000000000101')$$,'active manager is allowed');
select set_config('request.jwt.claims','{"sub":"83010000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_organization_directory_v1('83010000-0000-4000-8000-000000000101')$$,'active employee is allowed');
select set_config('request.jwt.claims','{"sub":"83010000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_organization_directory_v1('83010000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','inactive membership is denied');
select set_config('request.jwt.claims','{"sub":"83010000-0000-4000-8000-000000000008","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_organization_directory_v1('83010000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','missing membership is denied');
select set_config('request.jwt.claims','{"sub":"83010000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_organization_directory_v1('83010000-0000-4000-8000-000000000102')$$,'42501','TENANT_AUTHORIZATION_DENIED','foreign tenant selector is denied');
select is((select count(*) from public.get_tenant_organization_directory_v1('83010000-0000-4000-8000-000000000103')),0::bigint,'authorized empty organization returns zero rows');
select is((select count(*) from public.get_tenant_organization_directory_v1('83010000-0000-4000-8000-000000000101')),3::bigint,'only active tenant organization rows are returned');
select results_eq($$select entity_type, entity_id, name, status, department_id, parent_entity_id from public.get_tenant_organization_directory_v1('83010000-0000-4000-8000-000000000101')$$,
  $$values ('department','83010000-0000-4000-8000-000000000201'::uuid,'Alpha Department',null::text,null::uuid,null::uuid),('position','83010000-0000-4000-8000-000000000221'::uuid,'Alpha Position','active','83010000-0000-4000-8000-000000000201'::uuid,null::uuid),('team','83010000-0000-4000-8000-000000000211'::uuid,'Alpha Team',null::text,'83010000-0000-4000-8000-000000000201'::uuid,null::uuid)$$,
  'rows and deterministic entity/name/id order are exact');
select ok(not exists(select 1 from public.get_tenant_organization_directory_v1('83010000-0000-4000-8000-000000000101') where name like 'Deleted%'),'soft-deleted rows are excluded');
select ok(not exists(select 1 from public.get_tenant_organization_directory_v1('83010000-0000-4000-8000-000000000101') where name like 'Foreign%'),'cross-tenant rows never leak');
reset role;

select set_config('request.jwt.claims','{}',true);
select throws_ok($$select * from public.get_tenant_organization_directory_v1('83010000-0000-4000-8000-000000000101')$$,'42501','AUTHENTICATION_REQUIRED','missing auth.uid is rejected explicitly');

select * from finish();
rollback;
