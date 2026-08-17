begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Static contract: v2 functions exist with the exact v1-compatible shape,
-- SECURITY DEFINER hardening, correct grants, and no direct table grant.
-- ---------------------------------------------------------------------------
select has_function('public','get_tenant_people_management_v2',array['uuid']::text[]);
select has_function('public','get_tenant_person_profile_v2',array['uuid','uuid']::text[]);

select is(
  (select proargnames from pg_proc where oid='public.get_tenant_people_management_v2(uuid)'::regprocedure),
  array['p_company_id','person_id','full_name','email','phone','birth_date','hire_date','status','has_user_access','manager_id','manager_name','team_id','team_name','position_id','position_name','disc_profile','avatar_url','created_at','updated_at']::text[],
  'v2 people-management shape matches v1');
select is(
  (select proargnames from pg_proc where oid='public.get_tenant_person_profile_v2(uuid,uuid)'::regprocedure),
  array['p_company_id','p_person_id','person_id','full_name','email','phone','birth_date','hire_date','status','has_user_access','manager_id','manager_name','team_id','team_name','position_id','position_name','disc_profile','avatar_url','created_at','updated_at']::text[],
  'v2 profile shape matches v1');

select ok(p.prosecdef and p.provolatile='s' and p.proconfig=array['search_path=public, pg_temp']::text[],
  p.proname||' is stable, SECURITY DEFINER with hardened search_path')
from pg_proc p where p.oid in (
  'public.get_tenant_people_management_v2(uuid)'::regprocedure,
  'public.get_tenant_person_profile_v2(uuid,uuid)'::regprocedure
) order by p.proname;

select ok(has_function_privilege('authenticated','public.get_tenant_people_management_v2(uuid)','execute'),
  'authenticated may execute v2 management');
select ok(has_function_privilege('authenticated','public.get_tenant_person_profile_v2(uuid,uuid)','execute'),
  'authenticated may execute v2 profile');
select ok(not has_function_privilege('anon','public.get_tenant_people_management_v2(uuid)','execute'),
  'anon cannot execute v2 management');
select ok(not has_function_privilege('anon','public.get_tenant_person_profile_v2(uuid,uuid)','execute'),
  'anon cannot execute v2 profile');
select ok(not has_table_privilege('authenticated','public.people','select'),
  'authenticated still has no direct SELECT on people');

-- ---------------------------------------------------------------------------
-- Fixtures (superuser): Alpha with an active owner-person, an active person, a
-- terminated person; Beta with a foreign person.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('90000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('90000000-0000-4000-8000-000000000003','owner-b@example.com');

insert into public.companies (id, name, slug) values
  ('90000000-0000-4000-8000-000000000101','J1 Alpha','j1-alpha'),
  ('90000000-0000-4000-8000-000000000102','J1 Beta','j1-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('90000000-0000-4000-8000-000000000111','90000000-0000-4000-8000-000000000101','90000000-0000-4000-8000-000000000001','owner','active'),
  ('90000000-0000-4000-8000-000000000112','90000000-0000-4000-8000-000000000102','90000000-0000-4000-8000-000000000003','owner','active');

insert into public.people (id, company_id, user_id, full_name, email, status) values
  ('90000000-0000-4000-8000-000000000201','90000000-0000-4000-8000-000000000101','90000000-0000-4000-8000-000000000001','Owner A','owner-a@example.com','active'),
  ('90000000-0000-4000-8000-000000000202','90000000-0000-4000-8000-000000000101',null,'Abner Ativo','abner@example.com','active'),
  ('90000000-0000-4000-8000-000000000203','90000000-0000-4000-8000-000000000101',null,'Ana Desligada','ana@example.com','terminated'),
  ('90000000-0000-4000-8000-000000000204','90000000-0000-4000-8000-000000000102',null,'Foreign Person','foreign@example.com','active');

-- ---------------------------------------------------------------------------
-- Behavioral, as an active Alpha owner.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select is(
  (select count(*)::int from public.get_tenant_people_management_v2('90000000-0000-4000-8000-000000000101')),
  3, 'v2 management returns all Alpha people including the terminated one');
select is(
  (select count(*)::int from public.get_tenant_people_management_v2('90000000-0000-4000-8000-000000000101') where status='terminated'),
  1, 'v2 management includes the terminated person');
select is(
  (select count(*)::int from public.get_tenant_people_management_v1('90000000-0000-4000-8000-000000000101')),
  2, 'v1 management still excludes the terminated person');
select is(
  (select count(*)::int from public.get_tenant_people_management_v1('90000000-0000-4000-8000-000000000101') where status='terminated'),
  0, 'v1 management returns no terminated people');

select is(
  (select status from public.get_tenant_person_profile_v2('90000000-0000-4000-8000-000000000101','90000000-0000-4000-8000-000000000203')),
  'terminated', 'v2 profile returns the terminated person');
select is(
  (select count(*)::int from public.get_tenant_person_profile_v1('90000000-0000-4000-8000-000000000101','90000000-0000-4000-8000-000000000203')),
  0, 'v1 profile cannot return the terminated person');

select is(
  (select has_user_access from public.get_tenant_person_profile_v2('90000000-0000-4000-8000-000000000101','90000000-0000-4000-8000-000000000201')),
  true, 'has_user_access is a boolean true for a linked person (no raw Auth id)');
select is(
  (select has_user_access from public.get_tenant_person_profile_v2('90000000-0000-4000-8000-000000000101','90000000-0000-4000-8000-000000000203')),
  false, 'has_user_access is false for the unlinked terminated person');

-- Cross-tenant isolation: an Alpha actor cannot retrieve a Beta person.
select is(
  (select count(*)::int from public.get_tenant_person_profile_v2('90000000-0000-4000-8000-000000000101','90000000-0000-4000-8000-000000000204')),
  0, 'v2 profile cannot cross-tenant-retrieve a Beta person under an Alpha company');
select is(
  (select count(*)::int from public.get_tenant_people_management_v2('90000000-0000-4000-8000-000000000101') where person_id='90000000-0000-4000-8000-000000000204'),
  0, 'v2 management is company-scoped (no Beta rows)');
reset role;

-- Non-member (Beta owner) is denied on Alpha.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok(
  $$select * from public.get_tenant_people_management_v2('90000000-0000-4000-8000-000000000101')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','a non-member is denied on v2 management');
select throws_ok(
  $$select * from public.get_tenant_person_profile_v2('90000000-0000-4000-8000-000000000101','90000000-0000-4000-8000-000000000203')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','a non-member is denied on v2 profile');
reset role;

-- Unauthenticated (no sub) is denied.
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok(
  $$select * from public.get_tenant_people_management_v2('90000000-0000-4000-8000-000000000101')$$,
  '42501','AUTHENTICATION_REQUIRED','an unauthenticated actor is denied on v2 management');
reset role;

select * from finish();
rollback;
