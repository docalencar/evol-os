begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Function contract.
-- ---------------------------------------------------------------------------
select has_function('public','get_tenant_seniority_levels_v1',array['uuid','boolean']);

select ok((select p.prosecdef and p.provolatile='s' and p.proconfig=array['search_path=public, pg_temp']::text[]
  from pg_proc p where p.oid='public.get_tenant_seniority_levels_v1(uuid,boolean)'::regprocedure),
  'read boundary is STABLE SECURITY DEFINER with hardened search_path');
select ok(has_function_privilege('authenticated','public.get_tenant_seniority_levels_v1(uuid,boolean)','execute'),
  'authenticated may execute the read boundary');
select ok(not has_function_privilege('anon','public.get_tenant_seniority_levels_v1(uuid,boolean)','execute'),
  'anon cannot execute the read boundary');
select ok(not has_function_privilege('service_role','public.get_tenant_seniority_levels_v1(uuid,boolean)','execute'),
  'service_role cannot execute the read boundary');

-- No table SELECT grant was added by this migration.
select ok(not has_table_privilege('authenticated','public.seniority_levels','select'),
  'authenticated still has no direct SELECT on seniority_levels');
select ok(not has_table_privilege('anon','public.seniority_levels','select'),
  'anon still has no direct SELECT on seniority_levels');

-- Return shape does not leak company_id.
select is((select count(*)::int from information_schema.routines r
   join information_schema.parameters pa on pa.specific_name = r.specific_name
   where r.routine_name='get_tenant_seniority_levels_v1' and pa.parameter_mode='OUT'
     and pa.parameter_name='company_id'),
  0,'the read boundary does not return company_id (no tenant leak)');

-- ---------------------------------------------------------------------------
-- Fixtures: Alpha (owner + employee members), Beta foreign. Seeded directly as
-- the setup role (bypasses RLS/grants). Alpha: two active levels + one archived.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a1000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('a1000000-0000-4000-8000-000000000005','employee-a@example.com'),
  ('a1000000-0000-4000-8000-000000000008','owner-b@example.com');
insert into public.companies (id, name, slug) values
  ('a1000000-0000-4000-8000-000000000101','SR Alpha','sr-alpha'),
  ('a1000000-0000-4000-8000-000000000102','SR Beta','sr-beta');
insert into public.company_members (id, company_id, user_id, role, status) values
  ('a1000000-0000-4000-8000-000000000111','a1000000-0000-4000-8000-000000000101','a1000000-0000-4000-8000-000000000001','owner','active'),
  ('a1000000-0000-4000-8000-000000000115','a1000000-0000-4000-8000-000000000101','a1000000-0000-4000-8000-000000000005','employee','active'),
  ('a1000000-0000-4000-8000-000000000118','a1000000-0000-4000-8000-000000000102','a1000000-0000-4000-8000-000000000008','owner','active');
insert into public.seniority_levels (id, company_id, code, label, rank, active) values
  ('a1000000-0000-4000-8000-000000000201','a1000000-0000-4000-8000-000000000101','JR','Júnior',10,true),
  ('a1000000-0000-4000-8000-000000000202','a1000000-0000-4000-8000-000000000101','PL','Pleno',20,true),
  ('a1000000-0000-4000-8000-000000000203','a1000000-0000-4000-8000-000000000101','OLD','Arquivado',5,false),
  ('a1000000-0000-4000-8000-000000000209','a1000000-0000-4000-8000-000000000102','BSR','Beta Sênior',10,true);

-- ---------------------------------------------------------------------------
-- Read as a NON-privileged active member (employee): reads are membership-gated.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000005","role":"authenticated"}',true);

-- Default: only active levels of the caller's tenant.
select is(
  (select count(*)::int from public.get_tenant_seniority_levels_v1('a1000000-0000-4000-8000-000000000101')),
  2,'a member reads the active seniority levels of the tenant (archived excluded)');

-- Ordering is deterministic by rank asc (JR rank 10 before PL rank 20).
select is(
  (select code from public.get_tenant_seniority_levels_v1('a1000000-0000-4000-8000-000000000101') limit 1),
  'JR','levels are ordered by rank ascending');

-- include_inactive returns the archived level too.
select is(
  (select count(*)::int from public.get_tenant_seniority_levels_v1('a1000000-0000-4000-8000-000000000101', true)),
  3,'include_inactive returns archived levels');
select is(
  (select count(*)::int from public.get_tenant_seniority_levels_v1('a1000000-0000-4000-8000-000000000101', false)),
  2,'explicit include_inactive=false returns only active');

-- No Beta rows leak into an Alpha read.
select is(
  (select count(*)::int from public.get_tenant_seniority_levels_v1('a1000000-0000-4000-8000-000000000101', true)
   where code = 'BSR'),
  0,'a foreign-tenant level never appears in a tenant read');

-- Cross-tenant: an Alpha member reading Beta's catalog is denied (not a member).
select throws_ok(
  $$select * from public.get_tenant_seniority_levels_v1('a1000000-0000-4000-8000-000000000102')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','a non-member cannot read a foreign tenant catalog');
reset role;

-- Unauthenticated denied.
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok(
  $$select * from public.get_tenant_seniority_levels_v1('a1000000-0000-4000-8000-000000000101')$$,
  '42501','AUTHENTICATION_REQUIRED','an unauthenticated actor cannot read the catalog');
reset role;

-- The read did not mutate data (row count unchanged).
select is((select count(*)::int from public.seniority_levels where company_id='a1000000-0000-4000-8000-000000000101'),
  3,'the read boundary does not mutate the catalog');

select * from finish();
rollback;
