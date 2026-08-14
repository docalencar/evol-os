begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(23);

-- ---------------------------------------------------------------------------
-- Static security surface
-- ---------------------------------------------------------------------------
select is(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'select_active_tenant_v1'
      and pg_get_function_identity_arguments(p.oid) = 'p_company_id uuid, p_idempotency_key text, p_correlation_id uuid'
  ),
  true,
  'select_active_tenant_v1 is SECURITY DEFINER'
);

select ok(
  has_function_privilege('authenticated', 'public.select_active_tenant_v1(uuid,text,uuid)', 'execute'),
  'authenticated may execute the tenant-select RPC'
);
select ok(
  not has_function_privilege('anon', 'public.select_active_tenant_v1(uuid,text,uuid)', 'execute'),
  'anon cannot execute the tenant-select RPC'
);
select ok(
  not has_function_privilege('service_role', 'public.select_active_tenant_v1(uuid,text,uuid)', 'execute'),
  'service_role cannot execute the tenant-select RPC'
);
select ok(
  has_table_privilege('authenticated', 'public.tenant_membership_preferences', 'select'),
  'authenticated may read the preference table (self-only via RLS)'
);
select ok(
  not has_table_privilege('authenticated', 'public.tenant_membership_preferences', 'insert'),
  'authenticated has no direct INSERT on the preference table'
);
select ok(
  not has_table_privilege('authenticated', 'public.tenant_membership_preferences', 'update'),
  'authenticated has no direct UPDATE on the preference table'
);
select ok(
  not has_table_privilege('authenticated', 'public.tenant_membership_preferences', 'delete'),
  'authenticated has no direct DELETE on the preference table'
);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, email_confirmed_at) values
  ('76000000-0000-4000-8000-000000000001', 'p7-a@example.com', now()),
  ('76000000-0000-4000-8000-000000000002', 'p7-b@example.com', now());

insert into public.companies (id, name, slug) values
  ('76000000-0000-4000-8000-000000000101', 'P7 Alpha', 'p7-alpha'),
  ('76000000-0000-4000-8000-000000000102', 'P7 Beta', 'p7-beta'),
  ('76000000-0000-4000-8000-000000000103', 'P7 Gamma', 'p7-gamma');

-- user A: active in Alpha and Beta, inactive in Gamma. user B: active in Alpha.
insert into public.company_members (id, company_id, user_id, role, status) values
  ('76000000-0000-4000-8000-000000000111', '76000000-0000-4000-8000-000000000101', '76000000-0000-4000-8000-000000000001', 'owner', 'active'),
  ('76000000-0000-4000-8000-000000000112', '76000000-0000-4000-8000-000000000102', '76000000-0000-4000-8000-000000000001', 'admin', 'active'),
  ('76000000-0000-4000-8000-000000000113', '76000000-0000-4000-8000-000000000103', '76000000-0000-4000-8000-000000000001', 'employee', 'inactive'),
  ('76000000-0000-4000-8000-000000000114', '76000000-0000-4000-8000-000000000101', '76000000-0000-4000-8000-000000000002', 'employee', 'active');

create temporary table p7_results (name text primary key, value jsonb not null);
grant select, insert on p7_results to authenticated;

-- ---------------------------------------------------------------------------
-- Acting as user A
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"76000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

-- Valid selection (Alpha) creates the preference
insert into p7_results values ('alpha', public.select_active_tenant_v1(
  '76000000-0000-4000-8000-000000000101', 'p7-a-alpha', '76000000-0000-4000-8000-000000000301'));

-- Second valid selection (Beta) updates it (upsert, last-write-wins)
insert into p7_results values ('beta', public.select_active_tenant_v1(
  '76000000-0000-4000-8000-000000000102', 'p7-a-beta', '76000000-0000-4000-8000-000000000302'));

-- Idempotent replay of the Beta selection (same idempotency key) returns without a second write
insert into p7_results values ('beta_replay', public.select_active_tenant_v1(
  '76000000-0000-4000-8000-000000000102', 'p7-a-beta', '76000000-0000-4000-8000-000000000302'));

-- Foreign tenant (no membership) is rejected
insert into p7_results values ('gamma_foreign', public.select_active_tenant_v1(
  '76000000-0000-4000-8000-000000000103', 'p7-a-gamma', '76000000-0000-4000-8000-000000000303'));

reset role;

-- Assertions on user A results
select is((select value ->> 'status' from p7_results where name = 'alpha') is null, false, 'alpha selection returned a result');
select is((select value #>> '{result,preferredCompanyId}' from p7_results where name = 'beta'),
  '76000000-0000-4000-8000-000000000102', 'beta selection resolved as succeeded with preferred company');
select is((select value ->> 'status' from p7_results where name = 'gamma_foreign'),
  'denied', 'foreign tenant selection is denied');

-- Preference reflects the latest valid selection (Beta), not Alpha (no last-write lost to foreign attempt)
select is(
  (select preferred_company_id from public.tenant_membership_preferences where user_id = '76000000-0000-4000-8000-000000000001'),
  '76000000-0000-4000-8000-000000000102',
  'preference persisted is the latest valid selection (Beta)'
);

-- Exactly one preference row for user A (upsert, not duplicate)
select is(
  (select count(*)::int from public.tenant_membership_preferences where user_id = '76000000-0000-4000-8000-000000000001'),
  1,
  'exactly one preference row per user'
);

-- Inactive membership (Gamma) is rejected as denied
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"76000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into p7_results values ('gamma_inactive', public.select_active_tenant_v1(
  '76000000-0000-4000-8000-000000000103', 'p7-a-gamma-2', '76000000-0000-4000-8000-000000000304'));
reset role;
select is((select value ->> 'status' from p7_results where name = 'gamma_inactive'),
  'denied', 'inactive membership selection is denied');

-- Membership was not created and role was not changed by any selection
select is(
  (select count(*)::int from public.company_members where user_id = '76000000-0000-4000-8000-000000000001'),
  3,
  'no membership created by tenant selection'
);
select is(
  (select role from public.company_members where company_id = '76000000-0000-4000-8000-000000000101' and user_id = '76000000-0000-4000-8000-000000000001'),
  'owner',
  'role unchanged by tenant selection'
);

-- Audit + operation trail
select is(
  (select count(*)::int from public.tenant_access_audit_events
    where event_type = 'tenant.selected' and target_type = 'tenant_preference'
      and target_user_id = '76000000-0000-4000-8000-000000000001' and outcome = 'succeeded'),
  2,
  'two succeeded tenant.selected audit events for the two valid selections'
);
select ok(
  exists (select 1 from public.tenant_access_operations
    where operation = 'tenant_select' and actor_user_id = '76000000-0000-4000-8000-000000000001' and status = 'succeeded'),
  'tenant_select operations recorded and completed'
);

-- ---------------------------------------------------------------------------
-- RLS isolation: user B
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"76000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

-- user B cannot read user A's preference (self-only RLS)
select is(
  (select count(*)::int from public.tenant_membership_preferences where user_id = '76000000-0000-4000-8000-000000000001'),
  0,
  'user B cannot read user A preference (RLS self-only)'
);

-- user B direct DML on the preference table is blocked (no grants + RLS)
select throws_ok(
  $$ insert into public.tenant_membership_preferences (user_id, preferred_company_id)
     values ('76000000-0000-4000-8000-000000000002', '76000000-0000-4000-8000-000000000101') $$,
  '42501',
  null,
  'authenticated direct INSERT into preference table is blocked'
);
select throws_ok(
  $$ update public.tenant_membership_preferences set preferred_company_id = '76000000-0000-4000-8000-000000000101'
     where user_id = '76000000-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'authenticated direct UPDATE of another user preference is blocked'
);

reset role;

-- user B selecting their own active tenant only writes their own row (not A's)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"76000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into p7_results values ('b_alpha', public.select_active_tenant_v1(
  '76000000-0000-4000-8000-000000000101', 'p7-b-alpha', '76000000-0000-4000-8000-000000000305'));
reset role;

select is(
  (select preferred_company_id from public.tenant_membership_preferences where user_id = '76000000-0000-4000-8000-000000000002'),
  '76000000-0000-4000-8000-000000000101',
  'user B preference set to their own active tenant'
);
select is(
  (select preferred_company_id from public.tenant_membership_preferences where user_id = '76000000-0000-4000-8000-000000000001'),
  '76000000-0000-4000-8000-000000000102',
  'user A preference unaffected by user B selection (isolation)'
);

select finish();
rollback;
