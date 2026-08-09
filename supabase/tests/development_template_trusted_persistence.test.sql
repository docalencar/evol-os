begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(34);

insert into auth.users (id, email) values
  ('69000000-0000-4000-8000-000000000001', 'phase3-hr@example.com'),
  ('69000000-0000-4000-8000-000000000002', 'phase3-employee@example.com');

insert into public.companies (id, name, slug) values
  ('69000000-0000-4000-8000-000000000101', 'Phase 3 Company', 'phase-3-company');

insert into public.company_members (company_id, user_id, role) values
  ('69000000-0000-4000-8000-000000000101', '69000000-0000-4000-8000-000000000001', 'hr'),
  ('69000000-0000-4000-8000-000000000101', '69000000-0000-4000-8000-000000000002', 'employee');

insert into public.people (id, company_id, user_id, full_name) values
  ('69000000-0000-4000-8000-000000000201', '69000000-0000-4000-8000-000000000101', '69000000-0000-4000-8000-000000000002', 'Phase 3 Employee');

insert into public.competencies (
  id, company_id, name, description, category, expected_level
) values (
  '69000000-0000-4000-8000-000000000301',
  '69000000-0000-4000-8000-000000000101',
  'Phase 3 Competency',
  'Trusted persistence competency',
  'technical',
  3
);

insert into public.employee_competencies (
  company_id, employee_id, competency_id, current_level
) values (
  '69000000-0000-4000-8000-000000000101',
  '69000000-0000-4000-8000-000000000201',
  '69000000-0000-4000-8000-000000000301',
  1
);

insert into public.development_templates (
  id, company_id, name, scope, suggested_duration_days, active, created_by
) values (
  '69000000-0000-4000-8000-000000000401',
  '69000000-0000-4000-8000-000000000101',
  'Phase 3 Template',
  'company',
  30,
  false,
  '69000000-0000-4000-8000-000000000001'
);

insert into public.development_template_versions (
  id, template_id, company_id, scope, version_number, status, name,
  suggested_duration_days, created_by
) values (
  '69000000-0000-4000-8000-000000000501',
  '69000000-0000-4000-8000-000000000401',
  '69000000-0000-4000-8000-000000000101',
  'company',
  1,
  'draft',
  'Phase 3 Template',
  30,
  '69000000-0000-4000-8000-000000000001'
);

insert into public.development_template_version_goals (
  id, template_version_id, company_id, competency_id, description,
  suggested_target_level, order_index
) values (
  '69000000-0000-4000-8000-000000000601',
  '69000000-0000-4000-8000-000000000501',
  '69000000-0000-4000-8000-000000000101',
  '69000000-0000-4000-8000-000000000301',
  'Phase 3 Goal',
  3,
  0
);

insert into public.development_template_version_actions (
  id, template_version_goal_id, title, description, type,
  suggested_due_days, order_index
) values (
  '69000000-0000-4000-8000-000000000701',
  '69000000-0000-4000-8000-000000000601',
  'Phase 3 Action',
  'Complete the action',
  'course',
  10,
  0
);

update public.development_template_versions
set status = 'published',
    published_by = '69000000-0000-4000-8000-000000000001',
    published_at = '2026-08-08T10:00:00Z'
where id = '69000000-0000-4000-8000-000000000501';

create function pg_temp.phase3_resolution(
  p_application_id uuid,
  p_idempotency_key text,
  p_fingerprint text,
  p_actor_user_id uuid default '69000000-0000-4000-8000-000000000001',
  p_goal_description text default 'Phase 3 Goal'
)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'fingerprint', p_fingerprint,
    'snapshot', jsonb_build_object(
      'formatVersion', 1,
      'application', jsonb_build_object(
        'id', p_application_id,
        'companyId', '69000000-0000-4000-8000-000000000101',
        'actorUserId', p_actor_user_id,
        'technicalPrincipal', 'service_role',
        'idempotencyKey', p_idempotency_key,
        'correlationId', '69000000-0000-4000-8000-000000000801',
        'effectiveAt', '2026-08-08T12:00:00.000Z'
      ),
      'template', jsonb_build_object(
        'id', '69000000-0000-4000-8000-000000000401',
        'versionId', '69000000-0000-4000-8000-000000000501',
        'versionNumber', 1,
        'scope', 'company',
        'companyId', '69000000-0000-4000-8000-000000000101',
        'name', 'Phase 3 Template',
        'description', null,
        'suggestedDurationDays', 30
      ),
      'plan', jsonb_build_object(
        'employeeId', '69000000-0000-4000-8000-000000000201',
        'ownerId', null,
        'priority', 'medium',
        'startDate', '2026-08-08',
        'dueDate', '2026-09-07'
      ),
      'goals', jsonb_build_array(jsonb_build_object(
        'sourceGoalId', '69000000-0000-4000-8000-000000000601',
        'description', p_goal_description,
        'orderIndex', 0,
        'suggestedTargetLevel', 3,
        'currentLevel', 1,
        'expectedLevel', 3,
        'appliedTargetLevel', 3,
        'competency', jsonb_build_object(
          'id', '69000000-0000-4000-8000-000000000301',
          'companyId', '69000000-0000-4000-8000-000000000101',
          'name', 'Phase 3 Competency',
          'description', 'Trusted persistence competency',
          'expectedLevel', 3
        ),
        'globalCompetency', null,
        'actions', jsonb_build_array(jsonb_build_object(
          'sourceActionId', '69000000-0000-4000-8000-000000000701',
          'title', 'Phase 3 Action',
          'description', 'Complete the action',
          'type', 'course',
          'suggestedDueDays', 10,
          'dueDate', '2026-08-18',
          'orderIndex', 0
        ))
      ))
    ),
    'lineage', jsonb_build_object(
      'applicationId', p_application_id,
      'companyId', '69000000-0000-4000-8000-000000000101',
      'templateId', '69000000-0000-4000-8000-000000000401',
      'templateVersionId', '69000000-0000-4000-8000-000000000501',
      'templateVersionNumber', 1,
      'scope', 'company',
      'snapshotFormatVersion', 1,
      'intentFingerprint', p_fingerprint
    ),
    'metadata', jsonb_build_object(
      'resolverVersion', 1,
      'effectiveAt', '2026-08-08T12:00:00.000Z',
      'idempotencyKey', p_idempotency_key,
      'correlationId', '69000000-0000-4000-8000-000000000801',
      'actorUserId', p_actor_user_id,
      'technicalPrincipal', 'service_role'
    ),
    'goals', jsonb_build_array(jsonb_build_object(
      'sourceGoalId', '69000000-0000-4000-8000-000000000601',
      'description', p_goal_description,
      'orderIndex', 0,
      'suggestedTargetLevel', 3,
      'currentLevel', 1,
      'expectedLevel', 3,
      'appliedTargetLevel', 3,
      'competency', jsonb_build_object(
        'id', '69000000-0000-4000-8000-000000000301',
        'companyId', '69000000-0000-4000-8000-000000000101',
        'name', 'Phase 3 Competency',
        'description', 'Trusted persistence competency',
        'expectedLevel', 3
      ),
      'globalCompetency', null,
      'actions', jsonb_build_array(jsonb_build_object(
        'sourceActionId', '69000000-0000-4000-8000-000000000701',
        'title', 'Phase 3 Action',
        'description', 'Complete the action',
        'type', 'course',
        'suggestedDueDays', 10,
        'dueDate', '2026-08-18',
        'orderIndex', 0
      ))
    )),
    'warnings', jsonb_build_array()
  )
$$;

select has_table('development_template_application_audit');
select has_function('reserve_development_template_application_v1', array['jsonb']);
select has_function('complete_development_template_application_v1', array['jsonb', 'uuid']);
select has_function('fail_development_template_application_v1', array['uuid', 'uuid', 'uuid', 'text', 'text']);

select is(
  (
    public.reserve_development_template_application_v1(
      pg_temp.phase3_resolution(
        '69000000-0000-4000-8000-000000000901',
        'phase-3-success',
        'fingerprint-success'
      )
    ) ->> 'status'
  ),
  'acquired',
  'reserve acquires the first tenant-scoped application attempt'
);

select is(
  (
    public.complete_development_template_application_v1(
      pg_temp.phase3_resolution(
        '69000000-0000-4000-8000-000000000901',
        'phase-3-success',
        'fingerprint-success'
      ),
      (
        select id from public.development_template_application_attempts
        where application_id = '69000000-0000-4000-8000-000000000901'
      )
    ) ->> 'status'
  ),
  'created',
  'complete persists the successful application atomically'
);

select is((select count(*) from public.development_plans where id = (
  select result_plan_id from public.development_template_applications
  where id = '69000000-0000-4000-8000-000000000901'
)), 1::bigint, 'success creates exactly one Plan');
select is((select count(*) from public.development_goals where plan_id = (
  select result_plan_id from public.development_template_applications
  where id = '69000000-0000-4000-8000-000000000901'
)), 1::bigint, 'success creates every resolved Goal');
select is((select count(*) from public.development_actions action join public.development_goals goal on goal.id = action.goal_id where goal.plan_id = (
  select result_plan_id from public.development_template_applications
  where id = '69000000-0000-4000-8000-000000000901'
)), 1::bigint, 'success creates every resolved Action');
select is((select count(*) from public.development_template_application_snapshots where application_id = '69000000-0000-4000-8000-000000000901'), 1::bigint, 'success persists one immutable snapshot');
select is((select count(*) from public.development_template_application_lineage where application_id = '69000000-0000-4000-8000-000000000901'), 1::bigint, 'success persists one lineage record');
select is((select count(*) from public.development_template_application_audit where application_id = '69000000-0000-4000-8000-000000000901' and outcome = 'succeeded'), 1::bigint, 'success persists its audit record');

select is(
  (
    public.reserve_development_template_application_v1(
      pg_temp.phase3_resolution(
        '69000000-0000-4000-8000-000000000999',
        'phase-3-success',
        'fingerprint-success'
      )
    ) ->> 'status'
  ),
  'idempotent_retry',
  'same tenant key and fingerprint return the terminal result'
);
select is((select count(*) from public.development_plans where title = 'Phase 3 Template'), 1::bigint, 'idempotent retry does not duplicate the Plan');

select is(
  (
    public.reserve_development_template_application_v1(
      pg_temp.phase3_resolution(
        '69000000-0000-4000-8000-000000000998',
        'phase-3-success',
        'different-fingerprint'
      )
    ) ->> 'status'
  ),
  'conflict',
  'same tenant key with another fingerprint conflicts'
);

select throws_ok(
  $$ select public.reserve_development_template_application_v1(
    pg_temp.phase3_resolution(
      '69000000-0000-4000-8000-000000000902',
      'phase-3-invalid-actor',
      'fingerprint-invalid-actor',
      '69000000-0000-4000-8000-000000000002'
    )
  ) $$,
  '42501',
  'DEVELOPMENT_TEMPLATE_PERSISTENCE_PERMISSION_DENIED',
  'tenant employee cannot be represented as the human author'
);

select is(
  (
    public.reserve_development_template_application_v1(
      pg_temp.phase3_resolution(
        '69000000-0000-4000-8000-000000000903',
        'phase-3-content-change',
        'fingerprint-content-change',
        '69000000-0000-4000-8000-000000000001',
        'Tampered Goal'
      )
    ) ->> 'status'
  ),
  'acquired',
  'reservation preserves the deterministic command for commit revalidation'
);
select throws_ok(
  $$ select public.complete_development_template_application_v1(
    pg_temp.phase3_resolution(
      '69000000-0000-4000-8000-000000000903',
      'phase-3-content-change',
      'fingerprint-content-change',
      '69000000-0000-4000-8000-000000000001',
      'Tampered Goal'
    ),
    (
      select id from public.development_template_application_attempts
      where application_id = '69000000-0000-4000-8000-000000000903'
    )
  ) $$,
  '23514',
  'DEVELOPMENT_TEMPLATE_VERSION_CONTENT_CHANGED',
  'commit rejects content that differs from the immutable version'
);
select is((select count(*) from public.development_plans where created_by = '69000000-0000-4000-8000-000000000001'), 1::bigint, 'revalidation failure leaves no partial Plan');
select is(
  (
    public.fail_development_template_application_v1(
      '69000000-0000-4000-8000-000000000101',
      '69000000-0000-4000-8000-000000000903',
      (
        select id from public.development_template_application_attempts
        where application_id = '69000000-0000-4000-8000-000000000903'
      ),
      'fingerprint-content-change',
      'DEVELOPMENT_TEMPLATE_VERSION_CONTENT_CHANGED'
    ) ->> 'status'
  ),
  'known_failure',
  'fail records the deterministic failure after functional rollback'
);
select is((select count(*) from public.development_template_application_audit where application_id = '69000000-0000-4000-8000-000000000903' and outcome = 'failed'), 1::bigint, 'deterministic failure remains durably auditable');

select is(
  (
    public.reserve_development_template_application_v1(
      pg_temp.phase3_resolution(
        '69000000-0000-4000-8000-000000000905',
        'phase-3-competency-change',
        'fingerprint-competency-change'
      )
    ) ->> 'status'
  ),
  'acquired',
  'competency revalidation fixture reserves an application'
);
update public.competencies
set active = false
where id = '69000000-0000-4000-8000-000000000301';
select throws_ok(
  $$ select public.complete_development_template_application_v1(
    pg_temp.phase3_resolution(
      '69000000-0000-4000-8000-000000000905',
      'phase-3-competency-change',
      'fingerprint-competency-change'
    ),
    (
      select id from public.development_template_application_attempts
      where application_id = '69000000-0000-4000-8000-000000000905'
    )
  ) $$,
  '23514',
  'DEVELOPMENT_TEMPLATE_COMPETENCY_CHANGED',
  'commit rejects a competency that changed after resolution'
);
update public.competencies
set active = true
where id = '69000000-0000-4000-8000-000000000301';

create function public.phase3_test_reject_audit()
returns trigger language plpgsql as $$
begin
  raise exception using errcode = '23514', message = 'PHASE3_TEST_AUDIT_FAILURE';
end
$$;
create trigger phase3_test_reject_audit_trigger
before insert on public.development_template_application_audit
for each row execute function public.phase3_test_reject_audit();

select is(
  (
    public.reserve_development_template_application_v1(
      pg_temp.phase3_resolution(
        '69000000-0000-4000-8000-000000000904',
        'phase-3-atomic-failure',
        'fingerprint-atomic-failure'
      )
    ) ->> 'status'
  ),
  'acquired',
  'atomic failure fixture reserves an application'
);
select throws_ok(
  $$ select public.complete_development_template_application_v1(
    pg_temp.phase3_resolution(
      '69000000-0000-4000-8000-000000000904',
      'phase-3-atomic-failure',
      'fingerprint-atomic-failure'
    ),
    (
      select id from public.development_template_application_attempts
      where application_id = '69000000-0000-4000-8000-000000000904'
    )
  ) $$,
  '23514',
  'PHASE3_TEST_AUDIT_FAILURE',
  'audit failure aborts the complete transaction'
);
select is((select count(*) from public.development_plans where title = 'Phase 3 Template'), 1::bigint, 'audit failure rolls back Plan, Goals and Actions');

drop trigger phase3_test_reject_audit_trigger on public.development_template_application_audit;
drop function public.phase3_test_reject_audit();

select ok(
  not has_function_privilege('authenticated', 'public.reserve_development_template_application_v1(jsonb)', 'EXECUTE'),
  'authenticated cannot reserve through Trusted Persistence'
);
select ok(
  has_function_privilege('service_role', 'public.reserve_development_template_application_v1(jsonb)', 'EXECUTE'),
  'service_role can execute the server-only reservation'
);
select ok(
  not has_table_privilege('service_role', 'public.development_template_applications', 'TRUNCATE'),
  'service_role cannot truncate Template Applications outside Trusted Persistence'
);
select ok(
  not has_table_privilege('service_role', 'public.development_template_application_audit', 'TRUNCATE'),
  'service_role cannot truncate immutable application audit history'
);
select ok(
  to_regprocedure('public.apply_development_template(uuid,uuid,uuid,text,uuid,date,date)') is not null,
  'legacy apply_development_template contract remains available'
);

select is(
  (
    public.reserve_development_template_application_v1(
      pg_temp.phase3_resolution(
        '69000000-0000-4000-8000-000000000906',
        'phase-3-version-change',
        'fingerprint-version-change'
      )
    ) ->> 'status'
  ),
  'acquired',
  'version revalidation fixture reserves an application'
);
update public.development_template_versions
set status = 'obsolete',
    obsoleted_by = '69000000-0000-4000-8000-000000000001',
    obsoleted_at = now()
where id = '69000000-0000-4000-8000-000000000501';
select throws_ok(
  $$ select public.complete_development_template_application_v1(
    pg_temp.phase3_resolution(
      '69000000-0000-4000-8000-000000000906',
      'phase-3-version-change',
      'fingerprint-version-change'
    ),
    (
      select id from public.development_template_application_attempts
      where application_id = '69000000-0000-4000-8000-000000000906'
    )
  ) $$,
  '23514',
  'DEVELOPMENT_TEMPLATE_VERSION_NOT_CONSUMABLE',
  'commit rejects a version obsoleted after resolution'
);
select is((select count(*) from public.development_plans where title = 'Phase 3 Template'), 1::bigint, 'competency and version races create no partial Plan');

select * from finish();
rollback;
