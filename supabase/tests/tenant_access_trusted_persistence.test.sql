begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(45);

select has_function('public', 'issue_company_member_invitation_v1',
  array['uuid','uuid','text','text','text','text','uuid']);
select has_function('public', 'resend_company_member_invitation_v1',
  array['uuid','uuid','integer','text','text','uuid']);
select has_function('public', 'revoke_company_member_invitation_v1',
  array['uuid','uuid','integer','text','uuid']);
select has_function('public', 'accept_company_member_invitation_v1',
  array['text','text','uuid']);
select has_function('public', 'change_company_member_role_v1',
  array['uuid','uuid','text','text','text','text','uuid']);
select has_function('public', 'deactivate_company_membership_v1',
  array['uuid','uuid','text','text','text','uuid']);
select has_function('public', 'transfer_company_ownership_v1',
  array['uuid','uuid','text','text','boolean','text','uuid']);

select ok(has_function_privilege('authenticated',
  'public.issue_company_member_invitation_v1(uuid,uuid,text,text,text,text,uuid)', 'execute'),
  'authenticated can execute the narrow invitation RPC');
select ok(not has_function_privilege('anon',
  'public.issue_company_member_invitation_v1(uuid,uuid,text,text,text,text,uuid)', 'execute'),
  'anon cannot execute trusted persistence');
select ok(not has_function_privilege('service_role',
  'public.issue_company_member_invitation_v1(uuid,uuid,text,text,text,text,uuid)', 'execute'),
  'service_role has no trusted persistence authority');
select ok(not has_function_privilege('authenticated',
  'public.reserve_tenant_access_operation(uuid,text,text,jsonb,uuid)', 'execute'),
  'authenticated cannot call internal persistence helpers');

insert into auth.users (id, email, email_confirmed_at) values
  ('74000000-0000-4000-8000-000000000001', 'owner@example.com', now()),
  ('74000000-0000-4000-8000-000000000002', 'member@example.com', now()),
  ('74000000-0000-4000-8000-000000000003', 'future-owner@example.com', now()),
  ('74000000-0000-4000-8000-000000000004', 'revoked@example.com', now()),
  ('74000000-0000-4000-8000-000000000005', 'invalid-owner@example.com', now()),
  ('74000000-0000-4000-8000-000000000006', 'expired@example.com', now());

insert into public.companies (id, name, slug) values
  ('74000000-0000-4000-8000-000000000101', 'Trusted Alpha', 'trusted-alpha'),
  ('74000000-0000-4000-8000-000000000102', 'Trusted Beta', 'trusted-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('74000000-0000-4000-8000-000000000111', '74000000-0000-4000-8000-000000000101',
   '74000000-0000-4000-8000-000000000001', 'owner', 'active');

insert into public.people (id, company_id, full_name, email, user_id) values
  ('74000000-0000-4000-8000-000000000201', '74000000-0000-4000-8000-000000000101',
   'Owner', 'owner@example.com', '74000000-0000-4000-8000-000000000001'),
  ('74000000-0000-4000-8000-000000000202', '74000000-0000-4000-8000-000000000101',
   'Member', 'member@example.com', null),
  ('74000000-0000-4000-8000-000000000203', '74000000-0000-4000-8000-000000000101',
   'Future Owner', 'future-owner@example.com', null),
  ('74000000-0000-4000-8000-000000000204', '74000000-0000-4000-8000-000000000101',
   'Revoked', 'revoked@example.com', null),
  ('74000000-0000-4000-8000-000000000205', '74000000-0000-4000-8000-000000000101',
   'Invalid Owner', 'invalid-owner@example.com', null),
  ('74000000-0000-4000-8000-000000000206', '74000000-0000-4000-8000-000000000102',
   'Other Tenant', 'other@example.com', null),
  ('74000000-0000-4000-8000-000000000207', '74000000-0000-4000-8000-000000000101',
   'Expired', 'expired@example.com', null);

create temporary table trusted_test_ids (name text primary key, id uuid not null);
grant select on trusted_test_ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$select public.issue_company_member_invitation_v1(
    '74000000-0000-4000-8000-000000000101', '74000000-0000-4000-8000-000000000202',
    'MEMBER@example.com', 'employee', repeat('a',64), 'issue-member',
    '74000000-0000-4000-8000-000000000301')$$,
  'owner issues a normal invitation');

select is(
  (public.issue_company_member_invitation_v1(
    '74000000-0000-4000-8000-000000000101', '74000000-0000-4000-8000-000000000202',
    'member@example.com', 'employee', repeat('a',64), 'issue-member',
    '74000000-0000-4000-8000-000000000301')->>'status'),
  'idempotent_retry', 'same issue intent is an idempotent retry');

select is(
  (public.issue_company_member_invitation_v1(
    '74000000-0000-4000-8000-000000000101', '74000000-0000-4000-8000-000000000202',
    'member@example.com', 'admin', repeat('a',64), 'issue-member',
    '74000000-0000-4000-8000-000000000301')->>'code'),
  'TENANT_IDEMPOTENCY_CONFLICT',
  'same key with a different intent is rejected');

select throws_ok(
  $$select public.issue_company_member_invitation_v1(
    '74000000-0000-4000-8000-000000000101', '74000000-0000-4000-8000-000000000206',
    'other@example.com', 'employee', repeat('f',64), 'cross-tenant',
    '74000000-0000-4000-8000-000000000302')$$,
  'P0002', 'TENANT_INVITE_NOT_FOUND', 'cross-tenant People linking fails closed');

reset role;
insert into trusted_test_ids values ('member-invitation',
  (select id from public.company_member_invitations
   where person_id='74000000-0000-4000-8000-000000000202'));

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$select public.resend_company_member_invitation_v1(
    '74000000-0000-4000-8000-000000000101',
    (select id from trusted_test_ids where name='member-invitation'),
    1, repeat('b',64), 'resend-member', '74000000-0000-4000-8000-000000000303')$$,
  'resend rotates the digest');
reset role;

select is((select generation from public.company_member_invitations
  where person_id='74000000-0000-4000-8000-000000000202'), 2, 'resend increments generation');
select is((select count(*) from public.tenant_access_audit_events
  where actor_user_id='74000000-0000-4000-8000-000000000001'
    and executor_type='authenticated' and event_type in ('invite.created','invite.resent')),
  2::bigint, 'audit preserves human actor and authenticated executor');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.accept_company_member_invitation_v1(repeat('a',64), 'old-token',
    '74000000-0000-4000-8000-000000000304')$$,
  'P0002', 'TENANT_INVITE_NOT_FOUND', 'rotated token cannot be replayed');
select lives_ok(
  $$select public.accept_company_member_invitation_v1(repeat('b',64), 'accept-member',
    '74000000-0000-4000-8000-000000000305')$$,
  'matching confirmed Auth user accepts normal invitation');
select is((public.accept_company_member_invitation_v1(repeat('b',64), 'accept-member',
  '74000000-0000-4000-8000-000000000305')->>'status'),
  'idempotent_retry', 'accept retry is idempotent');
reset role;

select ok(exists(select 1 from public.company_members where
  company_id='74000000-0000-4000-8000-000000000101'
  and user_id='74000000-0000-4000-8000-000000000002'
  and role='employee' and status='active'), 'accept creates active membership');
select is((select user_id from public.people where id='74000000-0000-4000-8000-000000000202'),
  '74000000-0000-4000-8000-000000000002'::uuid, 'accept links People tenant-aware');
insert into trusted_test_ids values ('member-membership',
  (select id from public.company_members
   where user_id='74000000-0000-4000-8000-000000000002'));

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.issue_company_member_invitation_v1(
    '74000000-0000-4000-8000-000000000101', '74000000-0000-4000-8000-000000000203',
    'future-owner@example.com', 'owner', repeat('c',64), 'issue-owner',
    '74000000-0000-4000-8000-000000000306')$$,
  'active owner issues an owner invitation');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select lives_ok(
  $$select public.accept_company_member_invitation_v1(repeat('c',64), 'accept-owner',
    '74000000-0000-4000-8000-000000000307')$$,
  'invitee accepts owner grant while grantor remains owner');
reset role;

select ok(exists(select 1 from public.company_members where
  company_id='74000000-0000-4000-8000-000000000101'
  and user_id='74000000-0000-4000-8000-000000000003'
  and role='owner' and status='active'), 'owner invitation grants owner without forged actor');
select is((select metadata->>'authorizationSourceUserId' from public.tenant_access_audit_events
  where event_type='membership.created' and target_user_id='74000000-0000-4000-8000-000000000003'),
  '74000000-0000-4000-8000-000000000001', 'owner audit identifies the grantor');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.issue_company_member_invitation_v1(
    '74000000-0000-4000-8000-000000000101', '74000000-0000-4000-8000-000000000205',
    'invalid-owner@example.com', 'owner', repeat('e',64), 'issue-invalid-owner',
    '74000000-0000-4000-8000-000000000313')$$,
  'owner invitation records its current owner grantor');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select lives_ok(
  $$select public.change_company_member_role_v1(
    '74000000-0000-4000-8000-000000000101',
    '74000000-0000-4000-8000-000000000111', 'owner', 'active',
    'admin', 'downgrade-grantor',
    '74000000-0000-4000-8000-000000000314')$$,
  'another owner may downgrade the invitation grantor');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select is((public.accept_company_member_invitation_v1(repeat('e',64), 'accept-invalid-owner',
    '74000000-0000-4000-8000-000000000315')->>'code'),
  'TENANT_OWNER_AUTHORIZATION_INVALID',
  'owner acceptance fails when the recorded grantor is no longer owner');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select lives_ok(
  $$select public.issue_company_member_invitation_v1(
    '74000000-0000-4000-8000-000000000101', '74000000-0000-4000-8000-000000000207',
    'expired@example.com', 'employee', repeat('f',64), 'issue-expired',
    '74000000-0000-4000-8000-000000000316')$$,
  'owner issues invitation used by expiry test');
reset role;
update public.company_member_invitations
set created_at=now()-interval '9 days', expires_at=now()-interval '2 days'
where person_id='74000000-0000-4000-8000-000000000207';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
select is((public.accept_company_member_invitation_v1(repeat('f',64), 'accept-expired',
    '74000000-0000-4000-8000-000000000317')->>'code'),
  'TENANT_INVITE_EXPIRED', 'expired invitation cannot be accepted');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.issue_company_member_invitation_v1(
    '74000000-0000-4000-8000-000000000101', '74000000-0000-4000-8000-000000000204',
    'revoked@example.com', 'employee', repeat('d',64), 'issue-revoked',
    '74000000-0000-4000-8000-000000000308')$$,
  'issue invitation for revocation');
reset role;
insert into trusted_test_ids values ('revoked-invitation',
  (select id from public.company_member_invitations
   where person_id='74000000-0000-4000-8000-000000000204'));

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.revoke_company_member_invitation_v1(
    '74000000-0000-4000-8000-000000000101',
    (select id from trusted_test_ids where name='revoked-invitation'),
    1, 'revoke-invite', '74000000-0000-4000-8000-000000000309')$$,
  'owner revokes a pending invitation');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((public.accept_company_member_invitation_v1(repeat('d',64), 'accept-revoked',
    '74000000-0000-4000-8000-000000000310')->>'code'),
  'TENANT_INVITE_REVOKED', 'revoked invitation cannot be accepted');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select lives_ok(
  $$select public.change_company_member_role_v1(
    '74000000-0000-4000-8000-000000000101',
    (select id from trusted_test_ids where name='member-membership'),
    'employee', 'active', 'manager', 'promote-member',
    '74000000-0000-4000-8000-000000000311')$$,
  'owner changes a non-owner role');
select lives_ok(
  $$select public.transfer_company_ownership_v1(
    '74000000-0000-4000-8000-000000000101',
    (select id from trusted_test_ids where name='member-membership'),
    'manager', 'owner', true, 'transfer-owner',
    '74000000-0000-4000-8000-000000000312')$$,
  'ownership transfer is transactional');
reset role;

select is((select role from public.company_members where user_id='74000000-0000-4000-8000-000000000002'),
  'owner', 'transfer promotes target to owner');
select is((select role from public.company_members where user_id='74000000-0000-4000-8000-000000000003'),
  'admin', 'transfer optionally demotes actor after target promotion');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"74000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select lives_ok(
  $$select public.deactivate_company_membership_v1(
    '74000000-0000-4000-8000-000000000101', '74000000-0000-4000-8000-000000000111',
    'admin', 'active', 'deactivate-former-owner',
    '74000000-0000-4000-8000-000000000318')$$,
  'current owner deactivates a non-owner membership');
reset role;

select is((select status from public.company_members where id='74000000-0000-4000-8000-000000000111'),
  'inactive', 'membership deactivation is persisted');
select is((select user_id from public.people where id='74000000-0000-4000-8000-000000000201'),
  null::uuid, 'membership deactivation unlinks People in the same transaction');
select is((select count(*) from public.tenant_access_audit_events
  where correlation_id='74000000-0000-4000-8000-000000000318'
    and event_type in ('membership.deactivated','person.unlinked')),
  2::bigint, 'deactivation audit records membership and People effects');
select is((select count(*) from public.tenant_access_operations
  where status='failed' and failure_code in (
    'TENANT_INVITE_REVOKED','TENANT_INVITE_EXPIRED','TENANT_OWNER_AUTHORIZATION_INVALID')),
  3::bigint, 'expected terminal failures are persisted with stable codes');
select is((select count(*) from public.tenant_access_audit_events
  where event_type='invite.accepted' and outcome in ('failed','denied')
    and reason_code in (
      'TENANT_INVITE_REVOKED','TENANT_INVITE_EXPIRED','TENANT_OWNER_AUTHORIZATION_INVALID')),
  3::bigint, 'expected terminal failures have durable actor-aware audit');

select * from finish();
rollback;
