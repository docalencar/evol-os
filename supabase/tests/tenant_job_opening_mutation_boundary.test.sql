begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Static contract.
-- ---------------------------------------------------------------------------
select has_function('public','create_tenant_job_opening_v1',
  array['uuid','text','text','uuid','uuid','uuid','uuid','text','uuid','text','integer','integer',
        'integer','text','text','text','numeric','numeric','text','date','text','numeric','boolean','text']::text[]);

select ok(p.prosecdef and p.proconfig=array['search_path=public, pg_temp']::text[],
  'create_tenant_job_opening_v1 is SECURITY DEFINER with hardened search_path')
from pg_proc p where p.oid = 'public.create_tenant_job_opening_v1(uuid,text,text,uuid,uuid,uuid,uuid,text,uuid,text,integer,integer,integer,text,text,text,numeric,numeric,text,date,text,numeric,boolean,text)'::regprocedure;

select ok(has_function_privilege('authenticated',
  'public.create_tenant_job_opening_v1(uuid,text,text,uuid,uuid,uuid,uuid,text,uuid,text,integer,integer,integer,text,text,text,numeric,numeric,text,date,text,numeric,boolean,text)','execute'),
  'authenticated may execute the create boundary');
select ok(not has_function_privilege('anon',
  'public.create_tenant_job_opening_v1(uuid,text,text,uuid,uuid,uuid,uuid,text,uuid,text,integer,integer,integer,text,text,text,numeric,numeric,text,date,text,numeric,boolean,text)','execute'),
  'anon cannot execute the create boundary');
select ok(not has_table_privilege('authenticated','public.recruitment_job_openings','insert'),
  'authenticated still has no direct INSERT on recruitment_job_openings');
select ok(not has_table_privilege('authenticated','public.recruitment_job_openings','select'),
  'authenticated still has no direct SELECT on recruitment_job_openings');

-- ---------------------------------------------------------------------------
-- Fixtures.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('93000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('93000000-0000-4000-8000-000000000002','employee-a@example.com'),
  ('93000000-0000-4000-8000-000000000003','owner-b@example.com');

insert into public.companies (id, name, slug) values
  ('93000000-0000-4000-8000-000000000101','JO Alpha','jo-alpha'),
  ('93000000-0000-4000-8000-000000000102','JO Beta','jo-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('93000000-0000-4000-8000-000000000111','93000000-0000-4000-8000-000000000101','93000000-0000-4000-8000-000000000001','owner','active'),
  ('93000000-0000-4000-8000-000000000112','93000000-0000-4000-8000-000000000101','93000000-0000-4000-8000-000000000002','employee','active'),
  ('93000000-0000-4000-8000-000000000113','93000000-0000-4000-8000-000000000102','93000000-0000-4000-8000-000000000003','owner','active');

insert into public.departments (id, company_id, name) values
  ('93000000-0000-4000-8000-000000000201','93000000-0000-4000-8000-000000000101','Alpha Dept'),
  ('93000000-0000-4000-8000-000000000202','93000000-0000-4000-8000-000000000102','Beta Dept');

insert into public.positions (id, company_id, name) values
  ('93000000-0000-4000-8000-000000000301','93000000-0000-4000-8000-000000000101','Alpha Position'),
  ('93000000-0000-4000-8000-000000000302','93000000-0000-4000-8000-000000000102','Beta Position');

insert into public.people (id, company_id, full_name) values
  ('93000000-0000-4000-8000-000000000401','93000000-0000-4000-8000-000000000101','Alpha Manager'),
  ('93000000-0000-4000-8000-000000000402','93000000-0000-4000-8000-000000000101','Alpha Recruiter'),
  ('93000000-0000-4000-8000-000000000403','93000000-0000-4000-8000-000000000102','Beta Person');

-- ---------------------------------------------------------------------------
-- Behavioral, as the active Alpha owner.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"93000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- Valid create returns a persisted draft.
select is(
  (select (public.create_tenant_job_opening_v1(
    '93000000-0000-4000-8000-000000000101','Vaga Alpha','Descrição da vaga',
    '93000000-0000-4000-8000-000000000201','93000000-0000-4000-8000-000000000301',
    '93000000-0000-4000-8000-000000000401',null,'headcount_growth',null,'Justificativa',
    1,0,3,'remote',null,'clt',null,null,'medium',null,null,null,true,'k1'
  )) ->> 'status'),
  'draft','create persists the job opening as draft');

-- Idempotency: same key returns the first result (the no-duplicate side effect
-- is verified from the setup role below, because `authenticated` intentionally
-- cannot read the protected table directly).
select is(
  (select (public.create_tenant_job_opening_v1(
    '93000000-0000-4000-8000-000000000101','Vaga Alpha','Descrição da vaga',
    '93000000-0000-4000-8000-000000000201','93000000-0000-4000-8000-000000000301',
    '93000000-0000-4000-8000-000000000401',null,'headcount_growth',null,'Justificativa',
    1,0,3,'remote',null,'clt',null,null,'medium',null,null,null,true,'k1'
  )) ->> 'title'),
  'Vaga Alpha','idempotent create returns the first result');

-- Cross-tenant foreign references fail closed.
select throws_ok(
  $$select public.create_tenant_job_opening_v1(
    '93000000-0000-4000-8000-000000000101','X','Y',
    '93000000-0000-4000-8000-000000000202','93000000-0000-4000-8000-000000000301',
    '93000000-0000-4000-8000-000000000401',null,'headcount_growth',null,'Z',
    1,0,1,'remote',null,'clt',null,null,'medium',null,null,null,true,'k2')$$,
  '23503','JOB_OPENING_DEPARTMENT_INVALID','cross-tenant department is rejected');
select throws_ok(
  $$select public.create_tenant_job_opening_v1(
    '93000000-0000-4000-8000-000000000101','X','Y',
    '93000000-0000-4000-8000-000000000201','93000000-0000-4000-8000-000000000302',
    '93000000-0000-4000-8000-000000000401',null,'headcount_growth',null,'Z',
    1,0,1,'remote',null,'clt',null,null,'medium',null,null,null,true,'k3')$$,
  '23503','JOB_OPENING_POSITION_INVALID','cross-tenant position is rejected');

-- Replacement rule.
select throws_ok(
  $$select public.create_tenant_job_opening_v1(
    '93000000-0000-4000-8000-000000000101','X','Y',
    '93000000-0000-4000-8000-000000000201','93000000-0000-4000-8000-000000000301',
    '93000000-0000-4000-8000-000000000401',null,'replacement',null,'Z',
    1,0,1,'remote',null,'clt',null,null,'medium',null,null,null,true,'k4')$$,
  '22023','JOB_OPENING_REPLACEMENT_INVALID','replacement without a replaced employee is rejected');

-- Empty title is rejected.
select throws_ok(
  $$select public.create_tenant_job_opening_v1(
    '93000000-0000-4000-8000-000000000101','   ','Y',
    '93000000-0000-4000-8000-000000000201','93000000-0000-4000-8000-000000000301',
    '93000000-0000-4000-8000-000000000401',null,'headcount_growth',null,'Z',
    1,0,1,'remote',null,'clt',null,null,'medium',null,null,null,true,'k5')$$,
  '22023','JOB_OPENING_INPUT_INVALID','blank title is rejected');
reset role;

-- Non-mutator member (employee role) is denied.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"93000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok(
  $$select public.create_tenant_job_opening_v1(
    '93000000-0000-4000-8000-000000000101','X','Y',
    '93000000-0000-4000-8000-000000000201','93000000-0000-4000-8000-000000000301',
    '93000000-0000-4000-8000-000000000401',null,'headcount_growth',null,'Z',
    1,0,1,'remote',null,'clt',null,null,'medium',null,null,null,true,'k6')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','a non owner/admin/hr member is denied');
reset role;

-- Unauthenticated is denied.
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok(
  $$select public.create_tenant_job_opening_v1(
    '93000000-0000-4000-8000-000000000101','X','Y',
    '93000000-0000-4000-8000-000000000201','93000000-0000-4000-8000-000000000301',
    '93000000-0000-4000-8000-000000000401',null,'headcount_growth',null,'Z',
    1,0,1,'remote',null,'clt',null,null,'medium',null,null,null,true,'k7')$$,
  '42501','AUTHENTICATION_REQUIRED','an unauthenticated actor is denied');
reset role;

-- ---------------------------------------------------------------------------
-- Side-effect verification from the setup role. `authenticated` intentionally
-- cannot read recruitment_job_openings directly, so persistence is asserted here
-- (not under the authenticated role). Only the valid 'k1' create persisted;
-- every other call above raised before inserting.
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from public.recruitment_job_openings
   where company_id='93000000-0000-4000-8000-000000000101'),
  1,'exactly one row persisted (idempotent create did not duplicate)');
select is(
  (select status from public.recruitment_job_openings
   where company_id='93000000-0000-4000-8000-000000000101' and title='Vaga Alpha'),
  'draft','the persisted status is draft (not counted as an open vacancy)');
select is(
  (select count(*)::int from public.activity_events
   where company_id='93000000-0000-4000-8000-000000000101' and activity_type='job_opening.created'),
  1,'exactly one creation activity event was recorded');

select * from finish();
rollback;
