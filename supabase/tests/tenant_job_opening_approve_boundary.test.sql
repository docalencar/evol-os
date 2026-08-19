begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Static contract.
-- ---------------------------------------------------------------------------
select has_function('public','get_tenant_job_opening_pending_approval_v1',array['uuid','uuid']::text[]);
select has_function('public','approve_tenant_job_opening_v1',array['uuid','uuid','jsonb','jsonb','integer']::text[]);

select ok((select p.prosecdef and p.provolatile='s' and p.proconfig=array['search_path=public, pg_temp']::text[]
  from pg_proc p where p.oid='public.get_tenant_job_opening_pending_approval_v1(uuid,uuid)'::regprocedure),
  'read boundary is stable, SECURITY DEFINER, hardened search_path');
select ok((select p.prosecdef and p.proconfig=array['search_path=public, pg_temp']::text[]
  from pg_proc p where p.oid='public.approve_tenant_job_opening_v1(uuid,uuid,jsonb,jsonb,integer)'::regprocedure),
  'approve boundary is SECURITY DEFINER, hardened search_path');

select ok(has_function_privilege('authenticated','public.get_tenant_job_opening_pending_approval_v1(uuid,uuid)','execute'),
  'authenticated may execute the read boundary');
select ok(has_function_privilege('authenticated','public.approve_tenant_job_opening_v1(uuid,uuid,jsonb,jsonb,integer)','execute'),
  'authenticated may execute the approve boundary');
select ok(not has_function_privilege('anon','public.get_tenant_job_opening_pending_approval_v1(uuid,uuid)','execute'),
  'anon cannot execute the read boundary');
select ok(not has_function_privilege('anon','public.approve_tenant_job_opening_v1(uuid,uuid,jsonb,jsonb,integer)','execute'),
  'anon cannot execute the approve boundary');
select ok(not has_table_privilege('authenticated','public.approval_requests','select'),
  'authenticated still has no direct SELECT on approval_requests');
select ok(not has_table_privilege('authenticated','public.recruitment_job_openings','update'),
  'authenticated still has no direct UPDATE on recruitment_job_openings');
select ok(not has_table_privilege('authenticated','public.approval_decisions','insert'),
  'authenticated still has no direct INSERT on approval_decisions');

-- ---------------------------------------------------------------------------
-- Fixtures: Alpha owner (with linked person = the assigned approver), a pending
-- approval request (version 1) for a pending_approval opening; Beta foreign.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('96000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('96000000-0000-4000-8000-000000000002','employee-a@example.com'),
  ('96000000-0000-4000-8000-000000000003','owner-b@example.com');

insert into public.companies (id, name, slug) values
  ('96000000-0000-4000-8000-000000000101','AP Alpha','ap-alpha'),
  ('96000000-0000-4000-8000-000000000102','AP Beta','ap-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('96000000-0000-4000-8000-000000000111','96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000001','owner','active'),
  ('96000000-0000-4000-8000-000000000112','96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000002','employee','active'),
  ('96000000-0000-4000-8000-000000000113','96000000-0000-4000-8000-000000000102','96000000-0000-4000-8000-000000000003','owner','active');

insert into public.departments (id, company_id, name) values
  ('96000000-0000-4000-8000-000000000201','96000000-0000-4000-8000-000000000101','Alpha Dept');
insert into public.positions (id, company_id, name) values
  ('96000000-0000-4000-8000-000000000301','96000000-0000-4000-8000-000000000101','Alpha Position');
-- The owner's person is the assigned approver; current_person_id resolves to it.
insert into public.people (id, company_id, user_id, full_name) values
  ('96000000-0000-4000-8000-000000000401','96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000001','Alpha Approver');

insert into public.recruitment_job_openings (
  id, company_id, title, description, department_id, position_id,
  requesting_manager_id, opening_reason, opening_justification, work_model,
  employment_type, status, approver_id, created_by_user_id
) values (
  '96000000-0000-4000-8000-000000000501','96000000-0000-4000-8000-000000000101','Vaga Alpha','desc',
  '96000000-0000-4000-8000-000000000201','96000000-0000-4000-8000-000000000301','96000000-0000-4000-8000-000000000401',
  'headcount_growth','justificativa','remote','clt','pending_approval','96000000-0000-4000-8000-000000000401',
  '96000000-0000-4000-8000-000000000001');

insert into public.approval_requests (
  id, company_id, module, entity_type, entity_id, entity_version,
  requester_actor_type, requester_actor_id, context_schema_version, context_summary,
  plan_snapshot, status, requested_at, version, idempotency_key
) values (
  '96000000-0000-4000-8000-000000000601','96000000-0000-4000-8000-000000000101','recruitment','job_opening',
  '96000000-0000-4000-8000-000000000501','1','user','96000000-0000-4000-8000-000000000001','1','Aprovação da vaga',
  '{}'::jsonb,'pending',now(),1,'idem-501');

insert into public.approval_stages (
  id, approval_request_id, company_id, sequence, name, decision_rule, status, started_at
) values (
  '96000000-0000-4000-8000-000000000701','96000000-0000-4000-8000-000000000601','96000000-0000-4000-8000-000000000101',
  1,'Aprovação da vaga','any','active',now());

insert into public.approval_assignments (
  id, approval_request_id, stage_id, company_id, principal_type, principal_id, status, assigned_at
) values (
  '96000000-0000-4000-8000-000000000801','96000000-0000-4000-8000-000000000601','96000000-0000-4000-8000-000000000701',
  '96000000-0000-4000-8000-000000000101','person','96000000-0000-4000-8000-000000000401','assigned',now());

-- The decided aggregate (version 2), as the framework would produce after approve.
create temporary table t_dec(payload jsonb) on commit drop;
insert into t_dec values (jsonb_build_object(
  'request', jsonb_build_object(
    'id','96000000-0000-4000-8000-000000000601','company_id','96000000-0000-4000-8000-000000000101',
    'module','recruitment','entity_type','job_opening','entity_id','96000000-0000-4000-8000-000000000501',
    'entity_version','1','snapshot_fingerprint',null,'requester_actor_type','user',
    'requester_actor_id','96000000-0000-4000-8000-000000000001','requester_person_id',null,
    'requester_display_name_snapshot',null,'context_schema_version','1','context_summary','Aprovação da vaga',
    'context_metadata',jsonb_build_object(),'plan_snapshot',jsonb_build_object(),'status','approved',
    'requested_at',now()::text,'expires_at',null,'completed_at',now()::text,'version',2,
    'idempotency_key','idem-501','correlation_id','96000000-0000-4000-8000-000000000501','supersedes_request_id',null),
  'stages', jsonb_build_array(jsonb_build_object(
    'id','96000000-0000-4000-8000-000000000701','sequence',1,'name','Aprovação da vaga','decision_rule','any',
    'status','approved','started_at',now()::text,'completed_at',now()::text)),
  'assignments', jsonb_build_array(jsonb_build_object(
    'id','96000000-0000-4000-8000-000000000801','stage_id','96000000-0000-4000-8000-000000000701',
    'principal_type','person','principal_id','96000000-0000-4000-8000-000000000401',
    'principal_display_name_snapshot',null,'status','decided','assigned_at',now()::text,
    'decided_at',now()::text,'revoked_at',null)),
  'decisions', jsonb_build_array(jsonb_build_object(
    'id','96000000-0000-4000-8000-000000000901','stage_id','96000000-0000-4000-8000-000000000701',
    'assignment_id','96000000-0000-4000-8000-000000000801','actor_type','user',
    'actor_id','96000000-0000-4000-8000-000000000001','actor_person_id','96000000-0000-4000-8000-000000000401',
    'actor_display_name_snapshot',null,'outcome','approved','comment',null,'decided_at',now()::text,
    'subject_version','1','request_version',2,'idempotency_key','dec-501'))
));
grant select on t_dec to authenticated;

-- ---------------------------------------------------------------------------
-- Behavioral, as the active Alpha owner (= the assigned approver).
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"96000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- Read boundary returns the pending aggregate. It is the
-- ApprovalRequestPersistenceRecord shape: the approval_requests columns at the
-- TOP LEVEL (via to_jsonb(request)) plus nested approval_stages/approval_decisions
-- siblings — there is no 'request' wrapper (that only exists in the write payload).
select is(
  (select (public.get_tenant_job_opening_pending_approval_v1(
     '96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000501')) ->> 'id'),
  '96000000-0000-4000-8000-000000000601','read boundary returns the pending approval request');
select is(
  (select jsonb_array_length((public.get_tenant_job_opening_pending_approval_v1(
     '96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000501')) -> 'approval_stages')),
  1,'read boundary nests the approval stage');
select is(
  (select jsonb_array_length((public.get_tenant_job_opening_pending_approval_v1(
     '96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000501')) -> 'approval_stages' -> 0 -> 'approval_assignments')),
  1,'read boundary nests the stage assignment');

-- Stale expected_version is rejected (engine optimistic concurrency), atomically.
select throws_ok(
  $$select public.approve_tenant_job_opening_v1(
     '96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000501',
     (select payload from t_dec),'[]'::jsonb,0)$$,
  '40001',null,'a stale expected_version is rejected');

-- Aggregate bound to a different opening is rejected.
select throws_ok(
  $$select public.approve_tenant_job_opening_v1(
     '96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-0000000005ff',
     (select payload from t_dec),'[]'::jsonb,1)$$,
  '22023','JOB_OPENING_APPROVAL_DECISION_INVALID','an aggregate bound to another opening is rejected');

-- A decision authored by someone other than the actor is rejected.
select throws_ok(
  $$select public.approve_tenant_job_opening_v1(
     '96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000501',
     jsonb_set((select payload from t_dec),'{decisions,0,actor_person_id}','"96000000-0000-4000-8000-0000000004ff"'),
     '[]'::jsonb,1)$$,
  '42501','JOB_OPENING_APPROVAL_ACTOR_MISMATCH','a decision authored by another person is rejected');

-- A non-approved aggregate state is rejected.
select throws_ok(
  $$select public.approve_tenant_job_opening_v1(
     '96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000501',
     jsonb_set((select payload from t_dec),'{request,status}','"pending"'),'[]'::jsonb,1)$$,
  '22023','JOB_OPENING_APPROVAL_DECISION_INVALID','a non-approved aggregate is rejected');

-- Happy path: approve transitions the opening to approved.
select is(
  (select (public.approve_tenant_job_opening_v1(
     '96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000501',
     (select payload from t_dec),'[]'::jsonb,1)) ->> 'status'),
  'approved','approve transitions the opening to approved');

-- Double-approve is rejected (opening no longer pending_approval) — idempotent.
select throws_ok(
  $$select public.approve_tenant_job_opening_v1(
     '96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000501',
     (select payload from t_dec),'[]'::jsonb,1)$$,
  '22023','JOB_OPENING_NOT_PENDING_APPROVAL','double-approve is rejected');
reset role;

-- Side effects verified from the setup role.
select is((select status from public.approval_requests where id='96000000-0000-4000-8000-000000000601'),
  'approved','the approval request is approved');
select is((select version from public.approval_requests where id='96000000-0000-4000-8000-000000000601'),
  2,'the aggregate version advanced to 2');
select is((select count(*)::int from public.approval_decisions where approval_request_id='96000000-0000-4000-8000-000000000601'),
  1,'exactly one decision was persisted');
select is((select status from public.recruitment_job_openings where id='96000000-0000-4000-8000-000000000501'),
  'approved','the opening is persisted as approved');
select is((select approver_id from public.recruitment_job_openings where id='96000000-0000-4000-8000-000000000501'),
  '96000000-0000-4000-8000-000000000401','the approver is recorded');
select ok((select approved_at is not null from public.recruitment_job_openings where id='96000000-0000-4000-8000-000000000501'),
  'approved_at is set');
select is((select count(*)::int from public.activity_events
   where company_id='96000000-0000-4000-8000-000000000101' and activity_type='job_opening.approved'),
  1,'exactly one approval activity was recorded');

-- Non-owner/admin/hr member denied.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"96000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok(
  $$select public.approve_tenant_job_opening_v1(
     '96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000501',
     (select payload from t_dec),'[]'::jsonb,1)$$,
  '42501','TENANT_AUTHORIZATION_DENIED','an employee-role member cannot approve');
reset role;

-- Non-member denied (read + approve).
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"96000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok(
  $$select public.get_tenant_job_opening_pending_approval_v1(
     '96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000501')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','a non-member cannot read the aggregate');
reset role;

-- Unauthenticated denied.
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok(
  $$select public.approve_tenant_job_opening_v1(
     '96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000501',
     (select payload from t_dec),'[]'::jsonb,1)$$,
  '42501','AUTHENTICATION_REQUIRED','an unauthenticated actor cannot approve');
reset role;

select * from finish();
rollback;
