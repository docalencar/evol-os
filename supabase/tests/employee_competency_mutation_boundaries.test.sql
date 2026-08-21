begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

select has_function('public','create_tenant_employee_competency_v1',
  array['uuid','uuid','uuid','integer','text','timestamp with time zone','text']);
select has_function('public','update_tenant_employee_competency_v1',
  array['uuid','uuid','uuid','uuid','integer','text','timestamp with time zone','text']);
select has_function('public','archive_tenant_employee_competency_v1',array['uuid','uuid']);

select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'create_tenant_employee_competency_v1','update_tenant_employee_competency_v1',
    'archive_tenant_employee_competency_v1')
  and p.prosecdef and p.proconfig=array['search_path=public, pg_temp']),3::bigint,
  'all mutation boundaries are SECURITY DEFINER with hardened search_path');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'create_tenant_employee_competency_v1','update_tenant_employee_competency_v1',
    'archive_tenant_employee_competency_v1')
  and has_function_privilege('authenticated',p.oid,'execute')),3::bigint,
  'authenticated may execute all mutation boundaries');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'create_tenant_employee_competency_v1','update_tenant_employee_competency_v1',
    'archive_tenant_employee_competency_v1')
  and (has_function_privilege('anon',p.oid,'execute')
    or has_function_privilege('service_role',p.oid,'execute')
    or has_function_privilege('public',p.oid,'execute'))),0::bigint,
  'anon, service_role and PUBLIC cannot execute mutation boundaries');

select ok(not has_table_privilege('authenticated','public.employee_competencies','insert'),
  'authenticated direct insert is closed');
select ok(not has_table_privilege('authenticated','public.employee_competencies','update'),
  'authenticated direct update is closed');
select ok(not has_table_privilege('authenticated','public.employee_competencies','delete'),
  'authenticated direct delete is closed');
select ok(not has_table_privilege('authenticated','public.employee_competencies','truncate')
  and not has_table_privilege('authenticated','public.employee_competencies','trigger')
  and not has_table_privilege('authenticated','public.employee_competencies','maintain'),
  'authenticated operational mutation privileges are closed');
select ok(not has_table_privilege('anon','public.employee_competencies','insert')
  and not has_table_privilege('anon','public.employee_competencies','update')
  and not has_table_privilege('anon','public.employee_competencies','delete')
  and not has_table_privilege('anon','public.employee_competencies','truncate')
  and not has_table_privilege('anon','public.employee_competencies','trigger')
  and not has_table_privilege('anon','public.employee_competencies','maintain'),
  'anon mutation-capable table privileges are closed');

insert into auth.users(id,email) values
  ('a9000000-0000-4000-8000-000000000001','owner-a-ec@example.com'),
  ('a9000000-0000-4000-8000-000000000002','manager-a-ec@example.com'),
  ('a9000000-0000-4000-8000-000000000003','owner-b-ec@example.com');
insert into public.companies(id,name,slug) values
  ('a9000000-0000-4000-8000-000000000101','EC Alpha','ec-alpha'),
  ('a9000000-0000-4000-8000-000000000102','EC Beta','ec-beta');
insert into public.company_members(id,company_id,user_id,role,status) values
  ('a9000000-0000-4000-8000-000000000111','a9000000-0000-4000-8000-000000000101','a9000000-0000-4000-8000-000000000001','owner','active'),
  ('a9000000-0000-4000-8000-000000000112','a9000000-0000-4000-8000-000000000101','a9000000-0000-4000-8000-000000000002','manager','active'),
  ('a9000000-0000-4000-8000-000000000113','a9000000-0000-4000-8000-000000000102','a9000000-0000-4000-8000-000000000003','owner','active');
insert into public.people(id,company_id,full_name,status) values
  ('a9000000-0000-4000-8000-000000000201','a9000000-0000-4000-8000-000000000101','Alpha Person','active'),
  ('a9000000-0000-4000-8000-000000000202','a9000000-0000-4000-8000-000000000102','Beta Person','active');
insert into public.positions(id,company_id,name) values
  ('a9000000-0000-4000-8000-000000000251','a9000000-0000-4000-8000-000000000101','Alpha Position');
insert into public.competencies(id,company_id,name,category,expected_level,weight,active) values
  ('a9000000-0000-4000-8000-000000000301','a9000000-0000-4000-8000-000000000101','Alpha Skill','technical',3,2,true),
  ('a9000000-0000-4000-8000-000000000302','a9000000-0000-4000-8000-000000000101','Inactive Skill','technical',3,2,false),
  ('a9000000-0000-4000-8000-000000000303','a9000000-0000-4000-8000-000000000102','Beta Skill','technical',3,2,true);
insert into public.position_competencies(id,company_id,position_id,competency_id,expected_level,weight,required,type)
values ('a9000000-0000-4000-8000-000000000351','a9000000-0000-4000-8000-000000000101',
  'a9000000-0000-4000-8000-000000000251','a9000000-0000-4000-8000-000000000301',4,2,true,'core');

create temporary table ec_result(id uuid);
grant select,insert on ec_result to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.create_tenant_employee_competency_v1(
  'a9000000-0000-4000-8000-000000000101','a9000000-0000-4000-8000-000000000201',
  'a9000000-0000-4000-8000-000000000301',3,'manual',null,null)$$,
  '42501','AUTHENTICATION_REQUIRED','unauthenticated create is denied');

select set_config('request.jwt.claims',
  '{"sub":"a9000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.create_tenant_employee_competency_v1(
  'a9000000-0000-4000-8000-000000000101','a9000000-0000-4000-8000-000000000201',
  'a9000000-0000-4000-8000-000000000301',3,'manual',null,null)$$,
  '42501','TENANT_AUTHORIZATION_DENIED','unauthorized role is denied');

select set_config('request.jwt.claims',
  '{"sub":"a9000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.create_tenant_employee_competency_v1(
  'a9000000-0000-4000-8000-000000000101','a9000000-0000-4000-8000-000000000202',
  'a9000000-0000-4000-8000-000000000301',3,'manual',null,null)$$,
  'P0002','EMPLOYEE_NOT_FOUND','cross-tenant employee is denied');
select throws_ok($$select public.create_tenant_employee_competency_v1(
  'a9000000-0000-4000-8000-000000000101','a9000000-0000-4000-8000-000000000201',
  'a9000000-0000-4000-8000-000000000303',3,'manual',null,null)$$,
  'P0002','COMPETENCY_NOT_FOUND','cross-tenant competency is denied');
select throws_ok($$select public.create_tenant_employee_competency_v1(
  'a9000000-0000-4000-8000-000000000101','a9000000-0000-4000-8000-000000000201',
  'a9000000-0000-4000-8000-000000000302',3,'manual',null,null)$$,
  'P0002','COMPETENCY_NOT_FOUND','inactive competency is denied');
select throws_ok($$select public.create_tenant_employee_competency_v1(
  'a9000000-0000-4000-8000-000000000101','a9000000-0000-4000-8000-000000000201',
  'a9000000-0000-4000-8000-000000000301',0,'manual',null,null)$$,
  '22023','VALIDATION_FAILED','invalid level is rejected safely');
select throws_ok($$select public.create_tenant_employee_competency_v1(
  'a9000000-0000-4000-8000-000000000101','a9000000-0000-4000-8000-000000000201',
  'a9000000-0000-4000-8000-000000000301',3,'imported',null,null)$$,
  '22023','VALIDATION_FAILED','invalid source is rejected safely');

insert into ec_result select ((public.create_tenant_employee_competency_v1(
  'a9000000-0000-4000-8000-000000000101','a9000000-0000-4000-8000-000000000201',
  'a9000000-0000-4000-8000-000000000301',2,'manager','2026-08-20 12:00:00+00',' Evidence ')
  ->>'employeeCompetencyId')::uuid);
select throws_ok($$select public.create_tenant_employee_competency_v1(
  'a9000000-0000-4000-8000-000000000101','a9000000-0000-4000-8000-000000000201',
  'a9000000-0000-4000-8000-000000000301',3,'manual',null,null)$$,
  '23505','CONFLICT','duplicate active association is rejected safely');
select is((public.update_tenant_employee_competency_v1(
  'a9000000-0000-4000-8000-000000000101',(select id from ec_result),
  'a9000000-0000-4000-8000-000000000201','a9000000-0000-4000-8000-000000000301',
  4,'assessment','2026-08-21 12:00:00+00','Updated')) ->> 'status','succeeded',
  'authorized update succeeds');
select throws_ok(format($$select public.update_tenant_employee_competency_v1(
  'a9000000-0000-4000-8000-000000000101','%s',
  'a9000000-0000-4000-8000-000000000202','a9000000-0000-4000-8000-000000000301',
  4,'manual',null,null)$$,(select id from ec_result)),
  '22023','VALIDATION_FAILED','update cannot reassign employee or competency');
select is((public.archive_tenant_employee_competency_v1(
  'a9000000-0000-4000-8000-000000000101',(select id from ec_result))) ->> 'status',
  'succeeded','archive succeeds');
select is((public.archive_tenant_employee_competency_v1(
  'a9000000-0000-4000-8000-000000000101',(select id from ec_result))) ->> 'status',
  'already_archived','archive is idempotent');
reset role;

select ok(exists(select 1 from public.employee_competencies ec join ec_result r on r.id=ec.id
  where ec.current_level=4 and ec.source='assessment'
    and ec.validated_at='2026-08-21 12:00:00+00' and ec.notes='Updated'
    and ec.archived_at is not null),'create, update and archive persist canonical fields');
select ok(exists(select 1 from public.competencies where id='a9000000-0000-4000-8000-000000000301'
  and active),'catalog competency remains intact');
select ok(exists(select 1 from public.people where id='a9000000-0000-4000-8000-000000000201'
  and status='active'),'Person remains intact');
select ok(exists(select 1 from public.position_competencies
  where id='a9000000-0000-4000-8000-000000000351' and archived_at is null),
  'Position expectation remains intact');
select is((select count(*)::int from public.activity_events
  where company_id='a9000000-0000-4000-8000-000000000101'
    and activity_type in ('employee_competency.created','employee_competency.updated',
      'employee_competency.archived')),3,'one atomic Activity exists per successful mutation');

select * from finish();
rollback;
