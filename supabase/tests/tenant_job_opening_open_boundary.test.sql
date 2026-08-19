begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Static contract.
-- ---------------------------------------------------------------------------
select has_function('public','open_tenant_job_opening_v1',array['uuid','uuid']::text[]);

select ok((select p.prosecdef and p.proconfig=array['search_path=public, pg_temp']::text[]
  from pg_proc p where p.oid='public.open_tenant_job_opening_v1(uuid,uuid)'::regprocedure),
  'open boundary is SECURITY DEFINER, hardened search_path');

select ok(has_function_privilege('authenticated','public.open_tenant_job_opening_v1(uuid,uuid)','execute'),
  'authenticated may execute the open boundary');
select ok(not has_function_privilege('anon','public.open_tenant_job_opening_v1(uuid,uuid)','execute'),
  'anon cannot execute the open boundary');
select ok(not has_table_privilege('authenticated','public.recruitment_job_openings','update'),
  'authenticated still has no direct UPDATE on recruitment_job_openings');
select ok(not has_table_privilege('authenticated','public.activity_events','insert'),
  'authenticated still has no direct INSERT on activity_events');

-- ---------------------------------------------------------------------------
-- Fixtures: Alpha owner (with linked person = approver), an APPROVED opening
-- (501) and a DRAFT opening (502); Beta owner is foreign; Alpha employee.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('97000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('97000000-0000-4000-8000-000000000002','employee-a@example.com'),
  ('97000000-0000-4000-8000-000000000003','owner-b@example.com');

insert into public.companies (id, name, slug) values
  ('97000000-0000-4000-8000-000000000101','OP Alpha','op-alpha'),
  ('97000000-0000-4000-8000-000000000102','OP Beta','op-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('97000000-0000-4000-8000-000000000111','97000000-0000-4000-8000-000000000101','97000000-0000-4000-8000-000000000001','owner','active'),
  ('97000000-0000-4000-8000-000000000112','97000000-0000-4000-8000-000000000101','97000000-0000-4000-8000-000000000002','employee','active'),
  ('97000000-0000-4000-8000-000000000113','97000000-0000-4000-8000-000000000102','97000000-0000-4000-8000-000000000003','owner','active');

insert into public.departments (id, company_id, name) values
  ('97000000-0000-4000-8000-000000000201','97000000-0000-4000-8000-000000000101','Alpha Dept');
insert into public.positions (id, company_id, name) values
  ('97000000-0000-4000-8000-000000000301','97000000-0000-4000-8000-000000000101','Alpha Position');
insert into public.people (id, company_id, user_id, full_name) values
  ('97000000-0000-4000-8000-000000000401','97000000-0000-4000-8000-000000000101','97000000-0000-4000-8000-000000000001','Alpha Approver');

-- 501: already approved (approver + approved_at set at approve time).
insert into public.recruitment_job_openings (
  id, company_id, title, description, department_id, position_id,
  requesting_manager_id, opening_reason, opening_justification, work_model,
  employment_type, status, approver_id, approved_at, created_by_user_id
) values (
  '97000000-0000-4000-8000-000000000501','97000000-0000-4000-8000-000000000101','Vaga Aprovada','desc',
  '97000000-0000-4000-8000-000000000201','97000000-0000-4000-8000-000000000301','97000000-0000-4000-8000-000000000401',
  'headcount_growth','justificativa','remote','clt','approved','97000000-0000-4000-8000-000000000401',now(),
  '97000000-0000-4000-8000-000000000001');

-- 502: still a draft (never approved).
insert into public.recruitment_job_openings (
  id, company_id, title, description, department_id, position_id,
  requesting_manager_id, opening_reason, opening_justification, work_model,
  employment_type, status, created_by_user_id
) values (
  '97000000-0000-4000-8000-000000000502','97000000-0000-4000-8000-000000000101','Vaga Rascunho','desc',
  '97000000-0000-4000-8000-000000000201','97000000-0000-4000-8000-000000000301','97000000-0000-4000-8000-000000000401',
  'headcount_growth','justificativa','remote','clt','draft',
  '97000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------
-- Behavioral, as the active Alpha owner (owner/admin/hr mutator).
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- A non-existent opening is rejected.
select throws_ok(
  $$select public.open_tenant_job_opening_v1(
     '97000000-0000-4000-8000-000000000101','97000000-0000-4000-8000-0000000005ff')$$,
  '23503','JOB_OPENING_NOT_FOUND','a non-existent opening is rejected');

-- A non-approved (draft) opening cannot be opened.
select throws_ok(
  $$select public.open_tenant_job_opening_v1(
     '97000000-0000-4000-8000-000000000101','97000000-0000-4000-8000-000000000502')$$,
  '22023','JOB_OPENING_NOT_APPROVED','a draft opening cannot be opened');

-- Happy path: open transitions the approved opening to open.
select is(
  (select (public.open_tenant_job_opening_v1(
     '97000000-0000-4000-8000-000000000101','97000000-0000-4000-8000-000000000501')) ->> 'status'),
  'open','open transitions the approved opening to open');

-- Double-open is rejected (opening no longer approved) — idempotent.
select throws_ok(
  $$select public.open_tenant_job_opening_v1(
     '97000000-0000-4000-8000-000000000101','97000000-0000-4000-8000-000000000501')$$,
  '22023','JOB_OPENING_NOT_APPROVED','double-open is rejected');
reset role;

-- Side effects verified from the setup role.
select is((select status from public.recruitment_job_openings where id='97000000-0000-4000-8000-000000000501'),
  'open','the opening is persisted as open');
select is((select approver_id from public.recruitment_job_openings where id='97000000-0000-4000-8000-000000000501'),
  '97000000-0000-4000-8000-000000000401','the approver is preserved');
select ok((select approved_at is not null from public.recruitment_job_openings where id='97000000-0000-4000-8000-000000000501'),
  'approved_at is preserved');
select is((select count(*)::int from public.activity_events
   where company_id='97000000-0000-4000-8000-000000000101' and activity_type='job_opening.opened'),
  1,'exactly one open activity was recorded');

-- Non-owner/admin/hr member denied.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"97000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok(
  $$select public.open_tenant_job_opening_v1(
     '97000000-0000-4000-8000-000000000101','97000000-0000-4000-8000-000000000501')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','an employee-role member cannot open');
reset role;

-- Non-member denied.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"97000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok(
  $$select public.open_tenant_job_opening_v1(
     '97000000-0000-4000-8000-000000000101','97000000-0000-4000-8000-000000000501')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','a non-member cannot open');
reset role;

-- Unauthenticated denied.
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok(
  $$select public.open_tenant_job_opening_v1(
     '97000000-0000-4000-8000-000000000101','97000000-0000-4000-8000-000000000501')$$,
  '42501','AUTHENTICATION_REQUIRED','an unauthenticated actor cannot open');
reset role;

select * from finish();
rollback;
