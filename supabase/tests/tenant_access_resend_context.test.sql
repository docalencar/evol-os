begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(21);

select is(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'resend_company_member_invitation_v1'
      and pg_get_function_identity_arguments(p.oid) = 'p_company_id uuid, p_invitation_id uuid, p_expected_generation integer, p_token_digest_hex text, p_idempotency_key text, p_correlation_id uuid'
  ),
  true,
  'resend boundary remains SECURITY DEFINER'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.resend_company_member_invitation_v1(uuid,uuid,integer,text,text,uuid)',
    'execute'
  ),
  'authenticated retains narrow resend execution'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.resend_company_member_invitation_v1(uuid,uuid,integer,text,text,uuid)',
    'execute'
  ),
  'anon cannot execute resend'
);
select ok(
  not has_function_privilege(
    'service_role',
    'public.resend_company_member_invitation_v1(uuid,uuid,integer,text,text,uuid)',
    'execute'
  ),
  'service role cannot execute resend'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.company_member_invitations',
    'select'
  ),
  'authenticated receives no invitation table SELECT'
);

insert into auth.users (id, email, email_confirmed_at) values
  ('75000000-0000-4000-8000-000000000001', 'owner-r1@example.com', now()),
  ('75000000-0000-4000-8000-000000000002', 'admin-r1@example.com', now()),
  ('75000000-0000-4000-8000-000000000003', 'employee-r1@example.com', now()),
  ('75000000-0000-4000-8000-000000000004', 'inactive-r1@example.com', now()),
  ('75000000-0000-4000-8000-000000000005', 'owner-beta-r1@example.com', now()),
  ('75000000-0000-4000-8000-000000000006', 'target-r1@example.com', now()),
  ('75000000-0000-4000-8000-000000000007', 'target-owner-r1@example.com', now()),
  ('75000000-0000-4000-8000-000000000008', 'target-beta-r1@example.com', now());

insert into public.companies (id, name, slug) values
  ('75000000-0000-4000-8000-000000000101', 'R1 Alpha', 'r1-alpha'),
  ('75000000-0000-4000-8000-000000000102', 'R1 Beta', 'r1-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('75000000-0000-4000-8000-000000000111', '75000000-0000-4000-8000-000000000101', '75000000-0000-4000-8000-000000000001', 'owner', 'active'),
  ('75000000-0000-4000-8000-000000000112', '75000000-0000-4000-8000-000000000101', '75000000-0000-4000-8000-000000000002', 'admin', 'active'),
  ('75000000-0000-4000-8000-000000000113', '75000000-0000-4000-8000-000000000101', '75000000-0000-4000-8000-000000000003', 'employee', 'active'),
  ('75000000-0000-4000-8000-000000000114', '75000000-0000-4000-8000-000000000101', '75000000-0000-4000-8000-000000000004', 'admin', 'inactive'),
  ('75000000-0000-4000-8000-000000000115', '75000000-0000-4000-8000-000000000102', '75000000-0000-4000-8000-000000000005', 'owner', 'active');

insert into public.people (id, company_id, full_name, email, user_id) values
  ('75000000-0000-4000-8000-000000000201', '75000000-0000-4000-8000-000000000101', 'R1 Owner', 'owner-r1@example.com', '75000000-0000-4000-8000-000000000001'),
  ('75000000-0000-4000-8000-000000000202', '75000000-0000-4000-8000-000000000101', 'R1 Admin', 'admin-r1@example.com', '75000000-0000-4000-8000-000000000002'),
  ('75000000-0000-4000-8000-000000000203', '75000000-0000-4000-8000-000000000101', 'R1 Employee', 'employee-r1@example.com', '75000000-0000-4000-8000-000000000003'),
  ('75000000-0000-4000-8000-000000000204', '75000000-0000-4000-8000-000000000101', 'R1 Inactive', 'inactive-r1@example.com', '75000000-0000-4000-8000-000000000004'),
  ('75000000-0000-4000-8000-000000000205', '75000000-0000-4000-8000-000000000102', 'R1 Beta Owner', 'owner-beta-r1@example.com', '75000000-0000-4000-8000-000000000005'),
  ('75000000-0000-4000-8000-000000000206', '75000000-0000-4000-8000-000000000101', 'R1 Target', 'target-r1@example.com', null),
  ('75000000-0000-4000-8000-000000000207', '75000000-0000-4000-8000-000000000101', 'R1 Owner Target', 'target-owner-r1@example.com', null),
  ('75000000-0000-4000-8000-000000000208', '75000000-0000-4000-8000-000000000102', 'R1 Beta Target', 'target-beta-r1@example.com', null);

create temporary table resend_context_test_values (
  name text primary key,
  value jsonb not null
);
grant select, insert on resend_context_test_values to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"75000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
insert into resend_context_test_values values
  ('alpha-invite', public.issue_company_member_invitation_v1(
    '75000000-0000-4000-8000-000000000101',
    '75000000-0000-4000-8000-000000000206',
    'target-r1@example.com',
    'employee',
    repeat('a', 64),
    'r1-issue-alpha',
    '75000000-0000-4000-8000-000000000301'
  )),
  ('owner-invite', public.issue_company_member_invitation_v1(
    '75000000-0000-4000-8000-000000000101',
    '75000000-0000-4000-8000-000000000207',
    'target-owner-r1@example.com',
    'owner',
    repeat('b', 64),
    'r1-issue-owner',
    '75000000-0000-4000-8000-000000000302'
  ));

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"75000000-0000-4000-8000-000000000005","role":"authenticated"}',
  true
);
insert into resend_context_test_values values
  ('beta-invite', public.issue_company_member_invitation_v1(
    '75000000-0000-4000-8000-000000000102',
    '75000000-0000-4000-8000-000000000208',
    'target-beta-r1@example.com',
    'employee',
    repeat('c', 64),
    'r1-issue-beta',
    '75000000-0000-4000-8000-000000000303'
  ));

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"75000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
insert into resend_context_test_values values (
  'admin-resend',
  public.resend_company_member_invitation_v1(
    '75000000-0000-4000-8000-000000000101',
    (select (value #>> '{result,invitationId}')::uuid
      from resend_context_test_values where name = 'alpha-invite'),
    1,
    repeat('d', 64),
    'r1-resend-alpha',
    '75000000-0000-4000-8000-000000000304'
  )
);

select is(
  (select value ->> 'status' from resend_context_test_values where name = 'admin-resend'),
  'succeeded',
  'admin can resend a non-owner invitation'
);
select is(
  (select value #>> '{result,destinationEmail}' from resend_context_test_values where name = 'admin-resend'),
  'target-r1@example.com',
  'resend returns the invitation destination email'
);
select is(
  (select value #>> '{result,intendedRole}' from resend_context_test_values where name = 'admin-resend'),
  'employee',
  'resend returns the intended role'
);
select is(
  (select (value #>> '{result,generation}')::integer from resend_context_test_values where name = 'admin-resend'),
  2,
  'resend returns the incremented generation'
);

reset role;
select is(
  (
    select (value #>> '{result,expiresAt}')::timestamptz
    from resend_context_test_values
    where name = 'admin-resend'
  ),
  (
    select expires_at
    from public.company_member_invitations
    where id = (
      select (value #>> '{result,invitationId}')::uuid
      from resend_context_test_values
      where name = 'admin-resend'
    )
  ),
  'resend returns the expiration of the new generation'
);
select is(
  (
    select result
    from public.tenant_access_operations
    where id = (
      select (value ->> 'operationId')::uuid
      from resend_context_test_values
      where name = 'admin-resend'
    )
  ),
  (select value -> 'result' from resend_context_test_values where name = 'admin-resend'),
  'the enriched context is persisted as the canonical operation result'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"75000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
insert into resend_context_test_values values (
  'admin-retry',
  public.resend_company_member_invitation_v1(
    '75000000-0000-4000-8000-000000000101',
    (select (value #>> '{result,invitationId}')::uuid
      from resend_context_test_values where name = 'alpha-invite'),
    1,
    repeat('d', 64),
    'r1-resend-alpha',
    '75000000-0000-4000-8000-000000000304'
  )
);
select is(
  (select value ->> 'status' from resend_context_test_values where name = 'admin-retry'),
  'idempotent_retry',
  'equivalent resend returns idempotent retry'
);
select is(
  (select value -> 'result' from resend_context_test_values where name = 'admin-retry'),
  (select value -> 'result' from resend_context_test_values where name = 'admin-resend'),
  'idempotent retry returns the exact canonical delivery context'
);
select ok(
  not (
    (select value -> 'result' from resend_context_test_values where name = 'admin-resend')
    ?| array[
      'tokenDigest', 'tokenDigestHex', 'rawToken', 'companyId', 'personId',
      'createdByActorUserId', 'grantor', 'idempotencyKey',
      'intentFingerprint', 'fingerprint', 'auditMetadata'
    ]
  ),
  'resend result excludes secrets and internal persistence fields'
);

select throws_ok(
  $$select public.resend_company_member_invitation_v1(
    '75000000-0000-4000-8000-000000000101',
    (select (value #>> '{result,invitationId}')::uuid
      from resend_context_test_values where name = 'owner-invite'),
    1, repeat('e', 64), 'r1-admin-owner-denied',
    '75000000-0000-4000-8000-000000000305'
  )$$,
  '42501',
  'TENANT_AUTHORIZATION_DENIED',
  'admin cannot resend an owner invitation'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"75000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
select throws_ok(
  $$select public.resend_company_member_invitation_v1(
    '75000000-0000-4000-8000-000000000101',
    (select (value #>> '{result,invitationId}')::uuid
      from resend_context_test_values where name = 'alpha-invite'),
    2, repeat('f', 64), 'r1-employee-denied',
    '75000000-0000-4000-8000-000000000306'
  )$$,
  '42501',
  'TENANT_AUTHORIZATION_DENIED',
  'employee cannot resend an invitation'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"75000000-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);
select throws_ok(
  $$select public.resend_company_member_invitation_v1(
    '75000000-0000-4000-8000-000000000101',
    (select (value #>> '{result,invitationId}')::uuid
      from resend_context_test_values where name = 'alpha-invite'),
    2, repeat('f', 64), 'r1-inactive-denied',
    '75000000-0000-4000-8000-000000000307'
  )$$,
  '42501',
  'TENANT_AUTHORIZATION_DENIED',
  'inactive administrator cannot resend an invitation'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"75000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select throws_ok(
  $$select public.resend_company_member_invitation_v1(
    '75000000-0000-4000-8000-000000000101',
    (select (value #>> '{result,invitationId}')::uuid
      from resend_context_test_values where name = 'beta-invite'),
    1, repeat('f', 64), 'r1-cross-tenant',
    '75000000-0000-4000-8000-000000000308'
  )$$,
  'P0002',
  'TENANT_INVITE_NOT_FOUND',
  'cross-tenant resend fails closed as not found'
);

insert into resend_context_test_values values (
  'owner-resend',
  public.resend_company_member_invitation_v1(
    '75000000-0000-4000-8000-000000000101',
    (select (value #>> '{result,invitationId}')::uuid
      from resend_context_test_values where name = 'owner-invite'),
    1,
    repeat('e', 64),
    'r1-owner-resend',
    '75000000-0000-4000-8000-000000000309'
  )
);
select is(
  (select value #>> '{result,intendedRole}' from resend_context_test_values where name = 'owner-resend'),
  'owner',
  'active owner can resend an owner invitation with owner context'
);

reset role;
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'company_member_invitations'
  ),
  0::bigint,
  'no invitation table RLS policy is introduced'
);
select ok(
  not has_table_privilege('anon', 'public.company_member_invitations', 'select'),
  'anon receives no invitation table SELECT'
);

select * from finish();
rollback;
