begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Static contract.
-- ---------------------------------------------------------------------------
select has_function('public','get_tenant_entity_activity_timeline_v1',
  array['uuid','text','uuid','integer']::text[]);
select ok((select p.prosecdef and p.provolatile='s' and p.proconfig=array['search_path=public, pg_temp']::text[]
  from pg_proc p where p.oid='public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)'::regprocedure),
  'timeline boundary is stable, SECURITY DEFINER with hardened search_path');
select ok(has_function_privilege('authenticated','public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)','execute'),
  'authenticated may execute the timeline boundary');
select ok(not has_function_privilege('anon','public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)','execute'),
  'anon cannot execute the timeline boundary');
select ok(not has_table_privilege('authenticated','public.activity_events','select'),
  'authenticated still has no direct SELECT on activity_events');

-- ---------------------------------------------------------------------------
-- Fixtures: Alpha has two job_opening events + a department event for the same
-- opening id; Beta has a job_opening event with the SAME entity_id (cross-tenant).
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('95000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('95000000-0000-4000-8000-000000000003','owner-b@example.com');

insert into public.companies (id, name, slug) values
  ('95000000-0000-4000-8000-000000000101','TL Alpha','tl-alpha'),
  ('95000000-0000-4000-8000-000000000102','TL Beta','tl-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('95000000-0000-4000-8000-000000000111','95000000-0000-4000-8000-000000000101','95000000-0000-4000-8000-000000000001','owner','active'),
  ('95000000-0000-4000-8000-000000000112','95000000-0000-4000-8000-000000000102','95000000-0000-4000-8000-000000000003','owner','active');

insert into public.activity_events (company_id, activity_type, module, title, entity_type, entity_id, visibility) values
  ('95000000-0000-4000-8000-000000000101','job_opening.created','recruitment','Vaga criada',
   'job_opening','95000000-0000-4000-8000-000000000501','company'),
  ('95000000-0000-4000-8000-000000000101','job_opening.submitted_for_approval','recruitment','Vaga enviada para aprovação',
   'job_opening','95000000-0000-4000-8000-000000000501','company'),
  ('95000000-0000-4000-8000-000000000101','department.created','organization','Departamento criado',
   'department','95000000-0000-4000-8000-000000000601','company'),
  ('95000000-0000-4000-8000-000000000102','job_opening.created','recruitment','Vaga criada (Beta)',
   'job_opening','95000000-0000-4000-8000-000000000501','company');

-- ---------------------------------------------------------------------------
-- Behavioral, as the active Alpha owner (reads only through the boundary).
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select is(
  (select count(*)::int from public.get_tenant_entity_activity_timeline_v1(
     '95000000-0000-4000-8000-000000000101','job_opening','95000000-0000-4000-8000-000000000501',20)),
  2, 'job_opening timeline returns the opening events (excludes other entity types and other tenants)');
select is(
  (select bool_and(entity_type='job_opening') from public.get_tenant_entity_activity_timeline_v1(
     '95000000-0000-4000-8000-000000000101','job_opening','95000000-0000-4000-8000-000000000501',20)),
  true, 'only job_opening events are returned');

-- Invalid entity type is still rejected.
select throws_ok(
  $$select * from public.get_tenant_entity_activity_timeline_v1(
     '95000000-0000-4000-8000-000000000101','candidate','95000000-0000-4000-8000-000000000501',20)$$,
  '22023','ACTIVITY_ENTITY_TYPE_INVALID','an unknown entity type is still rejected');
reset role;

-- Non-member (Beta owner) denied on Alpha.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"95000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok(
  $$select * from public.get_tenant_entity_activity_timeline_v1(
     '95000000-0000-4000-8000-000000000101','job_opening','95000000-0000-4000-8000-000000000501',20)$$,
  '42501','TENANT_AUTHORIZATION_DENIED','a non-member is denied');
reset role;

-- Unauthenticated denied.
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok(
  $$select * from public.get_tenant_entity_activity_timeline_v1(
     '95000000-0000-4000-8000-000000000101','job_opening','95000000-0000-4000-8000-000000000501',20)$$,
  '42501','AUTHENTICATION_REQUIRED','an unauthenticated actor is denied');
reset role;

select * from finish();
rollback;
