begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Static contract.
-- ---------------------------------------------------------------------------
select has_function('public','submit_tenant_job_opening_for_approval_v1',
  array['uuid','uuid','jsonb','jsonb']::text[]);
select has_function('public','get_tenant_job_opening_v1',array['uuid','uuid']::text[]);

select ok((select p.prosecdef and p.proconfig=array['search_path=public, pg_temp']::text[]
  from pg_proc p where p.oid='public.submit_tenant_job_opening_for_approval_v1(uuid,uuid,jsonb,jsonb)'::regprocedure),
  'submit boundary is SECURITY DEFINER with hardened search_path');
select ok((select p.prosecdef and p.provolatile='s' and p.proconfig=array['search_path=public, pg_temp']::text[]
  from pg_proc p where p.oid='public.get_tenant_job_opening_v1(uuid,uuid)'::regprocedure),
  'detail read boundary is stable, SECURITY DEFINER with hardened search_path');

select ok(has_function_privilege('authenticated','public.submit_tenant_job_opening_for_approval_v1(uuid,uuid,jsonb,jsonb)','execute'),
  'authenticated may execute the submit boundary');
select ok(has_function_privilege('authenticated','public.get_tenant_job_opening_v1(uuid,uuid)','execute'),
  'authenticated may execute the detail read boundary');
select ok(not has_function_privilege('anon','public.submit_tenant_job_opening_for_approval_v1(uuid,uuid,jsonb,jsonb)','execute'),
  'anon cannot execute the submit boundary');
select ok(not has_function_privilege('anon','public.get_tenant_job_opening_v1(uuid,uuid)','execute'),
  'anon cannot execute the detail read boundary');
select ok(not has_table_privilege('authenticated','public.recruitment_job_openings','update'),
  'authenticated still has no direct UPDATE on recruitment_job_openings');
select ok(not has_table_privilege('authenticated','public.approval_requests','insert'),
  'authenticated still has no direct INSERT on approval_requests');

-- ---------------------------------------------------------------------------
-- Fixtures: Alpha owner + a draft opening + designated approver; Beta foreign.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('94000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('94000000-0000-4000-8000-000000000002','employee-a@example.com'),
  ('94000000-0000-4000-8000-000000000003','owner-b@example.com');

insert into public.companies (id, name, slug) values
  ('94000000-0000-4000-8000-000000000101','SA Alpha','sa-alpha'),
  ('94000000-0000-4000-8000-000000000102','SA Beta','sa-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('94000000-0000-4000-8000-000000000111','94000000-0000-4000-8000-000000000101','94000000-0000-4000-8000-000000000001','owner','active'),
  ('94000000-0000-4000-8000-000000000112','94000000-0000-4000-8000-000000000101','94000000-0000-4000-8000-000000000002','employee','active'),
  ('94000000-0000-4000-8000-000000000113','94000000-0000-4000-8000-000000000102','94000000-0000-4000-8000-000000000003','owner','active');

insert into public.departments (id, company_id, name) values
  ('94000000-0000-4000-8000-000000000201','94000000-0000-4000-8000-000000000101','Alpha Dept');
insert into public.positions (id, company_id, name) values
  ('94000000-0000-4000-8000-000000000301','94000000-0000-4000-8000-000000000101','Alpha Position');
insert into public.people (id, company_id, full_name) values
  ('94000000-0000-4000-8000-000000000401','94000000-0000-4000-8000-000000000101','Alpha Manager'),
  ('94000000-0000-4000-8000-000000000402','94000000-0000-4000-8000-000000000101','Alpha Approver'),
  ('94000000-0000-4000-8000-000000000403','94000000-0000-4000-8000-000000000102','Beta Person');

insert into public.recruitment_job_openings (
  id, company_id, title, description, department_id, position_id,
  requesting_manager_id, opening_reason, opening_justification, work_model,
  employment_type, status, created_by_user_id
) values (
  '94000000-0000-4000-8000-000000000501','94000000-0000-4000-8000-000000000101','Vaga Alpha','desc',
  '94000000-0000-4000-8000-000000000201','94000000-0000-4000-8000-000000000301','94000000-0000-4000-8000-000000000401',
  'headcount_growth','justificativa','remote','clt','draft','94000000-0000-4000-8000-000000000001');

-- A well-formed pending approval aggregate bound to the draft opening, with the
-- approver as the single active-stage assignee. Events are empty (the framework
-- passes real domain events in the app; save_approval_request accepts []).
create temporary table t_agg(payload jsonb) on commit drop;
insert into t_agg values (jsonb_build_object(
  'request', jsonb_build_object(
    'id','94000000-0000-4000-8000-000000000601',
    'company_id','94000000-0000-4000-8000-000000000101',
    'module','recruitment','entity_type','job_opening',
    'entity_id','94000000-0000-4000-8000-000000000501',
    'entity_version','1','snapshot_fingerprint',null,
    'requester_actor_type','user','requester_actor_id','94000000-0000-4000-8000-000000000001',
    'requester_person_id',null,'requester_display_name_snapshot',null,
    'context_schema_version','1','context_summary','Aprovação da vaga',
    'context_metadata', jsonb_build_object(), 'plan_snapshot', jsonb_build_object(),
    'status','pending','requested_at', now()::text,'expires_at',null,'completed_at',null,
    'version',1,'idempotency_key','idem-jo-501','correlation_id','94000000-0000-4000-8000-000000000501',
    'supersedes_request_id',null),
  'stages', jsonb_build_array(jsonb_build_object(
    'id','94000000-0000-4000-8000-000000000701','sequence',1,'name','Aprovação da vaga',
    'decision_rule','any','status','active','started_at', now()::text,'completed_at',null)),
  'assignments', jsonb_build_array(jsonb_build_object(
    'id','94000000-0000-4000-8000-000000000801','stage_id','94000000-0000-4000-8000-000000000701',
    'principal_type','person','principal_id','94000000-0000-4000-8000-000000000402',
    'principal_display_name_snapshot',null,'status','assigned','assigned_at', now()::text,
    'decided_at',null,'revoked_at',null)),
  'decisions', jsonb_build_array()
));
-- The aggregate fixture is read back while running as `authenticated`.
grant select on t_agg to authenticated;

-- ---------------------------------------------------------------------------
-- Behavioral, as the active Alpha owner.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- Valid submit returns the opening transitioned to pending_approval.
select is(
  (select (public.submit_tenant_job_opening_for_approval_v1(
     '94000000-0000-4000-8000-000000000101','94000000-0000-4000-8000-000000000501',
     (select payload from t_agg), '[]'::jsonb)) ->> 'status'),
  'pending_approval','submit transitions the opening to pending_approval');

-- The detail read boundary reflects the new status and approver.
select is(
  (select (public.get_tenant_job_opening_v1(
     '94000000-0000-4000-8000-000000000101','94000000-0000-4000-8000-000000000501')) ->> 'status'),
  'pending_approval','detail read boundary shows pending_approval');
select is(
  (select (public.get_tenant_job_opening_v1(
     '94000000-0000-4000-8000-000000000101','94000000-0000-4000-8000-000000000501')) ->> 'approver_id'),
  '94000000-0000-4000-8000-000000000402','detail read boundary shows the designated approver');

-- Double-submit is rejected (opening is no longer draft) -> no duplicate request.
select throws_ok(
  $$select public.submit_tenant_job_opening_for_approval_v1(
     '94000000-0000-4000-8000-000000000101','94000000-0000-4000-8000-000000000501',
     (select payload from t_agg), '[]'::jsonb)$$,
  '22023','JOB_OPENING_NOT_DRAFT','double-submit is rejected because the opening is no longer draft');
reset role;

-- Side effects verified from the setup role (authenticated cannot read these).
select is(
  (select count(*)::int from public.approval_requests
   where company_id='94000000-0000-4000-8000-000000000101' and module='recruitment'
     and entity_type='job_opening' and entity_id='94000000-0000-4000-8000-000000000501' and status='pending'),
  1,'exactly one pending approval request exists (no duplicate)');
select is(
  (select count(*)::int from public.approval_stages where approval_request_id='94000000-0000-4000-8000-000000000601'),
  1,'the approval stage was persisted');
select is(
  (select count(*)::int from public.approval_assignments where approval_request_id='94000000-0000-4000-8000-000000000601'),
  1,'the approval assignment was persisted');
select is(
  (select status from public.recruitment_job_openings where id='94000000-0000-4000-8000-000000000501'),
  'pending_approval','the opening is persisted as pending_approval');
select is(
  (select count(*)::int from public.activity_events
   where company_id='94000000-0000-4000-8000-000000000101' and activity_type='job_opening.submitted_for_approval'),
  1,'exactly one submission activity was recorded');

-- ---------------------------------------------------------------------------
-- Rejections. Reset the opening to draft to exercise validation paths.
-- ---------------------------------------------------------------------------
update public.recruitment_job_openings set status='draft', approver_id=null
  where id='94000000-0000-4000-8000-000000000501';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- Subject mismatch (aggregate entity_id points elsewhere).
select throws_ok(
  $$select public.submit_tenant_job_opening_for_approval_v1(
     '94000000-0000-4000-8000-000000000101','94000000-0000-4000-8000-000000000501',
     jsonb_set((select payload from t_agg),'{request,entity_id}','"94000000-0000-4000-8000-0000000009ff"'),
     '[]'::jsonb)$$,
  '22023','JOB_OPENING_APPROVAL_SUBMISSION_INVALID','a mismatched aggregate subject is rejected');

-- Cross-tenant approver.
select throws_ok(
  $$select public.submit_tenant_job_opening_for_approval_v1(
     '94000000-0000-4000-8000-000000000101','94000000-0000-4000-8000-000000000501',
     jsonb_set((select payload from t_agg),'{assignments,0,principal_id}','"94000000-0000-4000-8000-000000000403"'),
     '[]'::jsonb)$$,
  '23503','JOB_OPENING_APPROVER_INVALID','a cross-tenant approver is rejected');
reset role;

-- Non-member (Beta owner) denied on Alpha.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"94000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok(
  $$select public.submit_tenant_job_opening_for_approval_v1(
     '94000000-0000-4000-8000-000000000101','94000000-0000-4000-8000-000000000501',
     (select payload from t_agg), '[]'::jsonb)$$,
  '42501','TENANT_AUTHORIZATION_DENIED','a non-member is denied');
select throws_ok(
  $$select public.get_tenant_job_opening_v1(
     '94000000-0000-4000-8000-000000000101','94000000-0000-4000-8000-000000000501')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','a non-member cannot read the opening');
reset role;

-- Non-owner/admin/hr member denied.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"94000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok(
  $$select public.submit_tenant_job_opening_for_approval_v1(
     '94000000-0000-4000-8000-000000000101','94000000-0000-4000-8000-000000000501',
     (select payload from t_agg), '[]'::jsonb)$$,
  '42501','TENANT_AUTHORIZATION_DENIED','an employee-role member is denied');
reset role;

-- Unauthenticated denied.
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok(
  $$select public.submit_tenant_job_opening_for_approval_v1(
     '94000000-0000-4000-8000-000000000101','94000000-0000-4000-8000-000000000501',
     (select payload from t_agg), '[]'::jsonb)$$,
  '42501','AUTHENTICATION_REQUIRED','an unauthenticated actor is denied');
reset role;

select * from finish();
rollback;
