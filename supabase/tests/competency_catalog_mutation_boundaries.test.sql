begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Static contract.
-- ---------------------------------------------------------------------------
select has_function('public','create_tenant_competency_v1',
  array['uuid','text','text','text','integer','integer','text']);
select has_function('public','update_tenant_competency_v1',
  array['uuid','uuid','text','text','text','integer','integer']);
select has_function('public','archive_tenant_competency_v1', array['uuid','uuid']);

select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('create_tenant_competency_v1','update_tenant_competency_v1','archive_tenant_competency_v1')
    and p.prosecdef and p.proconfig = array['search_path=public, pg_temp']
), 3::bigint, 'all competency boundaries are SECURITY DEFINER with hardened search_path');

select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('create_tenant_competency_v1','update_tenant_competency_v1','archive_tenant_competency_v1')
    and has_function_privilege('authenticated', p.oid, 'execute')
), 3::bigint, 'authenticated may execute all three competency boundaries');

select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('create_tenant_competency_v1','update_tenant_competency_v1','archive_tenant_competency_v1')
    and (has_function_privilege('anon', p.oid, 'execute')
      or has_function_privilege('service_role', p.oid, 'execute'))
), 0::bigint, 'anon and service_role cannot execute any competency boundary');

select ok(not has_table_privilege('authenticated','public.competencies','insert'),'competencies insert stays closed');
select ok(not has_table_privilege('authenticated','public.competencies','update'),'competencies update stays closed');
select ok(not has_table_privilege('authenticated','public.competencies','delete'),'competencies delete stays closed');

-- ---------------------------------------------------------------------------
-- Fixtures: Alpha (owner/manager/employee) and Beta (owner-b, foreign).
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('99000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('99000000-0000-4000-8000-000000000004','manager-a@example.com'),
  ('99000000-0000-4000-8000-000000000005','employee-a@example.com'),
  ('99000000-0000-4000-8000-000000000008','owner-b@example.com');

insert into public.companies (id, name, slug) values
  ('99000000-0000-4000-8000-000000000101','Comp Alpha','comp-alpha'),
  ('99000000-0000-4000-8000-000000000102','Comp Beta','comp-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('99000000-0000-4000-8000-000000000111','99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000001','owner','active'),
  ('99000000-0000-4000-8000-000000000114','99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000004','manager','active'),
  ('99000000-0000-4000-8000-000000000115','99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000005','employee','active'),
  ('99000000-0000-4000-8000-000000000118','99000000-0000-4000-8000-000000000102','99000000-0000-4000-8000-000000000008','owner','active');

insert into public.people (id, company_id, user_id, full_name) values
  ('99000000-0000-4000-8000-000000000201','99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000001','Owner A');

-- Existing active competency (Alpha), a foreign one (Beta), an archived one (Alpha).
insert into public.competencies (id, company_id, name, description, category, expected_level, weight, active) values
  ('99000000-0000-4000-8000-000000000601','99000000-0000-4000-8000-000000000101','Comunicacao','desc','behavioral',3,2,true),
  ('99000000-0000-4000-8000-000000000602','99000000-0000-4000-8000-000000000102','Beta Skill','desc','technical',3,1,true),
  ('99000000-0000-4000-8000-000000000603','99000000-0000-4000-8000-000000000101','Arquivada','desc','technical',3,1,false);

-- An employee-competency assignment on the Alpha competency, to prove archive
-- leaves assignments untouched.
insert into public.employee_competencies (id, company_id, employee_id, competency_id, current_level, source) values
  ('99000000-0000-4000-8000-000000000701','99000000-0000-4000-8000-000000000101',
   '99000000-0000-4000-8000-000000000201','99000000-0000-4000-8000-000000000601',4,'manual');

-- ---------------------------------------------------------------------------
-- Authorization: unauthenticated, manager and employee denied (all ops).
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.create_tenant_competency_v1('99000000-0000-4000-8000-000000000101','X',null,'behavioral',3,1,'k')$$,
  '42501','AUTHENTICATION_REQUIRED','unauthenticated create is denied');
select throws_ok($$select public.archive_tenant_competency_v1('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000601')$$,
  '42501','AUTHENTICATION_REQUIRED','unauthenticated archive is denied');

select set_config('request.jwt.claims','{"sub":"99000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select public.create_tenant_competency_v1('99000000-0000-4000-8000-000000000101','X',null,'behavioral',3,1,'k')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','manager cannot create competency');
select throws_ok($$select public.update_tenant_competency_v1('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000601','X',null,'behavioral',3,1)$$,
  '42501','TENANT_AUTHORIZATION_DENIED','manager cannot update competency');
select throws_ok($$select public.archive_tenant_competency_v1('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000601')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','manager cannot archive competency');

select set_config('request.jwt.claims','{"sub":"99000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select public.create_tenant_competency_v1('99000000-0000-4000-8000-000000000101','X',null,'behavioral',3,1,'k')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','employee cannot create competency');
reset role;

-- ---------------------------------------------------------------------------
-- Behavioral, as the active Alpha owner.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"99000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- CREATE validation.
select throws_ok($$select public.create_tenant_competency_v1('99000000-0000-4000-8000-000000000101','A',null,'behavioral',3,1,'k1')$$,
  '22023','VALIDATION_FAILED','name shorter than 2 is rejected');
select throws_ok($$select public.create_tenant_competency_v1('99000000-0000-4000-8000-000000000101','Valida',null,'invalid',3,1,'k2')$$,
  '22023','VALIDATION_FAILED','invalid category is rejected');
select throws_ok($$select public.create_tenant_competency_v1('99000000-0000-4000-8000-000000000101','Valida',null,'behavioral',6,1,'k3')$$,
  '22023','VALIDATION_FAILED','expected_level out of range is rejected');
select throws_ok($$select public.create_tenant_competency_v1('99000000-0000-4000-8000-000000000101','Valida',null,'behavioral',3,0,'k4')$$,
  '22023','VALIDATION_FAILED','weight out of range is rejected');
select throws_ok($$select public.create_tenant_competency_v1('99000000-0000-4000-8000-000000000101','Valida',null,'behavioral',3,1,'')$$,
  '22023','VALIDATION_FAILED','empty idempotency key is rejected');

-- CREATE happy path.
select is(
  (public.create_tenant_competency_v1('99000000-0000-4000-8000-000000000101','Lideranca','desc','leadership',4,3,'lid-1')) ->> 'status',
  'succeeded','owner creates a competency');

-- Idempotent retry: same key + same fingerprint returns the same competency.
select is(
  (public.create_tenant_competency_v1('99000000-0000-4000-8000-000000000101','Lideranca','desc','leadership',4,3,'lid-1')) ->> 'status',
  'idempotent_retry','same key + same intent is an idempotent retry');

-- Same key + different intent is a conflict.
select throws_ok($$select public.create_tenant_competency_v1('99000000-0000-4000-8000-000000000101','Lideranca X','desc','leadership',4,3,'lid-1')$$,
  '23505','IDEMPOTENCY_CONFLICT','same key + different intent is rejected');

-- Uniqueness: an active competency name must be unique within the tenant.
select throws_ok($$select public.create_tenant_competency_v1('99000000-0000-4000-8000-000000000101','Comunicacao','desc','behavioral',3,1,'dup-1')$$,
  '23505','CONFLICT','duplicate active competency name is rejected');

-- Cross-tenant create (owner A is not a member of Beta) is denied at the gate.
select throws_ok($$select public.create_tenant_competency_v1('99000000-0000-4000-8000-000000000102','Intrusa',null,'behavioral',3,1,'x-1')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','owner cannot create in a foreign tenant');

-- UPDATE happy path.
select is(
  (public.update_tenant_competency_v1('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000601','Comunicacao Assertiva','nova','behavioral',4,3)) ->> 'status',
  'succeeded','owner updates a competency');

-- UPDATE fail-closed: cross-tenant, nonexistent and archived all NOT_FOUND.
select throws_ok($$select public.update_tenant_competency_v1('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000602','X',null,'technical',3,1)$$,
  'P0002','COMPETENCY_NOT_FOUND','cannot update a foreign-tenant competency');
select throws_ok($$select public.update_tenant_competency_v1('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-0000000006ff','X',null,'technical',3,1)$$,
  'P0002','COMPETENCY_NOT_FOUND','cannot update a nonexistent competency');
select throws_ok($$select public.update_tenant_competency_v1('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000603','X',null,'technical',3,1)$$,
  'P0002','COMPETENCY_NOT_FOUND','cannot update an archived competency');
select throws_ok($$select public.update_tenant_competency_v1('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000601','X',null,'behavioral',9,1)$$,
  '22023','VALIDATION_FAILED','update with invalid level is rejected');

-- ARCHIVE happy path.
select is(
  (public.archive_tenant_competency_v1('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000601')) ->> 'status',
  'succeeded','owner archives a competency');

-- Double-archive is idempotent (already_archived), no error.
select is(
  (public.archive_tenant_competency_v1('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000601')) ->> 'status',
  'already_archived','double archive is idempotent');

-- ARCHIVE fail-closed.
select throws_ok($$select public.archive_tenant_competency_v1('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000602')$$,
  'P0002','COMPETENCY_NOT_FOUND','cannot archive a foreign-tenant competency');
select throws_ok($$select public.archive_tenant_competency_v1('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-0000000006ff')$$,
  'P0002','COMPETENCY_NOT_FOUND','cannot archive a nonexistent competency');
reset role;

-- ---------------------------------------------------------------------------
-- Side effects verified from the setup role.
-- ---------------------------------------------------------------------------
-- CREATE persisted the new competency as active.
select is((select count(*)::int from public.competencies
   where company_id='99000000-0000-4000-8000-000000000101' and name='Lideranca' and active=true),
  1,'the created competency is persisted active');

-- UPDATE mutated the fields and kept tenant + active immutable.
select is((select name from public.competencies where id='99000000-0000-4000-8000-000000000601'),
  'Comunicacao Assertiva','the update persisted the new name');
select is((select company_id from public.competencies where id='99000000-0000-4000-8000-000000000601'),
  '99000000-0000-4000-8000-000000000101','company_id is immutable across update');

-- ARCHIVE is a soft archive; the record stays historical.
select is((select active from public.competencies where id='99000000-0000-4000-8000-000000000601'),
  false,'the archived competency is inactive');
select ok((select exists(select 1 from public.competencies where id='99000000-0000-4000-8000-000000000601')),
  'the archived competency row still exists (historical)');

-- Assignments are NOT touched by the archive.
select is((select count(*)::int from public.employee_competencies
   where id='99000000-0000-4000-8000-000000000701' and archived_at is null and current_level=4),
  1,'the employee-competency assignment is left intact by the archive');

-- Activity is emitted atomically, exactly once per operation.
select is((select count(*)::int from public.activity_events
   where company_id='99000000-0000-4000-8000-000000000101' and activity_type='competency.created'),
  1,'exactly one create activity was recorded');
select is((select count(*)::int from public.activity_events
   where company_id='99000000-0000-4000-8000-000000000101' and activity_type='competency.updated'),
  1,'exactly one update activity was recorded');
select is((select count(*)::int from public.activity_events
   where company_id='99000000-0000-4000-8000-000000000101' and activity_type='competency.archived'),
  1,'exactly one archive activity was recorded (double-archive added none)');

select * from finish();
rollback;
