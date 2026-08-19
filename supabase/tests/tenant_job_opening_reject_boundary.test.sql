begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Static contract.
-- ---------------------------------------------------------------------------
select has_function('public','reject_tenant_job_opening_v1',array['uuid','uuid','jsonb','jsonb','integer']::text[]);

select ok((select p.prosecdef and p.proconfig=array['search_path=public, pg_temp']::text[]
  from pg_proc p where p.oid='public.reject_tenant_job_opening_v1(uuid,uuid,jsonb,jsonb,integer)'::regprocedure),
  'reject boundary is SECURITY DEFINER, hardened search_path');

select ok(has_function_privilege('authenticated','public.reject_tenant_job_opening_v1(uuid,uuid,jsonb,jsonb,integer)','execute'),
  'authenticated may execute the reject boundary');
select ok(not has_function_privilege('anon','public.reject_tenant_job_opening_v1(uuid,uuid,jsonb,jsonb,integer)','execute'),
  'anon cannot execute the reject boundary');
select ok(not has_table_privilege('authenticated','public.approval_requests','select'),
  'authenticated still has no direct SELECT on approval_requests');
select ok(not has_table_privilege('authenticated','public.recruitment_job_openings','update'),
  'authenticated still has no direct UPDATE on recruitment_job_openings');
select ok(not has_table_privilege('authenticated','public.approval_decisions','insert'),
  'authenticated still has no direct INSERT on approval_decisions');
select ok(not has_table_privilege('authenticated','public.activity_events','insert'),
  'authenticated still has no direct INSERT on activity_events');

-- ---------------------------------------------------------------------------
-- Fixtures: Alpha owner (with linked person = the assigned approver), a pending
-- approval request (version 1) for a pending_approval opening; Beta foreign.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('98000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('98000000-0000-4000-8000-000000000002','employee-a@example.com'),
  ('98000000-0000-4000-8000-000000000003','owner-b@example.com');

insert into public.companies (id, name, slug) values
  ('98000000-0000-4000-8000-000000000101','RJ Alpha','rj-alpha'),
  ('98000000-0000-4000-8000-000000000102','RJ Beta','rj-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('98000000-0000-4000-8000-000000000111','98000000-0000-4000-8000-000000000101','98000000-0000-4000-8000-000000000001','owner','active'),
  ('98000000-0000-4000-8000-000000000112','98000000-0000-4000-8000-000000000101','98000000-0000-4000-8000-000000000002','employee','active'),
  ('98000000-0000-4000-8000-000000000113','98000000-0000-4000-8000-000000000102','98000000-0000-4000-8000-000000000003','owner','active');

insert into public.departments (id, company_id, name) values
  ('98000000-0000-4000-8000-000000000201','98000000-0000-4000-8000-000000000101','Alpha Dept');
insert into public.positions (id, company_id, name) values
  ('98000000-0000-4000-8000-000000000301','98000000-0000-4000-8000-000000000101','Alpha Position');
-- The owner's person is the assigned approver; current_person_id resolves to it.
insert into public.people (id, company_id, user_id, full_name) values
  ('98000000-0000-4000-8000-000000000401','98000000-0000-4000-8000-000000000101','98000000-0000-4000-8000-000000000001','Alpha Approver');

-- The opening carries the chosen approver, as the submit boundary would leave it.
insert into public.recruitment_job_openings (
  id, company_id, title, description, department_id, position_id,
  requesting_manager_id, opening_reason, opening_justification, work_model,
  employment_type, status, approver_id, created_by_user_id
) values (
  '98000000-0000-4000-8000-000000000501','98000000-0000-4000-8000-000000000101','Vaga Alpha','desc',
  '98000000-0000-4000-8000-000000000201','98000000-0000-4000-8000-000000000301','98000000-0000-4000-8000-000000000401',
  'headcount_growth','justificativa','remote','clt','pending_approval','98000000-0000-4000-8000-000000000401',
  '98000000-0000-4000-8000-000000000001');

insert into public.approval_requests (
  id, company_id, module, entity_type, entity_id, entity_version,
  requester_actor_type, requester_actor_id, context_schema_version, context_summary,
  plan_snapshot, status, requested_at, version, idempotency_key
) values (
  '98000000-0000-4000-8000-000000000601','98000000-0000-4000-8000-000000000101','recruitment','job_opening',
  '98000000-0000-4000-8000-000000000501','1','user','98000000-0000-4000-8000-000000000001','1','Aprovação da vaga',
  '{}'::jsonb,'pending',now(),1,'idem-501');

insert into public.approval_stages (
  id, approval_request_id, company_id, sequence, name, decision_rule, status, started_at
) values (
  '98000000-0000-4000-8000-000000000701','98000000-0000-4000-8000-000000000601','98000000-0000-4000-8000-000000000101',
  1,'Aprovação da vaga','any','active',now());

insert into public.approval_assignments (
  id, approval_request_id, stage_id, company_id, principal_type, principal_id, status, assigned_at
) values (
  '98000000-0000-4000-8000-000000000801','98000000-0000-4000-8000-000000000601','98000000-0000-4000-8000-000000000701',
  '98000000-0000-4000-8000-000000000101','person','98000000-0000-4000-8000-000000000401','assigned',now());

-- The decided aggregate (version 2), as the framework produces after a rejection:
-- request finished in 'rejected', the decision outcome 'rejected', history preserved.
create temporary table t_rej(payload jsonb) on commit drop;
insert into t_rej values (jsonb_build_object(
  'request', jsonb_build_object(
    'id','98000000-0000-4000-8000-000000000601','company_id','98000000-0000-4000-8000-000000000101',
    'module','recruitment','entity_type','job_opening','entity_id','98000000-0000-4000-8000-000000000501',
    'entity_version','1','snapshot_fingerprint',null,'requester_actor_type','user',
    'requester_actor_id','98000000-0000-4000-8000-000000000001','requester_person_id',null,
    'requester_display_name_snapshot',null,'context_schema_version','1','context_summary','Aprovação da vaga',
    'context_metadata',jsonb_build_object(),'plan_snapshot',jsonb_build_object(),'status','rejected',
    'requested_at',now()::text,'expires_at',null,'completed_at',now()::text,'version',2,
    'idempotency_key','idem-501','correlation_id','98000000-0000-4000-8000-000000000501','supersedes_request_id',null),
  'stages', jsonb_build_array(jsonb_build_object(
    'id','98000000-0000-4000-8000-000000000701','sequence',1,'name','Aprovação da vaga','decision_rule','any',
    'status','rejected','started_at',now()::text,'completed_at',now()::text)),
  'assignments', jsonb_build_array(jsonb_build_object(
    'id','98000000-0000-4000-8000-000000000801','stage_id','98000000-0000-4000-8000-000000000701',
    'principal_type','person','principal_id','98000000-0000-4000-8000-000000000401',
    'principal_display_name_snapshot',null,'status','decided','assigned_at',now()::text,
    'decided_at',now()::text,'revoked_at',null)),
  'decisions', jsonb_build_array(jsonb_build_object(
    'id','98000000-0000-4000-8000-000000000901','stage_id','98000000-0000-4000-8000-000000000701',
    'assignment_id','98000000-0000-4000-8000-000000000801','actor_type','user',
    'actor_id','98000000-0000-4000-8000-000000000001','actor_person_id','98000000-0000-4000-8000-000000000401',
    'actor_display_name_snapshot',null,'outcome','rejected','comment','Vaga devolvida para rascunho.',
    'decided_at',now()::text,'subject_version','1','request_version',2,'idempotency_key','dec-501'))
));
grant select on t_rej to authenticated;

-- ---------------------------------------------------------------------------
-- Behavioral, as the active Alpha owner (= the assigned approver).
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"98000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- Stale expected_version is rejected (engine optimistic concurrency), atomically.
select throws_ok(
  $$select public.reject_tenant_job_opening_v1(
     '98000000-0000-4000-8000-000000000101','98000000-0000-4000-8000-000000000501',
     (select payload from t_rej),'[]'::jsonb,0)$$,
  '40001',null,'a stale expected_version is rejected');

-- Aggregate bound to a different opening is rejected.
select throws_ok(
  $$select public.reject_tenant_job_opening_v1(
     '98000000-0000-4000-8000-000000000101','98000000-0000-4000-8000-0000000005ff',
     (select payload from t_rej),'[]'::jsonb,1)$$,
  '22023','JOB_OPENING_REJECTION_DECISION_INVALID','an aggregate bound to another opening is rejected');

-- A decision authored by someone other than the actor is rejected.
select throws_ok(
  $$select public.reject_tenant_job_opening_v1(
     '98000000-0000-4000-8000-000000000101','98000000-0000-4000-8000-000000000501',
     jsonb_set((select payload from t_rej),'{decisions,0,actor_person_id}','"98000000-0000-4000-8000-0000000004ff"'),
     '[]'::jsonb,1)$$,
  '42501','JOB_OPENING_REJECTION_ACTOR_MISMATCH','a decision authored by another person is rejected');

-- A non-rejected aggregate state is rejected (must be the finished 'rejected' state).
select throws_ok(
  $$select public.reject_tenant_job_opening_v1(
     '98000000-0000-4000-8000-000000000101','98000000-0000-4000-8000-000000000501',
     jsonb_set((select payload from t_rej),'{request,status}','"approved"'),'[]'::jsonb,1)$$,
  '22023','JOB_OPENING_REJECTION_DECISION_INVALID','a non-rejected aggregate is rejected');

-- Happy path: reject transitions the opening back to draft.
select is(
  (select (public.reject_tenant_job_opening_v1(
     '98000000-0000-4000-8000-000000000101','98000000-0000-4000-8000-000000000501',
     (select payload from t_rej),'[]'::jsonb,1)) ->> 'status'),
  'draft','reject transitions the opening back to draft');

-- Double-reject is rejected (opening no longer pending_approval) — idempotent.
select throws_ok(
  $$select public.reject_tenant_job_opening_v1(
     '98000000-0000-4000-8000-000000000101','98000000-0000-4000-8000-000000000501',
     (select payload from t_rej),'[]'::jsonb,1)$$,
  '22023','JOB_OPENING_NOT_PENDING_APPROVAL','double-reject is rejected');
reset role;

-- Side effects verified from the setup role.
select is((select status from public.approval_requests where id='98000000-0000-4000-8000-000000000601'),
  'rejected','the approval request is rejected');
select is((select version from public.approval_requests where id='98000000-0000-4000-8000-000000000601'),
  2,'the aggregate version advanced to 2');
select is((select count(*)::int from public.approval_decisions where approval_request_id='98000000-0000-4000-8000-000000000601'),
  1,'exactly one decision was persisted (history preserved)');
select is((select outcome from public.approval_decisions where approval_request_id='98000000-0000-4000-8000-000000000601'),
  'rejected','the persisted decision records the rejection');
select is((select status from public.recruitment_job_openings where id='98000000-0000-4000-8000-000000000501'),
  'draft','the opening is persisted back as draft');
select ok((select approver_id is null from public.recruitment_job_openings where id='98000000-0000-4000-8000-000000000501'),
  'approver_id is cleared on rejection');
select ok((select approved_at is null from public.recruitment_job_openings where id='98000000-0000-4000-8000-000000000501'),
  'approved_at is cleared on rejection');
select is((select count(*)::int from public.activity_events
   where company_id='98000000-0000-4000-8000-000000000101' and activity_type='job_opening.rejected'),
  1,'exactly one rejection activity was recorded');

-- Non-owner/admin/hr member denied.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"98000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok(
  $$select public.reject_tenant_job_opening_v1(
     '98000000-0000-4000-8000-000000000101','98000000-0000-4000-8000-000000000501',
     (select payload from t_rej),'[]'::jsonb,1)$$,
  '42501','TENANT_AUTHORIZATION_DENIED','an employee-role member cannot reject');
reset role;

-- Non-member denied.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"98000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok(
  $$select public.reject_tenant_job_opening_v1(
     '98000000-0000-4000-8000-000000000101','98000000-0000-4000-8000-000000000501',
     (select payload from t_rej),'[]'::jsonb,1)$$,
  '42501','TENANT_AUTHORIZATION_DENIED','a non-member cannot reject');
reset role;

-- Unauthenticated denied.
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok(
  $$select public.reject_tenant_job_opening_v1(
     '98000000-0000-4000-8000-000000000101','98000000-0000-4000-8000-000000000501',
     (select payload from t_rej),'[]'::jsonb,1)$$,
  '42501','AUTHENTICATION_REQUIRED','an unauthenticated actor cannot reject');
reset role;

select * from finish();
rollback;
