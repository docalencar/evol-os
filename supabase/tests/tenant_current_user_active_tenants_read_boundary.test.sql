begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(27);

-- Static contract and privilege surface.
select has_function('public', 'get_current_user_active_tenants_v1', array[]::text[]);
select is((select prosecdef from pg_proc where oid =
  'public.get_current_user_active_tenants_v1()'::regprocedure), true,
  'active-tenants read boundary is SECURITY DEFINER');
select is((select provolatile from pg_proc where oid =
  'public.get_current_user_active_tenants_v1()'::regprocedure), 's'::"char",
  'active-tenants read boundary is STABLE');
select is((select proconfig from pg_proc where oid =
  'public.get_current_user_active_tenants_v1()'::regprocedure),
  array['search_path=public, pg_temp']::text[], 'search_path is hardened');
select is((select pronargs from pg_proc where oid =
  'public.get_current_user_active_tenants_v1()'::regprocedure), 0::smallint,
  'read boundary accepts no selectors');
select is((select proargnames from pg_proc where oid =
  'public.get_current_user_active_tenants_v1()'::regprocedure),
  array['company_id', 'company_name', 'membership_role']::text[],
  'return column names are exact');
select is((select array_agg(format_type(type_oid, null) order by ordinal)
  from (select type_oid, ordinal from pg_proc p,
    unnest(p.proallargtypes) with ordinality as t(type_oid, ordinal)
    where p.oid = 'public.get_current_user_active_tenants_v1()'::regprocedure
  ) as output_types), array['uuid', 'text', 'text']::text[],
  'return column types are exact');
select ok(not ((select proargnames from pg_proc where oid =
  'public.get_current_user_active_tenants_v1()'::regprocedure) && array[
    'user_id', 'membership_id', 'person_id', 'email', 'token', 'token_digest',
    'actor_user_id', 'preference', 'audit_id', 'correlation_id', 'idempotency_id'
  ]::text[]), 'return contract excludes identity, secret and operational fields');
select ok(has_function_privilege('authenticated',
  'public.get_current_user_active_tenants_v1()', 'execute'),
  'authenticated can execute the read boundary');
select ok(not has_function_privilege('anon',
  'public.get_current_user_active_tenants_v1()', 'execute'),
  'anon cannot execute the read boundary');
select ok(not has_function_privilege('service_role',
  'public.get_current_user_active_tenants_v1()', 'execute'),
  'service_role has no human read-boundary authority');
select ok(not has_function_privilege('public',
  'public.get_current_user_active_tenants_v1()', 'execute'),
  'PUBLIC cannot execute the read boundary');
select ok(not has_table_privilege('authenticated',
  'public.company_members', 'select'),
  'authenticated still cannot SELECT company_members directly');
select is((select count(*) from pg_policies where schemaname = 'public'
  and tablename = 'company_members'), 1::bigint,
  'no company_members policy was added');

-- Fixtures: no-membership, single, multi-tenant and foreign users.
insert into auth.users (id, email, email_confirmed_at) values
  ('81000000-0000-4000-8000-000000000001', 'active-zero@example.com', now()),
  ('81000000-0000-4000-8000-000000000002', 'active-single@example.com', now()),
  ('81000000-0000-4000-8000-000000000003', 'active-multi@example.com', now()),
  ('81000000-0000-4000-8000-000000000004', 'active-other@example.com', now());

insert into public.companies (id, name, slug) values
  ('81000000-0000-4000-8000-000000000101', 'Active Alpha', 'active-alpha'),
  ('81000000-0000-4000-8000-000000000102', 'Active Beta', 'active-beta'),
  ('81000000-0000-4000-8000-000000000103', 'Inactive Gamma', 'inactive-gamma'),
  ('81000000-0000-4000-8000-000000000104', 'Invited Delta', 'invited-delta'),
  ('81000000-0000-4000-8000-000000000105', 'Foreign Epsilon', 'foreign-epsilon');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('81000000-0000-4000-8000-000000000111', '81000000-0000-4000-8000-000000000101', '81000000-0000-4000-8000-000000000002', 'owner', 'active'),
  ('81000000-0000-4000-8000-000000000112', '81000000-0000-4000-8000-000000000103', '81000000-0000-4000-8000-000000000002', 'employee', 'inactive'),
  ('81000000-0000-4000-8000-000000000113', '81000000-0000-4000-8000-000000000104', '81000000-0000-4000-8000-000000000002', 'employee', 'invited'),
  ('81000000-0000-4000-8000-000000000114', '81000000-0000-4000-8000-000000000102', '81000000-0000-4000-8000-000000000003', 'admin', 'active'),
  ('81000000-0000-4000-8000-000000000115', '81000000-0000-4000-8000-000000000101', '81000000-0000-4000-8000-000000000003', 'employee', 'active'),
  ('81000000-0000-4000-8000-000000000116', '81000000-0000-4000-8000-000000000105', '81000000-0000-4000-8000-000000000004', 'owner', 'active');

-- Zero memberships.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.get_current_user_active_tenants_v1()),
  0::bigint, 'zero active memberships returns zero rows');
reset role;

-- One active membership; inactive, invited and cross-user rows are excluded.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.get_current_user_active_tenants_v1()),
  1::bigint, 'single active membership returns one row');
select is((select company_id from public.get_current_user_active_tenants_v1()),
  '81000000-0000-4000-8000-000000000101'::uuid, 'single result has the correct company id');
select is((select company_name from public.get_current_user_active_tenants_v1()),
  'Active Alpha', 'single result has the correct company name');
select is((select membership_role from public.get_current_user_active_tenants_v1()),
  'owner', 'single result preserves the stored membership role');
select ok(not exists(select 1 from public.get_current_user_active_tenants_v1()
  where company_id = '81000000-0000-4000-8000-000000000103'),
  'inactive membership is excluded');
select ok(not exists(select 1 from public.get_current_user_active_tenants_v1()
  where company_id = '81000000-0000-4000-8000-000000000104'),
  'invited membership is excluded');
select ok(not exists(select 1 from public.get_current_user_active_tenants_v1()
  where company_id = '81000000-0000-4000-8000-000000000105'),
  'another user membership is excluded');
reset role;

-- Multi-tenant identity and deterministic ordering.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.get_current_user_active_tenants_v1()),
  2::bigint, 'multi-tenant user receives every own active membership');
select is((select array_agg(company_id) from public.get_current_user_active_tenants_v1()),
  array[
    '81000000-0000-4000-8000-000000000101'::uuid,
    '81000000-0000-4000-8000-000000000102'::uuid
  ], 'multi-tenant rows are ordered deterministically by company id');
select is((select array_agg(company_name || ':' || membership_role)
  from public.get_current_user_active_tenants_v1()),
  array['Active Alpha:employee', 'Active Beta:admin']::text[],
  'multi-tenant projection preserves each company name and stored role');
reset role;

-- The function itself rejects a missing authenticated actor, even for a role
-- that could otherwise execute it through ownership/superuser privileges.
select set_config('request.jwt.claims', '{}', true);
select throws_ok(
  $$select * from public.get_current_user_active_tenants_v1()$$,
  '42501', 'AUTHENTICATION_REQUIRED',
  'missing auth.uid is rejected explicitly');

set local role anon;
select throws_ok(
  $$select * from public.get_current_user_active_tenants_v1()$$,
  '42501', null,
  'anon cannot execute the read boundary');
reset role;

select * from finish();
rollback;
