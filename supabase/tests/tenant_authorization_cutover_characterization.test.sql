begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

-- MVP-PR1 Phase 8 (PR 8A). Characterization of the CURRENT authorization state
-- before the Phase 8B/8C cutover.
--
-- Two enforcement layers protect the core tenant tables (companies,
-- company_members, people):
--   1. TABLE PRIVILEGE. `authenticated` has NO direct grant on these tables, so
--      a direct SELECT/INSERT/UPDATE/DELETE fails with "permission denied" BEFORE
--      any RLS policy is evaluated. All human reads/writes flow through
--      SECURITY DEFINER helpers (is_company_member / has_company_role) and the
--      trusted RPCs. Table privilege is checked ahead of RLS; RLS never grants a
--      privilege the role lacks, so a policy cannot be exercised without the grant.
--   2. SECURITY DEFINER AUTHORITY. Authority is derived from active membership in
--      the database, from auth.uid(), never from JWT metadata.
--
-- This test proves the invariants that already hold today (active membership,
-- tenant isolation, authority sources) THROUGH THE REAL PERMITTED PATH, and
-- characterizes the true write boundary. The Phase 8B/8C targets are LATENT
-- defense-in-depth surfaces reachable only by grant-holding roles (the trusted
-- SECURITY DEFINER RPCs / service_role), NOT a currently reachable `authenticated`
-- hole: 8B removes the latent RLS write policy on company_members; 8C hardens the
-- people.user_id null->value trigger path that the accept RPC is meant to own.
select plan(24);

-- ---------------------------------------------------------------------------
-- Static surface: SECURITY DEFINER helpers + trusted RPC execution grants
-- ---------------------------------------------------------------------------
select is(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'is_company_member'),
  true, 'is_company_member is SECURITY DEFINER');
select is(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'has_company_role'),
  true, 'has_company_role is SECURITY DEFINER');
select is(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'change_company_member_role_v1'),
  true, 'change_company_member_role_v1 is SECURITY DEFINER');
select ok(
  has_function_privilege('authenticated', 'public.change_company_member_role_v1(uuid,uuid,text,text,text,text,uuid)', 'execute'),
  'authenticated may execute the role-change RPC');
select ok(
  not has_function_privilege('anon', 'public.change_company_member_role_v1(uuid,uuid,text,text,text,text,uuid)', 'execute'),
  'anon cannot execute the role-change RPC');
select ok(
  has_function_privilege('authenticated', 'public.create_company_with_owner(text,text)', 'execute'),
  'authenticated may execute the onboarding bootstrap');
select ok(
  not has_function_privilege('anon', 'public.create_company_with_owner(text,text)', 'execute'),
  'anon cannot execute the onboarding bootstrap');

-- ---------------------------------------------------------------------------
-- Real write boundary: the core tenant tables are NOT granted to `authenticated`.
-- Direct DML is denied at the privilege layer (before RLS); the RLS write
-- policies are latent defense-in-depth. This is the true state 8B/8C build on.
-- ---------------------------------------------------------------------------
select ok(
  not has_table_privilege('authenticated', 'public.people', 'select'),
  'authenticated has no direct SELECT on people; tenant reads flow through SECURITY DEFINER');
select ok(
  not has_table_privilege('authenticated', 'public.people', 'update'),
  'authenticated cannot direct-UPDATE people; the people.user_id linkage is owned by the accept RPC (8C hardens the null->value trigger path)');
select ok(
  not has_table_privilege('authenticated', 'public.company_members', 'select'),
  'authenticated has no direct SELECT on company_members; reads flow through the SECURITY DEFINER helpers');
select ok(
  not has_table_privilege('authenticated', 'public.company_members', 'update'),
  'authenticated cannot direct-UPDATE company_members; membership mutations require the trusted RPCs (8B removes the latent RLS write policy)');
select ok(
  not has_table_privilege('authenticated', 'public.company_members', 'insert'),
  'authenticated cannot direct-INSERT company_members');
select ok(
  not has_table_privilege('authenticated', 'public.company_members', 'delete'),
  'authenticated cannot direct-DELETE company_members');
select ok(
  exists(
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'company_members'
      and t.tgname = 'enforce_company_member_owner_invariants'
      and not t.tgisinternal
  ),
  'owner-administration / last-active-owner invariant trigger is installed on company_members');

-- ---------------------------------------------------------------------------
-- Fixtures. Exactly one direct-DML owner per company (the bootstrap the owner
-- trigger permits when member_count = 0); every other row is a non-owner role.
-- Inserted as the default superuser, which is subject to neither the missing
-- authenticated grant nor RLS.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('82000000-0000-4000-8000-000000000001', 'ownerA@example.com'),
  ('82000000-0000-4000-8000-000000000002', 'adminA@example.com'),
  ('82000000-0000-4000-8000-000000000003', 'employeeA@example.com'),
  ('82000000-0000-4000-8000-000000000004', 'inactiveAdminA@example.com'),
  ('82000000-0000-4000-8000-000000000005', 'ownerB@example.com'),
  ('82000000-0000-4000-8000-000000000006', 'hrA@example.com'),
  ('82000000-0000-4000-8000-000000000007', 'stranger@example.com');

insert into public.companies (id, name, slug) values
  ('82000000-0000-4000-8000-000000000101', 'P8 Alpha', 'p8-alpha'),
  ('82000000-0000-4000-8000-000000000102', 'P8 Beta', 'p8-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('82000000-0000-4000-8000-000000000111', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000001', 'owner', 'active'),
  ('82000000-0000-4000-8000-000000000112', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000002', 'admin', 'active'),
  ('82000000-0000-4000-8000-000000000113', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000003', 'employee', 'active'),
  ('82000000-0000-4000-8000-000000000114', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000004', 'admin', 'inactive'),
  ('82000000-0000-4000-8000-000000000115', '82000000-0000-4000-8000-000000000102', '82000000-0000-4000-8000-000000000005', 'owner', 'active'),
  ('82000000-0000-4000-8000-000000000116', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000006', 'hr', 'active');

insert into public.people (id, company_id, user_id, full_name, email, status) values
  ('82000000-0000-4000-8000-000000000201', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000001', 'Owner A', 'ownerA@example.com', 'active'),
  ('82000000-0000-4000-8000-000000000202', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000002', 'Admin A', 'adminA@example.com', 'active'),
  ('82000000-0000-4000-8000-000000000203', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000003', 'Employee A', 'employeeA@example.com', 'active'),
  ('82000000-0000-4000-8000-000000000205', '82000000-0000-4000-8000-000000000102', '82000000-0000-4000-8000-000000000005', 'Owner B', 'ownerB@example.com', 'active'),
  ('82000000-0000-4000-8000-000000000206', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000006', 'HR A', 'hrA@example.com', 'active');

-- ---------------------------------------------------------------------------
-- Authority + isolation through the REAL permitted path (SECURITY DEFINER
-- helpers) as an active owner of Alpha.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is(public.is_company_member('82000000-0000-4000-8000-000000000101'), true, 'active owner is a company member');
select is(public.has_company_role('82000000-0000-4000-8000-000000000101', array['owner','admin']), true, 'active owner satisfies owner/admin role');
select is(public.is_company_member('82000000-0000-4000-8000-000000000102'), false, 'owner of Alpha is not a member of Beta (tenant isolation)');
select is(public.has_company_role('82000000-0000-4000-8000-000000000102', array['owner','admin']), false, 'foreign company grants no role (tenant isolation)');
reset role;

-- ---------------------------------------------------------------------------
-- Inactive privileged member has no authority (active membership is required).
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is(public.is_company_member('82000000-0000-4000-8000-000000000101'), false, 'inactive admin is not an active member');
select is(public.has_company_role('82000000-0000-4000-8000-000000000101', array['owner','admin']), false, 'inactive admin has no role authority');
reset role;

-- ---------------------------------------------------------------------------
-- Active employee is a member but holds no elevated role.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(public.is_company_member('82000000-0000-4000-8000-000000000101'), true, 'active employee is a company member');
select is(public.has_company_role('82000000-0000-4000-8000-000000000101', array['owner','admin']), false, 'employee does not satisfy owner/admin');
reset role;

-- ---------------------------------------------------------------------------
-- Authority source: forged JWT metadata grants nothing (authority is DB membership).
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-000000000003","role":"authenticated","user_role":"owner","company_id":"82000000-0000-4000-8000-000000000101"}', true);
select is(public.has_company_role('82000000-0000-4000-8000-000000000101', array['owner','admin']), false, 'forged owner/company JWT claims grant no role');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-000000000007","role":"authenticated","company_id":"82000000-0000-4000-8000-000000000101"}', true);
select is(public.is_company_member('82000000-0000-4000-8000-000000000101'), false, 'forged company JWT claim does not create membership');
reset role;

select finish();
rollback;
