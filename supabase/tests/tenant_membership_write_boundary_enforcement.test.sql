begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

-- MVP-PR1 Phase 8 (PR 8B). Enforcement of the RPC-only write boundary on
-- company_members after migration 0077 drops the legacy "owners and admins manage
-- company members" FOR ALL policy.
--
-- The real write boundary is two-layered: (1) no direct table grant to
-- authenticated/anon (PR 8A), and (2) after 0077, no INSERT/UPDATE/DELETE policy
-- under RLS, so even where a table grant exists the write is default-denied. Reads
-- stay available through the preserved SELECT policy, and the trusted SECURITY
-- DEFINER RPCs (owned by the table owner, no FORCE RLS) still mutate freely. Direct
-- DML in the test DB is denied at the privilege layer; we characterize the real
-- boundary rather than fabricate a grant to exercise RLS.
select plan(20);

-- ---------------------------------------------------------------------------
-- A. Schema / policy inventory (static)
-- ---------------------------------------------------------------------------
select ok(
  (select relrowsecurity from pg_class where oid = 'public.company_members'::regclass),
  'RLS remains enabled on company_members');
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'company_members'
     and policyname = 'owners and admins manage company members'),
  0, 'the legacy generic FOR ALL write policy is removed');
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'company_members' and cmd <> 'SELECT'),
  0, 'no INSERT/UPDATE/DELETE/ALL policy remains on company_members (RPC-only writes)');
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'company_members'
     and policyname = 'members can read company members' and cmd = 'SELECT'),
  1, 'the members SELECT read policy is preserved');

-- ---------------------------------------------------------------------------
-- B. Grants (real boundary, static)
-- ---------------------------------------------------------------------------
select ok(not has_table_privilege('authenticated', 'public.company_members', 'insert'),
  'authenticated has no direct INSERT on company_members');
select ok(not has_table_privilege('authenticated', 'public.company_members', 'update'),
  'authenticated has no direct UPDATE on company_members');
select ok(not has_table_privilege('authenticated', 'public.company_members', 'delete'),
  'authenticated has no direct DELETE on company_members');
select ok(not has_table_privilege('anon', 'public.company_members', 'select'),
  'anon has no direct SELECT on company_members');
select ok(not has_table_privilege('anon', 'public.company_members', 'update'),
  'anon has no direct UPDATE on company_members');

-- ---------------------------------------------------------------------------
-- C. Trusted RPC surface: the human mutation path is intact; anon and service_role
--    are not on it.
-- ---------------------------------------------------------------------------
select ok(has_function_privilege('authenticated', 'public.change_company_member_role_v1(uuid,uuid,text,text,text,text,uuid)', 'execute'),
  'authenticated retains the role-change RPC');
select ok(has_function_privilege('authenticated', 'public.deactivate_company_membership_v1(uuid,uuid,text,text,text,uuid)', 'execute'),
  'authenticated retains the deactivate RPC');
select ok(has_function_privilege('authenticated', 'public.transfer_company_ownership_v1(uuid,uuid,text,text,boolean,text,uuid)', 'execute'),
  'authenticated retains the ownership-transfer RPC');
select ok(not has_function_privilege('service_role', 'public.change_company_member_role_v1(uuid,uuid,text,text,text,text,uuid)', 'execute'),
  'service_role is not on the human mutation path');
select ok(not has_function_privilege('anon', 'public.change_company_member_role_v1(uuid,uuid,text,text,text,text,uuid)', 'execute'),
  'anon cannot execute the role-change RPC');

-- ---------------------------------------------------------------------------
-- Fixtures (superuser: not subject to the missing grant or to RLS). Exactly one
-- direct-DML owner per company (the bootstrap the owner trigger permits).
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('83000000-0000-4000-8000-000000000001', 'ownerA@example.com'),
  ('83000000-0000-4000-8000-000000000002', 'memberA@example.com'),
  ('83000000-0000-4000-8000-000000000003', 'stranger@example.com'),
  ('83000000-0000-4000-8000-000000000004', 'ownerB@example.com');

insert into public.companies (id, name, slug) values
  ('83000000-0000-4000-8000-000000000101', 'WB Alpha', 'wb-alpha'),
  ('83000000-0000-4000-8000-000000000102', 'WB Beta', 'wb-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('83000000-0000-4000-8000-000000000111', '83000000-0000-4000-8000-000000000101', '83000000-0000-4000-8000-000000000001', 'owner', 'active'),
  ('83000000-0000-4000-8000-000000000112', '83000000-0000-4000-8000-000000000101', '83000000-0000-4000-8000-000000000002', 'employee', 'active'),
  ('83000000-0000-4000-8000-000000000113', '83000000-0000-4000-8000-000000000102', '83000000-0000-4000-8000-000000000004', 'owner', 'active');

insert into public.people (id, company_id, user_id, full_name, email, status) values
  ('83000000-0000-4000-8000-000000000201', '83000000-0000-4000-8000-000000000101', '83000000-0000-4000-8000-000000000001', 'Owner A', 'ownerA@example.com', 'active'),
  ('83000000-0000-4000-8000-000000000202', '83000000-0000-4000-8000-000000000101', '83000000-0000-4000-8000-000000000002', 'Member A', 'memberA@example.com', 'active'),
  ('83000000-0000-4000-8000-000000000204', '83000000-0000-4000-8000-000000000102', '83000000-0000-4000-8000-000000000004', 'Owner B', 'ownerB@example.com', 'active');

-- ---------------------------------------------------------------------------
-- D. Trusted path still mutates after the policy drop; direct DML is denied;
--    unauthorized / cross-tenant / last-owner all fail closed.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"83000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$select public.change_company_member_role_v1(
      '83000000-0000-4000-8000-000000000101', '83000000-0000-4000-8000-000000000112',
      'employee', 'active', 'manager', 'wb-role-ok',
      '83000000-0000-4000-8000-000000000301')$$,
  'owner changes a non-owner role through the RPC after the write policy is removed');

select throws_ok(
  $$update public.company_members set role = 'admin'
    where id = '83000000-0000-4000-8000-000000000112'$$,
  '42501', null,
  'direct UPDATE of company_members is denied for authenticated (42501; no grant / RLS default-deny where granted)');

reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"83000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.change_company_member_role_v1(
      '83000000-0000-4000-8000-000000000101', '83000000-0000-4000-8000-000000000112',
      'manager', 'active', 'admin', 'wb-role-unauth',
      '83000000-0000-4000-8000-000000000302')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED',
  'a non-member actor is denied by the trusted RPC');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"83000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select throws_ok(
  $$select public.change_company_member_role_v1(
      '83000000-0000-4000-8000-000000000101', '83000000-0000-4000-8000-000000000112',
      'manager', 'active', 'admin', 'wb-role-xtenant',
      '83000000-0000-4000-8000-000000000303')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED',
  'an owner of another tenant is denied in this tenant (cross-tenant)');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"83000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.deactivate_company_membership_v1(
      '83000000-0000-4000-8000-000000000101', '83000000-0000-4000-8000-000000000111',
      'owner', 'active', 'wb-deact-lastowner',
      '83000000-0000-4000-8000-000000000304')$$,
  '23514', 'LAST_ACTIVE_OWNER_REQUIRED',
  'the last active owner cannot be deactivated even through the RPC (invariant intact)');
reset role;

-- The successful RPC mutation persisted (read as superuser, bypassing grant/RLS).
select is(
  (select role from public.company_members where id = '83000000-0000-4000-8000-000000000112'),
  'manager', 'the RPC role change persisted through the trusted path');

select finish();
rollback;
