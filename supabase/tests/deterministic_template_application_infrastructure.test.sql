begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(37);

select has_table('development_template_versions');
select has_table('development_template_version_goals');
select has_table('development_template_version_actions');
select has_table('global_competency_concept_version_compatibilities');
select has_table('development_template_applications');
select has_table('development_template_application_attempts');
select has_table('development_template_application_snapshots');
select has_table('development_template_application_lineage');

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'development_template_versions_id_company_id_key'
  ),
  'template versions expose the tenant-owned candidate key'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'development_template_applications_id_company_id_key'
  ),
  'template applications expose the tenant-owned candidate key'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'development_template_application_attempts_application_fkey'
  ),
  'attempts use the application tenant-owned candidate key'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'development_template_application_snapshots_application_fkey'
  ),
  'snapshots are tied to the successful application result'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'development_template_application_lineage_snapshot_fkey'
  ),
  'lineage is tied to the application snapshot'
);

select is(
  (
    select count(*)
    from pg_class relation
    where relation.oid in (
      'public.development_template_versions'::regclass,
      'public.development_template_version_goals'::regclass,
      'public.development_template_version_actions'::regclass,
      'public.global_competency_concept_version_compatibilities'::regclass,
      'public.development_template_applications'::regclass,
      'public.development_template_application_attempts'::regclass,
      'public.development_template_application_snapshots'::regclass,
      'public.development_template_application_lineage'::regclass
    ) and relation.relrowsecurity
  ),
  8::bigint,
  'RLS is enabled on every Phase 1 table'
);

select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where grantee = 'authenticated'
      and table_schema = 'public'
      and table_name in (
        'development_template_versions',
        'development_template_version_goals',
        'development_template_version_actions',
        'global_competency_concept_version_compatibilities',
        'development_template_applications',
        'development_template_application_attempts',
        'development_template_application_snapshots',
        'development_template_application_lineage'
      )
      and privilege_type <> 'SELECT'
  ),
  0::bigint,
  'authenticated receives no direct write grant on Phase 1 tables'
);

insert into auth.users (id, email) values
  ('68000000-0000-4000-8000-000000000001', 'phase1-hr@example.com');

insert into public.companies (id, name, slug) values
  ('68000000-0000-4000-8000-000000000101', 'Phase 1 Alpha', 'phase-1-alpha'),
  ('68000000-0000-4000-8000-000000000102', 'Phase 1 Beta', 'phase-1-beta');

insert into public.company_members (company_id, user_id, role) values
  ('68000000-0000-4000-8000-000000000101', '68000000-0000-4000-8000-000000000001', 'hr');

insert into public.people (id, company_id, full_name) values
  ('68000000-0000-4000-8000-000000000201', '68000000-0000-4000-8000-000000000101', 'Phase 1 Employee'),
  ('68000000-0000-4000-8000-000000000202', '68000000-0000-4000-8000-000000000102', 'Other Employee');

insert into public.competencies (id, company_id, name, category) values
  ('68000000-0000-4000-8000-000000000301', '68000000-0000-4000-8000-000000000101', 'Phase 1 Competency', 'technical'),
  ('68000000-0000-4000-8000-000000000302', '68000000-0000-4000-8000-000000000102', 'Other Competency', 'technical');

insert into public.development_templates (
  id, company_id, name, scope, active, created_by
) values
  ('68000000-0000-4000-8000-000000000401', '68000000-0000-4000-8000-000000000101', 'Alpha Template', 'company', true, '68000000-0000-4000-8000-000000000001'),
  ('68000000-0000-4000-8000-000000000402', '68000000-0000-4000-8000-000000000102', 'Beta Template', 'company', true, '68000000-0000-4000-8000-000000000001'),
  ('68000000-0000-4000-8000-000000000403', null, 'Global Template', 'global', true, '68000000-0000-4000-8000-000000000001');

insert into public.development_template_versions (
  id, template_id, company_id, scope, version_number, status, name, created_by
) values
  ('68000000-0000-4000-8000-000000000501', '68000000-0000-4000-8000-000000000401', '68000000-0000-4000-8000-000000000101', 'company', 1, 'draft', 'Alpha Template v1', '68000000-0000-4000-8000-000000000001'),
  ('68000000-0000-4000-8000-000000000502', '68000000-0000-4000-8000-000000000402', '68000000-0000-4000-8000-000000000102', 'company', 1, 'draft', 'Beta Template v1', '68000000-0000-4000-8000-000000000001'),
  ('68000000-0000-4000-8000-000000000503', '68000000-0000-4000-8000-000000000403', null, 'global', 1, 'draft', 'Global Template v1', '68000000-0000-4000-8000-000000000001');

select throws_ok(
  $$ insert into public.development_template_versions (template_id, company_id, scope, version_number, name, created_by) values ('68000000-0000-4000-8000-000000000401', '68000000-0000-4000-8000-000000000102', 'company', 2, 'Invalid owner', '68000000-0000-4000-8000-000000000001') $$,
  '23514',
  'DEVELOPMENT_TEMPLATE_VERSION_OWNER_MISMATCH',
  'company template version cannot cross tenants'
);

insert into public.development_template_version_goals (
  id, template_version_id, company_id, competency_id, description,
  suggested_target_level, order_index
) values
  ('68000000-0000-4000-8000-000000000601', '68000000-0000-4000-8000-000000000501', '68000000-0000-4000-8000-000000000101', '68000000-0000-4000-8000-000000000301', 'Alpha Goal', 3, 0),
  ('68000000-0000-4000-8000-000000000602', '68000000-0000-4000-8000-000000000502', '68000000-0000-4000-8000-000000000102', '68000000-0000-4000-8000-000000000302', 'Beta Goal', 3, 0);

select throws_ok(
  $$ insert into public.development_template_version_goals (template_version_id, company_id, competency_id, description, suggested_target_level) values ('68000000-0000-4000-8000-000000000501', '68000000-0000-4000-8000-000000000101', '68000000-0000-4000-8000-000000000302', 'Cross tenant', 3) $$,
  '23503',
  null,
  'versioned company goal cannot reference another tenant competency'
);

insert into public.development_template_version_actions (
  id, template_version_goal_id, title, type, order_index
) values (
  '68000000-0000-4000-8000-000000000701',
  '68000000-0000-4000-8000-000000000601',
  'Alpha Action',
  'course',
  0
);

select lives_ok(
  $$ update public.development_template_version_goals set description = 'Alpha Goal Draft' where id = '68000000-0000-4000-8000-000000000601' $$,
  'draft version content remains mutable'
);

update public.development_template_versions
set status = 'published',
    published_by = '68000000-0000-4000-8000-000000000001',
    published_at = now()
where id in (
  '68000000-0000-4000-8000-000000000501',
  '68000000-0000-4000-8000-000000000502',
  '68000000-0000-4000-8000-000000000503'
);

select throws_ok(
  $$ update public.development_template_versions set name = 'Changed' where id = '68000000-0000-4000-8000-000000000501' $$,
  '55000',
  'DEVELOPMENT_TEMPLATE_VERSION_IMMUTABLE',
  'published template version is immutable'
);
select throws_ok(
  $$ update public.development_template_version_goals set description = 'Changed' where id = '68000000-0000-4000-8000-000000000601' $$,
  '55000',
  'DEVELOPMENT_TEMPLATE_VERSION_CONTENT_IMMUTABLE',
  'published version goal is immutable'
);
select throws_ok(
  $$ delete from public.development_template_version_actions where id = '68000000-0000-4000-8000-000000000701' $$,
  '55000',
  'DEVELOPMENT_TEMPLATE_VERSION_CONTENT_IMMUTABLE',
  'published version action is immutable'
);

insert into public.development_plans (
  id, company_id, employee_id, created_by, title, status
) values (
  '68000000-0000-4000-8000-000000000801',
  '68000000-0000-4000-8000-000000000101',
  '68000000-0000-4000-8000-000000000201',
  '68000000-0000-4000-8000-000000000001',
  'Phase 1 Plan',
  'active'
);

select lives_ok(
  $$ insert into public.development_template_applications (id, company_id, template_version_id, actor_user_id, technical_principal, idempotency_key, intent_fingerprint, correlation_id) values ('68000000-0000-4000-8000-000000000901', '68000000-0000-4000-8000-000000000101', '68000000-0000-4000-8000-000000000501', '68000000-0000-4000-8000-000000000001', 'service_role', 'phase-1-pending', 'fingerprint-1', '68000000-0000-4000-8000-000000000911') $$,
  'same-tenant published version can identify an application'
);
select lives_ok(
  $$ insert into public.development_template_applications (id, company_id, template_version_id, actor_user_id, technical_principal, idempotency_key, intent_fingerprint, correlation_id) values ('68000000-0000-4000-8000-000000000902', '68000000-0000-4000-8000-000000000101', '68000000-0000-4000-8000-000000000503', '68000000-0000-4000-8000-000000000001', 'service_role', 'phase-1-global', 'fingerprint-2', '68000000-0000-4000-8000-000000000912') $$,
  'published global version can identify a tenant application'
);
select throws_ok(
  $$ insert into public.development_template_applications (company_id, template_version_id, actor_user_id, technical_principal, idempotency_key, intent_fingerprint, correlation_id) values ('68000000-0000-4000-8000-000000000101', '68000000-0000-4000-8000-000000000502', '68000000-0000-4000-8000-000000000001', 'service_role', 'phase-1-cross', 'fingerprint-3', '68000000-0000-4000-8000-000000000913') $$,
  '23514',
  'DEVELOPMENT_TEMPLATE_APPLICATION_VERSION_INVALID',
  'company template application cannot cross tenants'
);
select throws_ok(
  $$ insert into public.development_template_applications (company_id, template_version_id, actor_user_id, technical_principal, idempotency_key, intent_fingerprint, correlation_id) values ('68000000-0000-4000-8000-000000000101', '68000000-0000-4000-8000-000000000501', '68000000-0000-4000-8000-000000000001', 'service_role', 'phase-1-pending', 'different-fingerprint', '68000000-0000-4000-8000-000000000914') $$,
  '23505',
  null,
  'tenant idempotency key is unique'
);

insert into public.development_template_applications (
  id, company_id, template_version_id, actor_user_id, technical_principal,
  idempotency_key, intent_fingerprint, correlation_id, status,
  result_plan_id, completed_at
) values (
  '68000000-0000-4000-8000-000000000903',
  '68000000-0000-4000-8000-000000000101',
  '68000000-0000-4000-8000-000000000501',
  '68000000-0000-4000-8000-000000000001',
  'service_role',
  'phase-1-success',
  'fingerprint-4',
  '68000000-0000-4000-8000-000000000915',
  'succeeded',
  '68000000-0000-4000-8000-000000000801',
  now()
);

insert into public.development_template_application_attempts (
  id, application_id, company_id, attempt_number, status, started_at,
  completed_at
) values (
  '68000000-0000-4000-8000-000000000921',
  '68000000-0000-4000-8000-000000000903',
  '68000000-0000-4000-8000-000000000101',
  1,
  'succeeded',
  now(),
  now()
);

select throws_ok(
  $$ delete from public.development_template_applications where id = '68000000-0000-4000-8000-000000000901' $$,
  '55000',
  'DEVELOPMENT_TEMPLATE_APPLICATION_IMMUTABLE',
  'template application identity cannot be deleted'
);

insert into public.development_template_application_snapshots (
  id, application_id, company_id, plan_id, format_version, snapshot
) values (
  '68000000-0000-4000-8000-000000000931',
  '68000000-0000-4000-8000-000000000903',
  '68000000-0000-4000-8000-000000000101',
  '68000000-0000-4000-8000-000000000801',
  1,
  '{"template":{"version":1},"result":{"plan":"68000000-0000-4000-8000-000000000801"}}'
);

insert into public.development_template_application_lineage (
  id, application_id, snapshot_id, plan_id, template_version_id, company_id
) values (
  '68000000-0000-4000-8000-000000000941',
  '68000000-0000-4000-8000-000000000903',
  '68000000-0000-4000-8000-000000000931',
  '68000000-0000-4000-8000-000000000801',
  '68000000-0000-4000-8000-000000000501',
  '68000000-0000-4000-8000-000000000101'
);

select throws_ok(
  $$ update public.development_template_application_attempts set error_code = 'changed' where id = '68000000-0000-4000-8000-000000000921' $$,
  '55000',
  'DEVELOPMENT_TEMPLATE_APPLICATION_HISTORY_IMMUTABLE',
  'application attempts are append-only'
);
select throws_ok(
  $$ update public.development_template_application_snapshots set snapshot = '{}' where id = '68000000-0000-4000-8000-000000000931' $$,
  '55000',
  'DEVELOPMENT_TEMPLATE_APPLICATION_HISTORY_IMMUTABLE',
  'application snapshots are immutable'
);
select throws_ok(
  $$ delete from public.development_template_application_lineage where id = '68000000-0000-4000-8000-000000000941' $$,
  '55000',
  'DEVELOPMENT_TEMPLATE_APPLICATION_HISTORY_IMMUTABLE',
  'application lineage is append-only'
);
select throws_ok(
  $$ insert into public.development_template_application_snapshots (application_id, company_id, plan_id, format_version, snapshot) values ('68000000-0000-4000-8000-000000000903', '68000000-0000-4000-8000-000000000102', '68000000-0000-4000-8000-000000000801', 1, '{}') $$,
  '23503',
  null,
  'service role cannot bypass snapshot tenant integrity'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"68000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select is(
  (select count(*) from public.development_template_applications where company_id = '68000000-0000-4000-8000-000000000101'),
  3::bigint,
  'member reads own tenant applications'
);
select is(
  (select count(*) from public.development_template_applications where company_id = '68000000-0000-4000-8000-000000000102'),
  0::bigint,
  'member cannot read other tenant applications'
);
select is(
  (select count(*) from public.development_template_application_snapshots),
  1::bigint,
  'member reads own tenant snapshots'
);
select throws_ok(
  $$ insert into public.development_template_applications (company_id, template_version_id, actor_user_id, technical_principal, idempotency_key, intent_fingerprint, correlation_id) values ('68000000-0000-4000-8000-000000000101', '68000000-0000-4000-8000-000000000501', '68000000-0000-4000-8000-000000000001', 'client', 'client-write', 'fingerprint', '68000000-0000-4000-8000-000000000916') $$,
  '42501',
  null,
  'authenticated cannot write application infrastructure directly'
);
reset role;

select ok(
  to_regprocedure(
    'public.apply_development_template(uuid,uuid,uuid,text,uuid,date,date)'
  ) is not null,
  'legacy apply_development_template contract remains available'
);
select ok(
  not exists (
    select 1
    from public.development_templates template
    where template.active
      and template.created_by is null
  ),
  'preflight condition for missing authors remains clear'
);
select ok(
  not exists (
    select 1
    from public.development_templates template
    where template.active
      and not exists (
        select 1
        from public.development_template_goals goal
        where goal.template_id = template.id
      )
      and template.id not in (
        '68000000-0000-4000-8000-000000000401',
        '68000000-0000-4000-8000-000000000402',
        '68000000-0000-4000-8000-000000000403'
      )
  ),
  'preflight detects active templates without goals'
);

select * from finish();
rollback;
