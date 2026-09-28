-- E-DB1 — trusted aggregated Assessment summary read, company scope (0141).
--
-- Proves the eight properties the slice requires, at the boundary itself:
-- authorized aggregate read, tenant isolation, unauthorized actor, non-oracular
-- denial, factual correctness across distinct employee states, aggregation in one
-- call, audit cardinality of exactly one event per read, and fail-closed.
--
-- Payload is asserted to be aggregates only: no response, answer, score, name or
-- email may leave this boundary.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Shape and posture
-- ---------------------------------------------------------------------------
select has_function('public', 'get_company_assessment_summary_v1', array['uuid', 'text']);

select ok(
  (select p.prosecdef and p.proconfig = array['search_path=public, pg_temp']
     from pg_proc p
    where p.oid = 'public.get_company_assessment_summary_v1(uuid,text)'::regprocedure),
  'the boundary is SECURITY DEFINER with a fixed search_path');

select ok(
  has_function_privilege('authenticated',
    'public.get_company_assessment_summary_v1(uuid,text)', 'EXECUTE'),
  'authenticated may execute the boundary');

select ok(
  (select bool_and(not has_function_privilege(role,
     'public.get_company_assessment_summary_v1(uuid,text)', 'EXECUTE'))
     from unnest(array['public', 'anon', 'service_role']) role),
  'PUBLIC, anon and service_role may not execute the boundary');

-- The payload must be aggregates only. A column named after a response, answer,
-- score or identity would mean the boundary leaks more than the consumer needs.
select is(
  (select array_agg(p.proargnames[i] order by i)::text[]
     from pg_proc p, generate_subscripts(p.proargnames, 1) i
    where p.oid = 'public.get_company_assessment_summary_v1(uuid,text)'::regprocedure
      and p.proargmodes[i] = 't'),
  array['employee_id', 'completed_assessments', 'pending_assessments',
        'latest_completed_at']::text[],
  'the boundary returns aggregates only — no response, answer, score or identity');

-- ---------------------------------------------------------------------------
-- Fixture: two tenants, distinct employee states
-- ---------------------------------------------------------------------------
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
 ('11000000-0000-4000-8000-000000000001','authenticated','authenticated','edb1-owner@test.local','',now(),now(),now()),
 ('11000000-0000-4000-8000-000000000002','authenticated','authenticated','edb1-hr@test.local','',now(),now(),now()),
 ('11000000-0000-4000-8000-000000000003','authenticated','authenticated','edb1-manager@test.local','',now(),now(),now()),
 ('11000000-0000-4000-8000-000000000004','authenticated','authenticated','edb1-employee@test.local','',now(),now(),now()),
 ('11000000-0000-4000-8000-000000000005','authenticated','authenticated','edb1-b-owner@test.local','',now(),now(),now()),
 ('11000000-0000-4000-8000-000000000006','authenticated','authenticated','edb1-nomember@test.local','',now(),now(),now());

insert into public.companies (id, name, slug) values
 ('12000000-0000-4000-8000-000000000001','E-DB1 Alpha','e-db1-alpha'),
 ('12000000-0000-4000-8000-000000000002','E-DB1 Beta','e-db1-beta');

insert into public.company_members (company_id, user_id, role) values
 ('12000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','owner'),
 ('12000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002','hr'),
 ('12000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000003','manager'),
 ('12000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000004','employee'),
 ('12000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000005','owner');

-- Subjects: A completed, B pending only, C multiple, D none at all.
--
-- Three evaluators exist because `assessment_responses_unique_assignment_idx`
-- (0031) makes (cycle, template, employee, evaluator) unique: an employee with
-- several responses in one cycle necessarily has several evaluators, which is
-- also what a 360 actually looks like. Evaluators are never subjects here, so
-- they must not appear in the aggregate.
insert into public.people (id, company_id, user_id, full_name) values
 ('13000000-0000-4000-8000-0000000000e1','12000000-0000-4000-8000-000000000001',null,'Evaluator One'),
 ('13000000-0000-4000-8000-0000000000e2','12000000-0000-4000-8000-000000000001',null,'Evaluator Two'),
 ('13000000-0000-4000-8000-0000000000e3','12000000-0000-4000-8000-000000000001',null,'Evaluator Three'),
 ('13000000-0000-4000-8000-00000000000a','12000000-0000-4000-8000-000000000001',null,'Subject A'),
 ('13000000-0000-4000-8000-00000000000b','12000000-0000-4000-8000-000000000001',null,'Subject B'),
 ('13000000-0000-4000-8000-00000000000c','12000000-0000-4000-8000-000000000001',null,'Subject C'),
 ('13000000-0000-4000-8000-00000000000d','12000000-0000-4000-8000-000000000001',null,'Subject D'),
 ('13000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','Owner'),
 ('13000000-0000-4000-8000-000000000002','12000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002','HR'),
 ('13000000-0000-4000-8000-000000000003','12000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000003','Manager'),
 ('13000000-0000-4000-8000-000000000004','12000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000004','Employee'),
 ('13000000-0000-4000-8000-0000000000f1','12000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000005','Beta Owner'),
 ('13000000-0000-4000-8000-0000000000f2','12000000-0000-4000-8000-000000000002',null,'Beta Subject');

insert into public.assessment_templates (id, company_id, name, type, status) values
 ('14000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','T Alpha','360','active'),
 ('14000000-0000-4000-8000-000000000002','12000000-0000-4000-8000-000000000002','T Beta','360','active');

insert into public.assessment_cycles (id, company_id, name, assessment_template_id, start_date, end_date, assessment_visibility) values
 ('15000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','C Alpha','14000000-0000-4000-8000-000000000001',current_date,current_date+1,'full'),
 ('15000000-0000-4000-8000-000000000002','12000000-0000-4000-8000-000000000002','C Beta','14000000-0000-4000-8000-000000000002',current_date,current_date+1,'full');

insert into public.assessment_execution_snapshots (id, company_id, assessment_cycle_id, source_assessment_template_id, template_name, template_type, capture_origin) values
 ('16000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000001','T Alpha','360','legacy_backfill_current_state'),
 ('16000000-0000-4000-8000-000000000002','12000000-0000-4000-8000-000000000002','15000000-0000-4000-8000-000000000002','14000000-0000-4000-8000-000000000002','T Beta','360','legacy_backfill_current_state');

-- A: one completed. B: one draft + one submitted, none completed.
-- C: two completed at different times + one in_progress. D: nothing.
insert into public.assessment_responses (
  id, company_id, assessment_cycle_id, assessment_template_id,
  assessment_execution_snapshot_id, employee_id, evaluator_id, status, perspective, completed_at
) values
 ('17000000-0000-4000-8000-00000000000a','12000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-00000000000a','13000000-0000-4000-8000-0000000000e1','completed','legacy_unknown','2026-03-01T10:00:00Z'),
 ('17000000-0000-4000-8000-00000000000b','12000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-00000000000b','13000000-0000-4000-8000-0000000000e1','draft','legacy_unknown',null),
 ('17000000-0000-4000-8000-00000000000e','12000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-00000000000b','13000000-0000-4000-8000-0000000000e2','submitted','legacy_unknown',null),
 ('17000000-0000-4000-8000-00000000000c','12000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-00000000000c','13000000-0000-4000-8000-0000000000e1','completed','legacy_unknown','2026-01-15T09:00:00Z'),
 ('17000000-0000-4000-8000-00000000000f','12000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-00000000000c','13000000-0000-4000-8000-0000000000e2','completed','legacy_unknown','2026-05-20T08:30:00Z'),
 ('17000000-0000-4000-8000-000000000010','12000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-00000000000c','13000000-0000-4000-8000-0000000000e3','in_progress','legacy_unknown',null),
 ('17000000-0000-4000-8000-0000000000f1','12000000-0000-4000-8000-000000000002','15000000-0000-4000-8000-000000000002','14000000-0000-4000-8000-000000000002','16000000-0000-4000-8000-000000000002','13000000-0000-4000-8000-0000000000f2','13000000-0000-4000-8000-0000000000f1','completed','legacy_unknown','2026-04-04T12:00:00Z');

-- ---------------------------------------------------------------------------
-- TEST 1 + 5 + 6 — authorized aggregate read, factual correctness, one call
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select results_eq(
  $$select employee_id, completed_assessments, pending_assessments, latest_completed_at
      from public.get_company_assessment_summary_v1(
        '12000000-0000-4000-8000-000000000001', 'employee_intelligence_list')
     order by employee_id$$,
  $$values
     ('13000000-0000-4000-8000-00000000000a'::uuid, 1, 0, '2026-03-01T10:00:00Z'::timestamptz),
     ('13000000-0000-4000-8000-00000000000b'::uuid, 0, 2, null::timestamptz),
     ('13000000-0000-4000-8000-00000000000c'::uuid, 2, 1, '2026-05-20T08:30:00Z'::timestamptz)$$,
  'one aggregated call distinguishes completed, pending-only and multiple-assessment employees');

-- An employee with no assessment at all is simply absent; the consumer treats
-- absence as no facts, and the boundary never invents a zero row for them.
select is(
  (select count(*) from public.get_company_assessment_summary_v1(
     '12000000-0000-4000-8000-000000000001','employee_intelligence_list')
    where employee_id = '13000000-0000-4000-8000-00000000000d'),
  0::bigint,
  'an employee with no assessment produces no row rather than a fabricated zero');

-- ---------------------------------------------------------------------------
-- TEST 2 — tenant isolation
-- ---------------------------------------------------------------------------
select is(
  (select count(*) from public.get_company_assessment_summary_v1(
     '12000000-0000-4000-8000-000000000001','employee_intelligence_list')
    where employee_id = '13000000-0000-4000-8000-0000000000f2'),
  0::bigint,
  'tenant B subjects never appear in a tenant A read');

select throws_ok(
  $$select * from public.get_company_assessment_summary_v1(
      '12000000-0000-4000-8000-000000000002','employee_intelligence_list')$$,
  'ADMINISTRATIVE_READ_FORBIDDEN',
  'a tenant A owner cannot read tenant B by passing its company id');

-- ---------------------------------------------------------------------------
-- TEST 3 — unauthorized actors
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok(
  $$select * from public.get_company_assessment_summary_v1(
      '12000000-0000-4000-8000-000000000001','employee_intelligence_list')$$,
  'ADMINISTRATIVE_READ_FORBIDDEN', 'manager is not an administrative reader');

select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok(
  $$select * from public.get_company_assessment_summary_v1(
      '12000000-0000-4000-8000-000000000001','employee_intelligence_list')$$,
  'ADMINISTRATIVE_READ_FORBIDDEN', 'employee is not an administrative reader');

select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select throws_ok(
  $$select * from public.get_company_assessment_summary_v1(
      '12000000-0000-4000-8000-000000000001','employee_intelligence_list')$$,
  'ADMINISTRATIVE_READ_FORBIDDEN', 'an actor with no membership is refused');

-- Null auth context. The ACL assertion above already closes anon out of the
-- function entirely; this exercises the INTERNAL guard from a context that may
-- invoke it but carries no `sub`, so auth.uid() is null. Pattern taken from
-- tenant_person_assessment_result_directory. No grant is broadened, and the role
-- is deliberately not reset to a superuser — under postgres the claims set above
-- would still be in force and auth.uid() would not be null, so the test would
-- prove nothing.
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok(
  $$select * from public.get_company_assessment_summary_v1(
      '12000000-0000-4000-8000-000000000001','employee_intelligence_list')$$,
  'AUTH_REQUIRED', 'a null auth context is refused before any read');

-- hr is administrative and must succeed, so the refusals above are about
-- capability and not about the boundary being unusable.
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(
  (select count(*) from public.get_company_assessment_summary_v1(
     '12000000-0000-4000-8000-000000000001','employee_intelligence_list')),
  3::bigint, 'hr is an administrative reader and sees the same aggregate');

-- ---------------------------------------------------------------------------
-- TEST 4 — non-oracular denial
-- ---------------------------------------------------------------------------
-- A tenant the actor may not read and a company id that does not exist must be
-- indistinguishable: same errcode, same message, no cardinality disclosed.
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok(
  $$select * from public.get_company_assessment_summary_v1(
      '12000000-0000-4000-8000-000000000002','employee_intelligence_list')$$,
  'ADMINISTRATIVE_READ_FORBIDDEN', 'foreign tenant is refused');
select throws_ok(
  $$select * from public.get_company_assessment_summary_v1(
      '12000000-0000-4000-8000-0000000000ff','employee_intelligence_list')$$,
  'ADMINISTRATIVE_READ_FORBIDDEN',
  'a nonexistent company is refused identically — existence is not disclosed');

-- ---------------------------------------------------------------------------
-- TEST 7 — audit cardinality: ONE event per aggregated read, not one per employee
-- ---------------------------------------------------------------------------
reset role;
create temporary table e_db1_audit_events_before on commit drop as
select id
  from public.activity_events
 where company_id = '12000000-0000-4000-8000-000000000001'
   and activity_type = 'assessments.administrative_read';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select count(*) from public.get_company_assessment_summary_v1(
  '12000000-0000-4000-8000-000000000001','employee_intelligence_list');

reset role;
create temporary table e_db1_new_audit_events on commit drop as
select event.*
  from public.activity_events event
 where event.company_id = '12000000-0000-4000-8000-000000000001'
   and event.activity_type = 'assessments.administrative_read'
   and not exists (
     select 1
       from e_db1_audit_events_before before_event
      where before_event.id = event.id
   );

select is(
  (select count(*) from e_db1_new_audit_events),
  1::bigint,
  'one aggregated read writes exactly one audit event, not one per employee');

-- The three assertions below are deliberately `limit 1` rather than scalar
-- subqueries: when the cardinality property is broken they would otherwise raise
-- "more than one row", abort the transaction, and bury the one assertion that
-- actually names the defect under a cascade of unrelated failures.
select is(
  (select entity_type from e_db1_new_audit_events
    order by id limit 1),
  'assessment_company_summary',
  'the audit event names the aggregated company scope');

select is(
  (select metadata->>'reason' from e_db1_new_audit_events
    order by id limit 1),
  'employee_intelligence_list',
  'the caller reason is recorded verbatim');

select is(
  (select visibility from e_db1_new_audit_events
    order by id limit 1),
  'restricted', 'the audit event stays restricted');

-- ---------------------------------------------------------------------------
-- TEST 8 — fail closed: a refused or malformed call raises, never returns empty
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select throws_ok(
  $$select * from public.get_company_assessment_summary_v1(
      '12000000-0000-4000-8000-000000000001', null)$$,
  'ADMINISTRATIVE_READ_REASON_REQUIRED',
  'a missing reason raises rather than returning an empty set');
select throws_ok(
  $$select * from public.get_company_assessment_summary_v1(
      '12000000-0000-4000-8000-000000000001', 'Bad Reason!')$$,
  'ADMINISTRATIVE_READ_REASON_REQUIRED',
  'a malformed reason raises rather than returning an empty set');
select throws_ok(
  $$select * from public.get_company_assessment_summary_v1(null, 'employee_intelligence_list')$$,
  '22023', 'ASSESSMENT_SUMMARY_COMPANY_REQUIRED',
  'a null company id raises ASSESSMENT_SUMMARY_COMPANY_REQUIRED');

-- ---------------------------------------------------------------------------
-- COMPATIBILITY — the existing scopes are untouched
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select public.read_assessment_administratively(
      '12000000-0000-4000-8000-000000000001','company',
      '12000000-0000-4000-8000-000000000001','employee_intelligence_list')$$,
  'ASSESSMENT_ADMINISTRATIVE_SCOPE_INVALID',
  '0062 still refuses a company scope — this slice did not widen it');

select ok(
  (public.read_assessment_administratively(
     '12000000-0000-4000-8000-000000000001','employee',
     '13000000-0000-4000-8000-00000000000a','characterize_existing_scope')
   ->'responses') is not null,
  'the existing employee scope still returns its response payload');

select * from finish();
rollback;
