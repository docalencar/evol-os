begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Static contract.
-- ---------------------------------------------------------------------------
select has_function('public','get_tenant_recruitment_open_openings_v1',array['uuid']::text[]);
select has_function('public','get_tenant_recruitment_pending_approvals_v1',array['uuid']::text[]);

select is(
  (select proargnames from pg_proc where oid='public.get_tenant_recruitment_open_openings_v1(uuid)'::regprocedure),
  array['p_company_id','status','current_headcount','target_headcount']::text[],
  'open-openings contract shape is exact');
select is(
  (select proargnames from pg_proc where oid='public.get_tenant_recruitment_pending_approvals_v1(uuid)'::regprocedure),
  array['p_company_id','status']::text[],
  'pending-approvals contract shape is exact');

select ok(p.prosecdef and p.provolatile='s' and p.proconfig=array['search_path=public, pg_temp']::text[],
  p.proname||' is stable, SECURITY DEFINER with hardened search_path')
from pg_proc p where p.oid in (
  'public.get_tenant_recruitment_open_openings_v1(uuid)'::regprocedure,
  'public.get_tenant_recruitment_pending_approvals_v1(uuid)'::regprocedure
) order by p.proname;

select ok(has_function_privilege('authenticated','public.get_tenant_recruitment_open_openings_v1(uuid)','execute'),
  'authenticated may execute open-openings');
select ok(has_function_privilege('authenticated','public.get_tenant_recruitment_pending_approvals_v1(uuid)','execute'),
  'authenticated may execute pending-approvals');
select ok(not has_function_privilege('anon','public.get_tenant_recruitment_open_openings_v1(uuid)','execute'),
  'anon cannot execute open-openings');
select ok(not has_function_privilege('anon','public.get_tenant_recruitment_pending_approvals_v1(uuid)','execute'),
  'anon cannot execute pending-approvals');
select ok(not has_table_privilege('authenticated','public.recruitment_job_openings','select'),
  'authenticated still has no direct SELECT on recruitment_job_openings');
select ok(not has_table_privilege('authenticated','public.approval_requests','select'),
  'authenticated still has no direct SELECT on approval_requests');

-- ---------------------------------------------------------------------------
-- Fixtures.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('92000000-0000-4000-8000-000000000001','analytics-a@example.com'),
  ('92000000-0000-4000-8000-000000000003','analytics-b@example.com');

insert into public.companies (id, name, slug) values
  ('92000000-0000-4000-8000-000000000101','Analytics Alpha','analytics-alpha'),
  ('92000000-0000-4000-8000-000000000102','Analytics Beta','analytics-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('92000000-0000-4000-8000-000000000111','92000000-0000-4000-8000-000000000101','92000000-0000-4000-8000-000000000001','owner','active'),
  ('92000000-0000-4000-8000-000000000112','92000000-0000-4000-8000-000000000102','92000000-0000-4000-8000-000000000003','owner','active');

insert into public.departments (id, company_id, name) values
  ('92000000-0000-4000-8000-000000000201','92000000-0000-4000-8000-000000000101','Alpha Dept'),
  ('92000000-0000-4000-8000-000000000202','92000000-0000-4000-8000-000000000102','Beta Dept');

insert into public.positions (id, company_id, name) values
  ('92000000-0000-4000-8000-000000000301','92000000-0000-4000-8000-000000000101','Alpha Position'),
  ('92000000-0000-4000-8000-000000000302','92000000-0000-4000-8000-000000000102','Beta Position');

insert into public.people (id, company_id, full_name) values
  ('92000000-0000-4000-8000-000000000401','92000000-0000-4000-8000-000000000101','Alpha Manager'),
  ('92000000-0000-4000-8000-000000000402','92000000-0000-4000-8000-000000000101','Alpha Approver'),
  ('92000000-0000-4000-8000-000000000403','92000000-0000-4000-8000-000000000102','Beta Person');

-- Job openings: two Alpha open (counted; headcount 2/5 and 1/3); one Alpha draft
-- (excluded); one Alpha open-but-deleted (excluded); one Beta open (cross-tenant).
insert into public.recruitment_job_openings (
  id, company_id, title, description, department_id, position_id,
  requesting_manager_id, opening_reason, opening_justification, work_model,
  employment_type, current_headcount, target_headcount, status, approver_id,
  approved_at, deleted_at, created_by_user_id
) values
  ('92000000-0000-4000-8000-000000000501','92000000-0000-4000-8000-000000000101','Alpha Open 1','desc',
   '92000000-0000-4000-8000-000000000201','92000000-0000-4000-8000-000000000301','92000000-0000-4000-8000-000000000401',
   'headcount_growth','justificativa','remote','clt',2,5,'open','92000000-0000-4000-8000-000000000402',
   now(),null,'92000000-0000-4000-8000-000000000001'),
  ('92000000-0000-4000-8000-000000000502','92000000-0000-4000-8000-000000000101','Alpha Open 2','desc',
   '92000000-0000-4000-8000-000000000201','92000000-0000-4000-8000-000000000301','92000000-0000-4000-8000-000000000401',
   'headcount_growth','justificativa','remote','clt',1,3,'open','92000000-0000-4000-8000-000000000402',
   now(),null,'92000000-0000-4000-8000-000000000001'),
  ('92000000-0000-4000-8000-000000000503','92000000-0000-4000-8000-000000000101','Alpha Draft','desc',
   '92000000-0000-4000-8000-000000000201','92000000-0000-4000-8000-000000000301','92000000-0000-4000-8000-000000000401',
   'headcount_growth','justificativa','remote','clt',9,9,'draft',null,null,null,'92000000-0000-4000-8000-000000000001'),
  ('92000000-0000-4000-8000-000000000504','92000000-0000-4000-8000-000000000101','Alpha Open Deleted','desc',
   '92000000-0000-4000-8000-000000000201','92000000-0000-4000-8000-000000000301','92000000-0000-4000-8000-000000000401',
   'headcount_growth','justificativa','remote','clt',7,7,'open','92000000-0000-4000-8000-000000000402',
   now(),now(),'92000000-0000-4000-8000-000000000001'),
  ('92000000-0000-4000-8000-000000000505','92000000-0000-4000-8000-000000000102','Beta Open','desc',
   '92000000-0000-4000-8000-000000000202','92000000-0000-4000-8000-000000000302','92000000-0000-4000-8000-000000000403',
   'headcount_growth','justificativa','remote','clt',4,4,'open','92000000-0000-4000-8000-000000000403',
   now(),null,'92000000-0000-4000-8000-000000000003');

-- Approval requests: one Alpha pending recruitment/job_opening (counted); one
-- Alpha approved (excluded); wrong module; wrong entity_type; one Beta pending.
insert into public.approval_requests (
  id, company_id, module, entity_type, entity_id, entity_version,
  requester_actor_type, context_schema_version, context_summary, plan_snapshot,
  status, requested_at, completed_at, version, idempotency_key
) values
  ('92000000-0000-4000-8000-000000000601','92000000-0000-4000-8000-000000000101','recruitment','job_opening','e1','v1',
   'system','v1','s','{}'::jsonb,'pending',now(),null,1,'k-a1'),
  ('92000000-0000-4000-8000-000000000602','92000000-0000-4000-8000-000000000101','recruitment','job_opening','e2','v1',
   'system','v1','s','{}'::jsonb,'approved',now(),now(),1,'k-a2'),
  ('92000000-0000-4000-8000-000000000603','92000000-0000-4000-8000-000000000101','development','job_opening','e3','v1',
   'system','v1','s','{}'::jsonb,'pending',now(),null,1,'k-a3'),
  ('92000000-0000-4000-8000-000000000604','92000000-0000-4000-8000-000000000101','recruitment','position','e4','v1',
   'system','v1','s','{}'::jsonb,'pending',now(),null,1,'k-a4'),
  ('92000000-0000-4000-8000-000000000605','92000000-0000-4000-8000-000000000102','recruitment','job_opening','e5','v1',
   'system','v1','s','{}'::jsonb,'pending',now(),null,1,'k-a5');

-- ---------------------------------------------------------------------------
-- Behavioral, as the active Alpha owner.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"92000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select is(
  (select count(*)::int from public.get_tenant_recruitment_open_openings_v1('92000000-0000-4000-8000-000000000101')),
  2, 'open-openings excludes draft, deleted and cross-tenant rows');
select is(
  (select bool_and(status='open') from public.get_tenant_recruitment_open_openings_v1('92000000-0000-4000-8000-000000000101')),
  true, 'only open rows are returned');
select is(
  (select coalesce(sum(current_headcount),0)::int from public.get_tenant_recruitment_open_openings_v1('92000000-0000-4000-8000-000000000101')),
  3, 'current headcount sum is scoped to the two open Alpha openings');
select is(
  (select coalesce(sum(target_headcount),0)::int from public.get_tenant_recruitment_open_openings_v1('92000000-0000-4000-8000-000000000101')),
  8, 'target headcount sum is scoped to the two open Alpha openings');

select is(
  (select count(*)::int from public.get_tenant_recruitment_pending_approvals_v1('92000000-0000-4000-8000-000000000101')),
  1, 'pending approvals counts only pending recruitment job-opening requests');
select is(
  (select bool_and(status='pending') from public.get_tenant_recruitment_pending_approvals_v1('92000000-0000-4000-8000-000000000101')),
  true, 'only pending rows are returned');

-- Cross-tenant: an Alpha actor cannot target the Beta company.
select throws_ok(
  $$select * from public.get_tenant_recruitment_open_openings_v1('92000000-0000-4000-8000-000000000102')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','open-openings denies a non-member company target');
reset role;

-- Non-member (Beta owner) denied on Alpha.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"92000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok(
  $$select * from public.get_tenant_recruitment_pending_approvals_v1('92000000-0000-4000-8000-000000000101')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','pending-approvals denies a non-member');
reset role;

-- Unauthenticated denied.
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok(
  $$select * from public.get_tenant_recruitment_open_openings_v1('92000000-0000-4000-8000-000000000101')$$,
  '42501','AUTHENTICATION_REQUIRED','open-openings denies an unauthenticated actor');
reset role;

select * from finish();
rollback;
