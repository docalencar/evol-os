begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(20);

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'people_company_user_membership_fkey'
      and condeferrable
      and not condeferred
      and not convalidated
  ),
  'People membership FK is deferrable, immediate and intentionally NOT VALID'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgname = 'enforce_company_member_owner_invariants'
      and not tgisinternal
  ),
  'owner invariant trigger exists'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.enforce_company_member_owner_invariants()',
    'execute'
  ),
  'authenticated cannot invoke the owner guard directly'
);

insert into auth.users (id, email) values
  ('71000000-0000-4000-8000-000000000001', 'phase2-owner-a@example.com'),
  ('71000000-0000-4000-8000-000000000002', 'phase2-owner-b@example.com'),
  ('71000000-0000-4000-8000-000000000003', 'phase2-admin@example.com'),
  ('71000000-0000-4000-8000-000000000004', 'phase2-member@example.com');

insert into public.companies (id, name, slug) values
  ('71000000-0000-4000-8000-000000000101', 'Phase 2 Alpha', 'phase-2-alpha'),
  ('71000000-0000-4000-8000-000000000102', 'Phase 2 Beta', 'phase-2-beta');

select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

insert into public.company_members (company_id, user_id, role) values
  ('71000000-0000-4000-8000-000000000101', '71000000-0000-4000-8000-000000000001', 'owner');

select lives_ok(
  $$insert into public.people (company_id, user_id, full_name)
    values (
      '71000000-0000-4000-8000-000000000101',
      '71000000-0000-4000-8000-000000000001',
      'Owner A'
    )$$,
  'linked People with matching tenant membership is accepted'
);

select throws_ok(
  $$insert into public.people (company_id, user_id, full_name)
    values (
      '71000000-0000-4000-8000-000000000102',
      '71000000-0000-4000-8000-000000000001',
      'Cross Tenant'
    )$$,
  '23503',
  null,
  'cross-tenant People linking is rejected'
);

select throws_ok(
  $$insert into public.people (company_id, user_id, full_name)
    values (
      '71000000-0000-4000-8000-000000000101',
      '71000000-0000-4000-8000-000000000004',
      'No Membership'
    )$$,
  '23503',
  null,
  'linked People without matching membership is rejected'
);

select lives_ok(
  $$insert into public.people (company_id, full_name)
    values ('71000000-0000-4000-8000-000000000101', 'Without Auth')$$,
  'People without Auth identity remains allowed'
);

insert into public.company_members (company_id, user_id, role) values
  ('71000000-0000-4000-8000-000000000101', '71000000-0000-4000-8000-000000000003', 'admin'),
  ('71000000-0000-4000-8000-000000000101', '71000000-0000-4000-8000-000000000004', 'employee');

select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);

select throws_ok(
  $$update public.company_members
    set status = 'inactive'
    where company_id = '71000000-0000-4000-8000-000000000101'
      and user_id = '71000000-0000-4000-8000-000000000001'$$,
  '42501',
  'OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER',
  'admin cannot deactivate owner'
);

select throws_ok(
  $$update public.company_members
    set role = 'owner'
    where company_id = '71000000-0000-4000-8000-000000000101'
      and user_id = '71000000-0000-4000-8000-000000000003'$$,
  '42501',
  'OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER',
  'admin cannot promote itself to owner'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $$update public.company_members
    set role = 'admin'
    where company_id = '71000000-0000-4000-8000-000000000101'
      and user_id = '71000000-0000-4000-8000-000000000001'$$,
  '23514',
  'LAST_ACTIVE_OWNER_REQUIRED',
  'last active owner cannot be demoted'
);

select throws_ok(
  $$delete from public.company_members
    where company_id = '71000000-0000-4000-8000-000000000101'
      and user_id = '71000000-0000-4000-8000-000000000001'$$,
  '23514',
  'LAST_ACTIVE_OWNER_REQUIRED',
  'last active owner cannot be deleted'
);

select lives_ok(
  $$insert into public.company_members (company_id, user_id, role)
    values (
      '71000000-0000-4000-8000-000000000101',
      '71000000-0000-4000-8000-000000000002',
      'owner'
    )$$,
  'active owner can promote another owner'
);

select lives_ok(
  $$update public.company_members
    set role = 'admin'
    where company_id = '71000000-0000-4000-8000-000000000101'
      and user_id = '71000000-0000-4000-8000-000000000002'$$,
  'active owner can administer another owner while one remains'
);

select is(
  (
    select count(*)
    from public.company_members
    where company_id = '71000000-0000-4000-8000-000000000101'
      and role = 'owner'
      and status = 'active'
  ),
  1::bigint,
  'one active owner remains after permitted administration'
);

select set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  true
);
set local role service_role;

select throws_ok(
  $$update public.company_members
    set role = 'owner'
    where company_id = '71000000-0000-4000-8000-000000000101'
      and user_id = '71000000-0000-4000-8000-000000000003'$$,
  '42501',
  null,
  'service role cannot act as owner'
);

select throws_ok(
  $$insert into public.company_members (company_id, user_id, role)
    values (
      '71000000-0000-4000-8000-000000000102',
      '71000000-0000-4000-8000-000000000002',
      'owner'
    )$$,
  '42501',
  null,
  'service role cannot bootstrap ownership without a human actor'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$update public.company_members
    set status = 'inactive'
    where company_id = '71000000-0000-4000-8000-000000000101'
      and user_id = '71000000-0000-4000-8000-000000000004'$$,
  'non-owner membership lifecycle remains unchanged in Phase 2'
);

select ok(
  not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'people_company_user_key'
  ),
  'People/Auth unique enforcement remains gated by target preflight'
);

select is(
  (
    select count(*)
    from public.company_members
    where status = 'invited'
  ),
  0::bigint,
  'test baseline does not reinterpret legacy invited memberships'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'company_members'
      and policyname ilike '%phase 2%'
  ),
  'Phase 2 does not perform the RLS cutover'
);

select * from finish();
rollback;
