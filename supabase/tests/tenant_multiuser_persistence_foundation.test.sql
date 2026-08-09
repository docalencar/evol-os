begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(41);

select has_table('tenant_access_operations');
select has_table('company_member_invitations');
select has_table('tenant_access_audit_events');

select has_column('company_member_invitations', 'token_digest');
select has_column('company_member_invitations', 'generation');
select has_column('company_member_invitations', 'expires_at');
select has_column('company_member_invitations', 'idempotency_key');
select has_column('company_member_invitations', 'intent_fingerprint');
select has_column('company_member_invitations', 'correlation_id');
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'company_member_invitations'
      and column_name = 'token'
  ),
  'raw token column is absent'
);
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'company_member_invitations'
      and column_name = 'raw_token'
  ),
  'raw token alias column is absent'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'company_member_invitations_person_fkey'
      and convalidated
  ),
  'invitation references People with tenant-aware FK'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'company_member_invitations_created_operation_fkey'
      and convalidated
  ),
  'invitation references its operation within the tenant'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'tenant_access_audit_events_operation_fkey'
      and convalidated
  ),
  'audit references operation within the tenant'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'company_member_invitations_token_digest_key'
  ),
  'token digest has lookup uniqueness'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'company_member_invitations_pending_person_key'
  ),
  'pending invitation is unique per person and tenant'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'company_member_invitations_pending_email_key'
  ),
  'pending invitation is unique per normalized email and tenant'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'people_company_user_lookup_idx'
      and indexdef not ilike 'create unique index%'
  ),
  'People Auth lookup is additive and non-enforcing'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'tenant_access_operations'::regclass),
  'operation RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'company_member_invitations'::regclass),
  'invitation RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'tenant_access_audit_events'::regclass),
  'audit RLS enabled'
);
select is(
  (select count(*) from pg_policies where schemaname = 'public'
    and tablename in (
      'tenant_access_operations',
      'company_member_invitations',
      'tenant_access_audit_events'
    )),
  0::bigint,
  'new structures are fail-closed without client policies'
);

select ok(
  not has_table_privilege('authenticated', 'public.company_member_invitations', 'select'),
  'authenticated cannot read invitation secrets'
);
select ok(
  not has_table_privilege('authenticated', 'public.company_member_invitations', 'insert'),
  'authenticated cannot issue invitations directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.tenant_access_audit_events', 'select'),
  'authenticated cannot read audit directly'
);
select ok(
  has_table_privilege('service_role', 'public.company_member_invitations', 'select')
  and has_table_privilege('service_role', 'public.company_member_invitations', 'insert')
  and has_table_privilege('service_role', 'public.company_member_invitations', 'update'),
  'service role has future server-only invitation access'
);
select ok(
  has_table_privilege('service_role', 'public.tenant_access_audit_events', 'insert')
  and not has_table_privilege('service_role', 'public.tenant_access_audit_events', 'update')
  and not has_table_privilege('service_role', 'public.tenant_access_audit_events', 'delete'),
  'service role can append but cannot rewrite audit'
);

insert into auth.users (id, email) values
  ('70000000-0000-4000-8000-000000000001', 'phase1-owner@example.com'),
  ('70000000-0000-4000-8000-000000000002', 'phase1-target@example.com');

insert into public.companies (id, name, slug) values
  ('70000000-0000-4000-8000-000000000101', 'Phase 1 Alpha', 'phase-1-alpha'),
  ('70000000-0000-4000-8000-000000000102', 'Phase 1 Beta', 'phase-1-beta');

insert into public.company_members (company_id, user_id, role) values
  ('70000000-0000-4000-8000-000000000101', '70000000-0000-4000-8000-000000000001', 'owner');

insert into public.people (id, company_id, full_name, email) values
  ('70000000-0000-4000-8000-000000000201', '70000000-0000-4000-8000-000000000101', 'Target One', 'phase1-target@example.com'),
  ('70000000-0000-4000-8000-000000000202', '70000000-0000-4000-8000-000000000101', 'Target Two', 'phase1-target@example.com'),
  ('70000000-0000-4000-8000-000000000203', '70000000-0000-4000-8000-000000000102', 'Other Tenant', 'other@example.com');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select throws_ok(
  $$select * from public.company_member_invitations$$,
  '42501',
  null,
  'authenticated cannot read invitations'
);
reset role;

set local role service_role;

insert into public.tenant_access_operations (
  id, company_id, actor_user_id, operation, idempotency_key,
  intent_fingerprint, correlation_id
) values (
  '70000000-0000-4000-8000-000000000301',
  '70000000-0000-4000-8000-000000000101',
  '70000000-0000-4000-8000-000000000001',
  'invite_issue', 'issue-1', 'fingerprint-1',
  '70000000-0000-4000-8000-000000000401'
);

select lives_ok(
  $$insert into public.company_member_invitations (
    id, company_id, person_id, target_email_normalized, intended_role,
    token_digest, expires_at, created_by_actor_user_id,
    created_operation_id, idempotency_key, intent_fingerprint, correlation_id
  ) values (
    '70000000-0000-4000-8000-000000000501',
    '70000000-0000-4000-8000-000000000101',
    '70000000-0000-4000-8000-000000000201',
    'phase1-target@example.com', 'employee', decode(repeat('ab', 32), 'hex'),
    now() + interval '7 days',
    '70000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000301',
    'invite-1', 'invite-fingerprint-1',
    '70000000-0000-4000-8000-000000000401'
  )$$,
  'trusted executor can persist additive invitation state'
);

select throws_ok(
  $$insert into public.company_member_invitations (
    company_id, person_id, target_email_normalized, intended_role,
    token_digest, expires_at, created_by_actor_user_id,
    created_operation_id, idempotency_key, intent_fingerprint, correlation_id
  ) values (
    '70000000-0000-4000-8000-000000000102',
    '70000000-0000-4000-8000-000000000201',
    'phase1-target@example.com', 'employee', decode(repeat('bc', 32), 'hex'),
    now() + interval '7 days',
    '70000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000301',
    'invite-cross', 'invite-cross-fingerprint',
    '70000000-0000-4000-8000-000000000402'
  )$$,
  '23503',
  null,
  'cross-tenant People invitation rejected'
);

select throws_ok(
  $$insert into public.company_member_invitations (
    company_id, person_id, target_email_normalized, intended_role,
    token_digest, expires_at, created_by_actor_user_id,
    created_operation_id, idempotency_key, intent_fingerprint, correlation_id
  ) values (
    '70000000-0000-4000-8000-000000000101',
    '70000000-0000-4000-8000-000000000201',
    'another@example.com', 'employee', decode(repeat('cd', 32), 'hex'),
    now() + interval '7 days',
    '70000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000301',
    'invite-duplicate-person', 'invite-duplicate-person-fingerprint',
    '70000000-0000-4000-8000-000000000403'
  )$$,
  '23505',
  null,
  'second pending invitation for same person rejected'
);

select throws_ok(
  $$insert into public.company_member_invitations (
    company_id, person_id, target_email_normalized, intended_role,
    token_digest, expires_at, created_by_actor_user_id,
    created_operation_id, idempotency_key, intent_fingerprint, correlation_id
  ) values (
    '70000000-0000-4000-8000-000000000101',
    '70000000-0000-4000-8000-000000000202',
    'phase1-target@example.com', 'employee', decode(repeat('de', 32), 'hex'),
    now() + interval '7 days',
    '70000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000301',
    'invite-duplicate-email', 'invite-duplicate-email-fingerprint',
    '70000000-0000-4000-8000-000000000404'
  )$$,
  '23505',
  null,
  'second pending invitation for same tenant email rejected'
);

select throws_ok(
  $$insert into public.company_member_invitations (
    company_id, person_id, target_email_normalized, intended_role,
    token_digest, expires_at, created_by_actor_user_id,
    created_operation_id, idempotency_key, intent_fingerprint, correlation_id
  ) values (
    '70000000-0000-4000-8000-000000000101',
    '70000000-0000-4000-8000-000000000202',
    'UPPER@example.com', 'employee', decode(repeat('ef', 32), 'hex'),
    now() + interval '7 days',
    '70000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000301',
    'invite-uppercase', 'invite-uppercase-fingerprint',
    '70000000-0000-4000-8000-000000000405'
  )$$,
  '23514',
  null,
  'invitation email must already be normalized'
);

select throws_ok(
  $$insert into public.company_member_invitations (
    company_id, person_id, target_email_normalized, intended_role,
    token_digest, expires_at, created_by_actor_user_id,
    created_operation_id, idempotency_key, intent_fingerprint, correlation_id
  ) values (
    '70000000-0000-4000-8000-000000000101',
    '70000000-0000-4000-8000-000000000202',
    'other@example.com', 'employee', decode('abcd', 'hex'),
    now() + interval '7 days',
    '70000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000301',
    'invite-short-digest', 'invite-short-digest-fingerprint',
    '70000000-0000-4000-8000-000000000406'
  )$$,
  '23514',
  null,
  'token digest must have fixed non-reversible representation length'
);

select lives_ok(
  $$insert into public.tenant_access_audit_events (
    id, company_id, operation_id, event_type, actor_user_id,
    executor_type, executor_id, target_type, target_id, target_user_id,
    correlation_id, outcome
  ) values (
    '70000000-0000-4000-8000-000000000601',
    '70000000-0000-4000-8000-000000000101',
    '70000000-0000-4000-8000-000000000301',
    'invite.created',
    '70000000-0000-4000-8000-000000000001',
    'service_role', 'service_role', 'invitation',
    '70000000-0000-4000-8000-000000000501',
    '70000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000401', 'succeeded'
  )$$,
  'trusted executor appends audit with human actor preserved'
);

reset role;

select throws_ok(
  $$update public.tenant_access_audit_events set outcome = 'failed'$$,
  '55000',
  'TENANT_ACCESS_AUDIT_APPEND_ONLY',
  'audit trigger protects history from privileged update'
);

select throws_ok(
  $$delete from public.tenant_access_audit_events$$,
  '55000',
  'TENANT_ACCESS_AUDIT_APPEND_ONLY',
  'audit trigger protects history from privileged delete'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'company_members_company_id_user_id_key'
  ),
  'legacy membership uniqueness remains present'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'company_members_status_check'
      and pg_get_constraintdef(oid) like '%invited%'
  ),
  'legacy invited membership status remains unchanged'
);
select ok(
  not exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name in ('user_tenant_preferences', 'active_tenants')
  ),
  'tenant preference persistence is deferred'
);
select ok(
  not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'people'
      and indexdef ilike 'create unique index%'
      and indexdef ilike '%company_id%user_id%'
  ),
  'Phase 1 does not enforce People Auth uniqueness before target preflight'
);

select * from finish();
rollback;
