begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select no_plan();

select has_function('public', 'create_tenant_person_v1',
  array['uuid','text','text','text','date','date','text','uuid','uuid','uuid','text','text']);
select has_function('public', 'update_tenant_person_v1',
  array['uuid','uuid','text','text','text','date','date','text','uuid','uuid','uuid','text']);
select has_function('public', 'archive_tenant_person_v1', array['uuid','uuid']);
select has_function('public', 'create_tenant_department_v1', array['uuid','text','text','uuid','text']);
select has_function('public', 'update_tenant_department_v1', array['uuid','uuid','text','text','uuid']);
select has_function('public', 'archive_tenant_department_v1', array['uuid','uuid']);
select has_function('public', 'create_tenant_team_v1', array['uuid','text','text','uuid','uuid','uuid','text']);
select has_function('public', 'update_tenant_team_v1', array['uuid','uuid','text','text','uuid','uuid','uuid']);
select has_function('public', 'archive_tenant_team_v1', array['uuid','uuid']);
select has_function('public', 'create_tenant_position_v1',
  array['uuid','text','text','uuid','text','text','integer','text','text','text','text']);
select has_function('public', 'update_tenant_position_v1',
  array['uuid','uuid','text','text','uuid','text','text','integer','text','text','text']);
select has_function('public', 'archive_tenant_position_v1', array['uuid','uuid']);

select is((
  select count(*)
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname in (
      'create_tenant_person_v1','update_tenant_person_v1','archive_tenant_person_v1',
      'create_tenant_department_v1','update_tenant_department_v1','archive_tenant_department_v1',
      'create_tenant_team_v1','update_tenant_team_v1','archive_tenant_team_v1',
      'create_tenant_position_v1','update_tenant_position_v1','archive_tenant_position_v1'
    )
    and procedure.prosecdef
    and procedure.provolatile = 'v'
    and procedure.proconfig = array['search_path=public, pg_temp']
), 12::bigint, 'all public boundaries are volatile security definers with hardened search_path');

select is((
  select count(*) from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname in ('require_people_organization_mutator','append_people_organization_activity')
    and procedure.prosecdef
    and procedure.proconfig = array['search_path=public, pg_temp']
), 2::bigint, 'internal helpers are security definers with hardened search_path');

select is((
  select count(*) from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname in (
      'create_tenant_person_v1','update_tenant_person_v1','archive_tenant_person_v1',
      'create_tenant_department_v1','update_tenant_department_v1','archive_tenant_department_v1',
      'create_tenant_team_v1','update_tenant_team_v1','archive_tenant_team_v1',
      'create_tenant_position_v1','update_tenant_position_v1','archive_tenant_position_v1'
    )
    and has_function_privilege('authenticated', procedure.oid, 'execute')
), 12::bigint, 'authenticated can execute every public boundary');

select is((
  select count(*) from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname in (
      'create_tenant_person_v1','update_tenant_person_v1','archive_tenant_person_v1',
      'create_tenant_department_v1','update_tenant_department_v1','archive_tenant_department_v1',
      'create_tenant_team_v1','update_tenant_team_v1','archive_tenant_team_v1',
      'create_tenant_position_v1','update_tenant_position_v1','archive_tenant_position_v1'
    )
    and (has_function_privilege('anon', procedure.oid, 'execute')
      or has_function_privilege('service_role', procedure.oid, 'execute'))
), 0::bigint, 'anon and service_role cannot execute any human mutation boundary');

select ok(not has_function_privilege('authenticated',
  'public.require_people_organization_mutator(uuid)', 'execute'),
  'authenticated cannot execute the role helper');
select ok(not has_function_privilege('authenticated',
  'public.append_people_organization_activity(uuid,text,text,text,text,text,uuid,text,uuid,jsonb,text)', 'execute'),
  'authenticated cannot execute the activity helper');

select ok(not has_table_privilege('authenticated', 'public.people', 'insert'), 'people insert stays closed');
select ok(not has_table_privilege('authenticated', 'public.people', 'update'), 'people update stays closed');
select ok(not has_table_privilege('authenticated', 'public.people', 'delete'), 'people delete stays closed');
select ok(not has_table_privilege('authenticated', 'public.departments', 'insert'), 'departments insert stays closed');
select ok(not has_table_privilege('authenticated', 'public.departments', 'update'), 'departments update stays closed');
select ok(not has_table_privilege('authenticated', 'public.departments', 'delete'), 'departments delete stays closed');
select ok(not has_table_privilege('authenticated', 'public.teams', 'insert'), 'teams insert stays closed');
select ok(not has_table_privilege('authenticated', 'public.teams', 'update'), 'teams update stays closed');
select ok(not has_table_privilege('authenticated', 'public.teams', 'delete'), 'teams delete stays closed');
select ok(not has_table_privilege('authenticated', 'public.positions', 'insert'), 'positions insert stays closed');
select ok(not has_table_privilege('authenticated', 'public.positions', 'update'), 'positions update stays closed');
select ok(not has_table_privilege('authenticated', 'public.positions', 'delete'), 'positions delete stays closed');

insert into auth.users (id, email, email_confirmed_at) values
  ('89000000-0000-4000-8000-000000000001', 'owner-a@example.com', now()),
  ('89000000-0000-4000-8000-000000000002', 'admin-a@example.com', now()),
  ('89000000-0000-4000-8000-000000000003', 'hr-a@example.com', now()),
  ('89000000-0000-4000-8000-000000000004', 'manager-a@example.com', now()),
  ('89000000-0000-4000-8000-000000000005', 'employee-a@example.com', now()),
  ('89000000-0000-4000-8000-000000000006', 'inactive-a@example.com', now()),
  ('89000000-0000-4000-8000-000000000007', 'member-to-archive@example.com', now()),
  ('89000000-0000-4000-8000-000000000008', 'owner-b@example.com', now());

insert into public.companies (id, name, slug) values
  ('89000000-0000-4000-8000-000000000101', 'Core Alpha', 'core-alpha'),
  ('89000000-0000-4000-8000-000000000102', 'Core Beta', 'core-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('89000000-0000-4000-8000-000000000111', '89000000-0000-4000-8000-000000000101', '89000000-0000-4000-8000-000000000001', 'owner', 'active'),
  ('89000000-0000-4000-8000-000000000112', '89000000-0000-4000-8000-000000000101', '89000000-0000-4000-8000-000000000002', 'admin', 'active'),
  ('89000000-0000-4000-8000-000000000113', '89000000-0000-4000-8000-000000000101', '89000000-0000-4000-8000-000000000003', 'hr', 'active'),
  ('89000000-0000-4000-8000-000000000114', '89000000-0000-4000-8000-000000000101', '89000000-0000-4000-8000-000000000004', 'manager', 'active'),
  ('89000000-0000-4000-8000-000000000115', '89000000-0000-4000-8000-000000000101', '89000000-0000-4000-8000-000000000005', 'employee', 'active'),
  ('89000000-0000-4000-8000-000000000116', '89000000-0000-4000-8000-000000000101', '89000000-0000-4000-8000-000000000006', 'hr', 'inactive'),
  ('89000000-0000-4000-8000-000000000117', '89000000-0000-4000-8000-000000000101', '89000000-0000-4000-8000-000000000007', 'employee', 'active'),
  ('89000000-0000-4000-8000-000000000118', '89000000-0000-4000-8000-000000000102', '89000000-0000-4000-8000-000000000008', 'owner', 'active');

insert into public.people (id, company_id, user_id, full_name, email) values
  ('89000000-0000-4000-8000-000000000201', '89000000-0000-4000-8000-000000000101', '89000000-0000-4000-8000-000000000001', 'Owner A', 'owner-a@example.com'),
  ('89000000-0000-4000-8000-000000000202', '89000000-0000-4000-8000-000000000101', '89000000-0000-4000-8000-000000000002', 'Admin A', 'admin-a@example.com'),
  ('89000000-0000-4000-8000-000000000203', '89000000-0000-4000-8000-000000000101', '89000000-0000-4000-8000-000000000003', 'HR A', 'hr-a@example.com'),
  ('89000000-0000-4000-8000-000000000204', '89000000-0000-4000-8000-000000000101', '89000000-0000-4000-8000-000000000004', 'Manager A', 'manager-a@example.com'),
  ('89000000-0000-4000-8000-000000000205', '89000000-0000-4000-8000-000000000101', '89000000-0000-4000-8000-000000000005', 'Employee A', 'employee-a@example.com'),
  ('89000000-0000-4000-8000-000000000206', '89000000-0000-4000-8000-000000000101', '89000000-0000-4000-8000-000000000006', 'Inactive A', 'inactive-a@example.com'),
  ('89000000-0000-4000-8000-000000000207', '89000000-0000-4000-8000-000000000101', '89000000-0000-4000-8000-000000000007', 'Archive Member', 'member-to-archive@example.com'),
  ('89000000-0000-4000-8000-000000000208', '89000000-0000-4000-8000-000000000102', '89000000-0000-4000-8000-000000000008', 'Owner B', 'owner-b@example.com'),
  ('89000000-0000-4000-8000-000000000209', '89000000-0000-4000-8000-000000000101', null, 'Unlinked Target', 'unlinked@example.com'),
  ('89000000-0000-4000-8000-000000000210', '89000000-0000-4000-8000-000000000102', null, 'Foreign Person', 'foreign@example.com');

insert into public.departments (id, company_id, name) values
  ('89000000-0000-4000-8000-000000000301', '89000000-0000-4000-8000-000000000101', 'Alpha Existing'),
  ('89000000-0000-4000-8000-000000000302', '89000000-0000-4000-8000-000000000102', 'Beta Department');
insert into public.teams (id, company_id, name, department_id) values
  ('89000000-0000-4000-8000-000000000401', '89000000-0000-4000-8000-000000000101', 'Alpha Existing Team', '89000000-0000-4000-8000-000000000301'),
  ('89000000-0000-4000-8000-000000000402', '89000000-0000-4000-8000-000000000102', 'Beta Team', '89000000-0000-4000-8000-000000000302');
-- Valid multi-level chain for the hierarchy-cycle regression: A(403) <- B(404) <- C(405).
insert into public.teams (id, company_id, name, parent_team_id) values
  ('89000000-0000-4000-8000-000000000403', '89000000-0000-4000-8000-000000000101', 'Cycle Root A', null),
  ('89000000-0000-4000-8000-000000000404', '89000000-0000-4000-8000-000000000101', 'Cycle Mid B', '89000000-0000-4000-8000-000000000403'),
  ('89000000-0000-4000-8000-000000000405', '89000000-0000-4000-8000-000000000101', 'Cycle Leaf C', '89000000-0000-4000-8000-000000000404');
insert into public.positions (id, company_id, name, department_id) values
  ('89000000-0000-4000-8000-000000000501', '89000000-0000-4000-8000-000000000101', 'Alpha Existing Position', '89000000-0000-4000-8000-000000000301'),
  ('89000000-0000-4000-8000-000000000502', '89000000-0000-4000-8000-000000000102', 'Beta Position', '89000000-0000-4000-8000-000000000302');

set local role authenticated;
select set_config('request.jwt.claims', '{}', true);
select throws_ok($$select public.archive_tenant_person_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000209')$$,
  '42501', 'AUTHENTICATION_REQUIRED', 'unauthenticated People mutation is denied');
select throws_ok($$select public.archive_tenant_department_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000301')$$,
  '42501', 'AUTHENTICATION_REQUIRED', 'unauthenticated department mutation is denied');
select throws_ok($$select public.archive_tenant_team_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000401')$$,
  '42501', 'AUTHENTICATION_REQUIRED', 'unauthenticated team mutation is denied');
select throws_ok($$select public.archive_tenant_position_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000501')$$,
  '42501', 'AUTHENTICATION_REQUIRED', 'unauthenticated position mutation is denied');

select set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select throws_ok($$select public.create_tenant_person_v1('89000000-0000-4000-8000-000000000101','Denied Person',null,null,null,null,'active',null,null,null,null,'denied-person')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'manager cannot create People');
select throws_ok($$select public.update_tenant_person_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000209','Denied Person',null,null,null,null,'active',null,null,null,null)$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'manager cannot update People');
select throws_ok($$select public.archive_tenant_person_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000209')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'manager cannot archive People');
select throws_ok($$select public.create_tenant_department_v1('89000000-0000-4000-8000-000000000101','Denied Department',null,null,'denied-department')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'manager cannot create departments');
select throws_ok($$select public.update_tenant_department_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000301','Denied Department',null,null)$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'manager cannot update departments');
select throws_ok($$select public.archive_tenant_department_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000301')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'manager cannot archive departments');
select throws_ok($$select public.create_tenant_team_v1('89000000-0000-4000-8000-000000000101','Denied Team',null,null,null,null,'denied-team')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'manager cannot create teams');
select throws_ok($$select public.update_tenant_team_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000401','Denied Team',null,null,null,null)$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'manager cannot update teams');
select throws_ok($$select public.archive_tenant_team_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000401')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'manager cannot archive teams');
select throws_ok($$select public.create_tenant_position_v1('89000000-0000-4000-8000-000000000101','Denied Position',null,null,'analyst','active',44,'on_site','clt','none','denied-position')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'manager cannot create positions');
select throws_ok($$select public.update_tenant_position_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000501','Denied Position',null,null,'analyst','active',44,'on_site','clt','none')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'manager cannot update positions');
select throws_ok($$select public.archive_tenant_position_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000501')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'manager cannot archive positions');

select set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select throws_ok($$select public.archive_tenant_person_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000209')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'employee is denied by the shared role boundary');
select set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
select throws_ok($$select public.archive_tenant_person_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000209')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'inactive HR is denied');

select set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((public.create_tenant_person_v1(
  '89000000-0000-4000-8000-000000000101','Created Person',' created@example.com ',null,null,'2026-01-01','active',
  '89000000-0000-4000-8000-000000000401','89000000-0000-4000-8000-000000000501','89000000-0000-4000-8000-000000000204','D','person-create-1'
)->>'status'), 'succeeded', 'owner creates a tenant-safe Person');
select is((public.create_tenant_person_v1(
  '89000000-0000-4000-8000-000000000101','Created Person',' created@example.com ',null,null,'2026-01-01','active',
  '89000000-0000-4000-8000-000000000401','89000000-0000-4000-8000-000000000501','89000000-0000-4000-8000-000000000204','D','person-create-1'
)->>'status'), 'idempotent_retry', 'Person create retry does not duplicate');
reset role;
select is((select count(*) from public.people where email = 'created@example.com'), 1::bigint,
  'idempotent Person create persists one row');
select is((select user_id from public.people where email = 'created@example.com'), null::uuid,
  'Person creation never provisions Auth access');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok($$select public.create_tenant_person_v1(
  '89000000-0000-4000-8000-000000000101','Changed Intent','changed@example.com',null,null,null,'active',null,null,null,null,'person-create-1')$$,
  '23505', 'IDEMPOTENCY_CONFLICT', 'Person create key cannot be reused for a different intent');
select throws_ok($$select public.create_tenant_person_v1(
  '89000000-0000-4000-8000-000000000101','Foreign Team',null,null,null,null,'active','89000000-0000-4000-8000-000000000402',null,null,null,'person-foreign-team')$$,
  '23514', 'TENANT_REFERENCE_INVALID', 'foreign team is rejected');
select throws_ok($$select public.create_tenant_person_v1(
  '89000000-0000-4000-8000-000000000101','Foreign Position',null,null,null,null,'active',null,'89000000-0000-4000-8000-000000000502',null,null,'person-foreign-position')$$,
  '23514', 'TENANT_REFERENCE_INVALID', 'foreign position is rejected');
select throws_ok($$select public.create_tenant_person_v1(
  '89000000-0000-4000-8000-000000000101','Foreign Manager',null,null,null,null,'active',null,null,'89000000-0000-4000-8000-000000000210',null,'person-foreign-manager')$$,
  '23514', 'TENANT_REFERENCE_INVALID', 'foreign manager is rejected');

select set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((public.update_tenant_person_v1(
  '89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000209','Updated Person','updated@example.com',null,null,null,'on_leave',
  '89000000-0000-4000-8000-000000000401','89000000-0000-4000-8000-000000000501','89000000-0000-4000-8000-000000000204',null
)->>'status'), 'succeeded', 'HR updates a Person through the explicit contract');
select throws_ok($$select public.update_tenant_person_v1(
  '89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000210','Foreign','foreign@example.com',null,null,null,'active',null,null,null,null)$$,
  'P0002', 'PERSON_NOT_FOUND', 'foreign Person selector fails closed');
select is((public.archive_tenant_person_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000207')->>'accessDeactivated'),
  'true', 'HR termination atomically deactivates linked non-owner access');
reset role;
select is((select status from public.company_members where id = '89000000-0000-4000-8000-000000000117'),
  'inactive', 'linked membership is inactive after Person termination');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((public.archive_tenant_person_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000207')->>'status'),
  'already_archived', 'Person archive retry is deterministic');
select throws_ok($$select public.archive_tenant_person_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000201')$$,
  '42501', 'PERSON_ACCESS_CONFLICT', 'HR cannot deactivate owner access through People');

select set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((public.create_tenant_department_v1(
  '89000000-0000-4000-8000-000000000101','New Department','Description','89000000-0000-4000-8000-000000000204','department-create-1'
)->>'status'), 'succeeded', 'admin creates a department');
select is((public.create_tenant_department_v1(
  '89000000-0000-4000-8000-000000000101','New Department','Description','89000000-0000-4000-8000-000000000204','department-create-1'
)->>'status'), 'idempotent_retry', 'department create retry is deterministic');
select throws_ok($$select public.create_tenant_department_v1(
  '89000000-0000-4000-8000-000000000101','Foreign Manager Department',null,'89000000-0000-4000-8000-000000000210','department-foreign-manager')$$,
  '23514', 'TENANT_REFERENCE_INVALID', 'department rejects foreign manager');
select is((public.update_tenant_department_v1(
  '89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000301','Alpha Updated',null,'89000000-0000-4000-8000-000000000204'
)->>'status'), 'succeeded', 'admin updates a department');
select throws_ok($$select public.update_tenant_department_v1(
  '89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000302','Foreign',null,null)$$,
  'P0002', 'ORGANIZATION_ENTITY_NOT_FOUND', 'foreign department selector fails closed');
select is((public.archive_tenant_department_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000301')->>'status'),
  'succeeded', 'admin archives a department without deleting dependents');
select is((public.archive_tenant_department_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000301')->>'status'),
  'already_archived', 'department archive retry is deterministic');
reset role;
select ok(exists(select 1 from public.teams where id = '89000000-0000-4000-8000-000000000401' and department_id = '89000000-0000-4000-8000-000000000301'),
  'department soft archive preserves dependent structure');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((public.create_tenant_team_v1(
  '89000000-0000-4000-8000-000000000101','New Team',null,null,'89000000-0000-4000-8000-000000000401','89000000-0000-4000-8000-000000000204','team-create-1'
)->>'status'), 'succeeded', 'HR creates a team');
select is((public.create_tenant_team_v1(
  '89000000-0000-4000-8000-000000000101','New Team',null,null,'89000000-0000-4000-8000-000000000401','89000000-0000-4000-8000-000000000204','team-create-1'
)->>'status'), 'idempotent_retry', 'team create retry is deterministic');
select throws_ok($$select public.create_tenant_team_v1(
  '89000000-0000-4000-8000-000000000101','Foreign Team Department',null,'89000000-0000-4000-8000-000000000302',null,null,'team-foreign-department')$$,
  '23514', 'TENANT_REFERENCE_INVALID', 'team rejects foreign department');
select throws_ok($$select public.create_tenant_team_v1(
  '89000000-0000-4000-8000-000000000101','Foreign Parent',null,null,'89000000-0000-4000-8000-000000000402',null,'team-foreign-parent')$$,
  '23514', 'TENANT_REFERENCE_INVALID', 'team rejects foreign parent');
select is((public.update_tenant_team_v1(
  '89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000401','Team Updated',null,null,null,'89000000-0000-4000-8000-000000000204'
)->>'status'), 'succeeded', 'HR updates a team');
select throws_ok($$select public.update_tenant_team_v1(
  '89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000401','Self Parent',null,null,'89000000-0000-4000-8000-000000000401',null)$$,
  '22023', 'VALIDATION_FAILED', 'team cannot become its own parent');
select is((public.archive_tenant_team_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000401')->>'status'),
  'succeeded', 'HR archives a team');
select is((public.archive_tenant_team_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000401')->>'status'),
  'already_archived', 'team archive retry is deterministic');
reset role;
select ok(exists(select 1 from public.people where email = 'created@example.com' and team_id = '89000000-0000-4000-8000-000000000401'),
  'team soft archive preserves member references');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok($$select public.archive_tenant_person_v1(
  '89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000201')$$,
  '23514', 'PERSON_ACCESS_CONFLICT', 'last owner cannot terminate self and orphan ownership');
select is((public.update_tenant_person_v1(
  '89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000205','Employee Terminated','employee-a@example.com',null,null,null,'terminated',null,null,null,null
)->>'accessDeactivated'), 'true', 'terminated status through update also deactivates linked access');
reset role;
select is((select status from public.company_members where id = '89000000-0000-4000-8000-000000000115'),
  'inactive', 'update-to-terminated persists access deactivation atomically');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((public.create_tenant_position_v1(
  '89000000-0000-4000-8000-000000000101','New Position',null,null,'specialist','active',40,'hybrid','clt','occasional','position-create-1'
)->>'status'), 'succeeded', 'owner creates a position');
select is((public.create_tenant_position_v1(
  '89000000-0000-4000-8000-000000000101','New Position',null,null,'specialist','active',40,'hybrid','clt','occasional','position-create-1'
)->>'status'), 'idempotent_retry', 'position create retry is deterministic');
select throws_ok($$select public.create_tenant_position_v1(
  '89000000-0000-4000-8000-000000000101','Foreign Department Position',null,'89000000-0000-4000-8000-000000000302','analyst','active',44,'on_site','clt','none','position-foreign-department')$$,
  '23514', 'TENANT_REFERENCE_INVALID', 'position rejects foreign department');
select is((public.update_tenant_position_v1(
  '89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000501','Position Updated',null,null,'manager','inactive',36,'remote','pj','frequent'
)->>'status'), 'succeeded', 'owner updates a position');
select throws_ok($$select public.update_tenant_position_v1(
  '89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000502','Foreign',null,null,'analyst','active',44,'on_site','clt','none')$$,
  'P0002', 'ORGANIZATION_ENTITY_NOT_FOUND', 'foreign position selector fails closed');
select is((public.archive_tenant_position_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000501')->>'status'),
  'succeeded', 'owner archives a position');
select is((public.archive_tenant_position_v1('89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000501')->>'status'),
  'already_archived', 'position archive retry is deterministic');
reset role;
select ok(exists(select 1 from public.people where email = 'created@example.com' and position_id = '89000000-0000-4000-8000-000000000501'),
  'position soft archive preserves Person references');

select is((select count(*) from public.activity_events
  where company_id = '89000000-0000-4000-8000-000000000101'
    and activity_type in (
      'employee.created','employee.updated','employee.archived',
      'department.created','department.updated','department.archived',
      'team.created','team.updated','team.archived',
      'position.created','position.updated','position.archived'
    )), 13::bigint, 'each successful core mutation persists exactly one atomic activity');
select is((select count(*) from public.activity_events
  where company_id = '89000000-0000-4000-8000-000000000101'
    and idempotency_key is not null), 4::bigint,
  'create retries reuse four operation-scoped activity identities');
select ok(not exists(select 1 from public.activity_events
  where metadata ? 'email' or metadata ? 'phone' or metadata ? 'birthDate'),
  'activity metadata excludes sensitive contact and birth data');
select is((select count(*) from jsonb_object_keys(public.archive_tenant_position_v1(
  '89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000501'
))), 2::bigint, 'archive returns only status and target id');

-- ---------------------------------------------------------------------------
-- Behavioral multi-hop Team hierarchy cycle prevention (ORGANIZATION_HIERARCHY_CYCLE).
-- Chain A(403) <- B(404) <- C(405): C is a descendant of A. Re-parenting A onto C
-- (A -> C -> B -> A) must be rejected by the real public RPC, and a legitimate
-- multi-level re-parent must NOT be a false positive.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$select public.update_tenant_team_v1(
    '89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000403','Cycle Root A',
    null,null,'89000000-0000-4000-8000-000000000405',null)$$,
  '23514', 'ORGANIZATION_HIERARCHY_CYCLE',
  'multi-hop team hierarchy cycle (root re-parented onto its descendant) is rejected');

select is(
  (public.update_tenant_team_v1(
    '89000000-0000-4000-8000-000000000101','89000000-0000-4000-8000-000000000405','Cycle Leaf C',
    null,null,'89000000-0000-4000-8000-000000000403',null)->>'status'),
  'succeeded', 'a valid multi-level re-parent (leaf directly under root) is not a false cycle');

reset role;

select is(
  (select parent_team_id from public.teams where id = '89000000-0000-4000-8000-000000000403'),
  null::uuid, 'rejected cycle leaves root A with its original (no) parent');
select is(
  (select parent_team_id from public.teams where id = '89000000-0000-4000-8000-000000000404'),
  '89000000-0000-4000-8000-000000000403'::uuid, 'rejected cycle leaves B parented to A (hierarchy uncorrupted)');

select * from finish();
rollback;
