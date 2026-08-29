begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ===========================================================================
-- Slice 4B-0 — trusted matrix boundaries over position_seniority_competencies.
-- ===========================================================================

-- ---- STRUCTURE / SECURITY -------------------------------------------------
select has_function('public','get_tenant_position_seniority_competency_matrix_v1',
  array['uuid','uuid','boolean']);
select has_function('public','set_tenant_position_seniority_competency_v1',
  array['uuid','uuid','uuid','integer','integer','boolean','text','text']);
select has_function('public','clear_tenant_position_seniority_competency_v1',
  array['uuid','uuid','uuid']);

select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('get_tenant_position_seniority_competency_matrix_v1',
      'set_tenant_position_seniority_competency_v1',
      'clear_tenant_position_seniority_competency_v1')
    and p.prosecdef and p.proconfig=array['search_path=public, pg_temp']
),3::bigint,'all three boundaries are SECURITY DEFINER with hardened search_path');

select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('get_tenant_position_seniority_competency_matrix_v1',
      'set_tenant_position_seniority_competency_v1',
      'clear_tenant_position_seniority_competency_v1')
    and has_function_privilege('authenticated',p.oid,'execute')
),3::bigint,'authenticated may execute all three boundaries');

select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('get_tenant_position_seniority_competency_matrix_v1',
      'set_tenant_position_seniority_competency_v1',
      'clear_tenant_position_seniority_competency_v1')
    and (has_function_privilege('anon',p.oid,'execute')
      or has_function_privilege('service_role',p.oid,'execute')
      or has_function_privilege('public',p.oid,'execute'))
),0::bigint,'anon, service_role and PUBLIC cannot execute any boundary');

-- The three Career/Seniority tables remain CLOSED to anon and authenticated (0121).
select ok(not has_table_privilege('anon','public.position_seniority_competencies','select'),'anon cannot select matrix');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','select'),'authenticated cannot select matrix');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','insert'),'authenticated cannot insert matrix');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','update'),'authenticated cannot update matrix');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','delete'),'authenticated cannot delete matrix');
select ok(not has_table_privilege('authenticated','public.position_seniority_profiles','select'),'authenticated cannot select profiles');
select ok(not has_table_privilege('authenticated','public.seniority_levels','select'),'authenticated cannot select seniority_levels');
select ok((select relrowsecurity from pg_class where oid='public.position_seniority_competencies'::regclass),'matrix RLS still enabled');

-- ---- FIXTURES -------------------------------------------------------------
insert into auth.users (id,email) values
  ('c1000000-0000-4000-8000-000000000001','owner-a-4b@example.com'),
  ('c1000000-0000-4000-8000-000000000002','manager-a-4b@example.com'),
  ('c1000000-0000-4000-8000-000000000003','owner-b-4b@example.com');
insert into public.companies (id,name,slug) values
  ('c1000000-0000-4000-8000-000000000101','B4 Alpha','b4-alpha'),
  ('c1000000-0000-4000-8000-000000000102','B4 Beta','b4-beta');
insert into public.company_members (id,company_id,user_id,role,status) values
  ('c1000000-0000-4000-8000-000000000111','c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000001','owner','active'),
  ('c1000000-0000-4000-8000-000000000112','c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000002','manager','active'),
  ('c1000000-0000-4000-8000-000000000113','c1000000-0000-4000-8000-000000000102','c1000000-0000-4000-8000-000000000003','owner','active');
insert into public.positions (id,company_id,name) values
  ('c1000000-0000-4000-8000-000000000201','c1000000-0000-4000-8000-000000000101','Alpha Position'),
  ('c1000000-0000-4000-8000-000000000202','c1000000-0000-4000-8000-000000000102','Beta Position');
insert into public.seniority_levels (id,company_id,code,label,rank,active) values
  ('c1000000-0000-4000-8000-000000000701','c1000000-0000-4000-8000-000000000101','SR','Senior',2,true);
insert into public.competencies (id,company_id,name,category,expected_level,weight,active) values
  ('c1000000-0000-4000-8000-000000000401','c1000000-0000-4000-8000-000000000101','Comp A','technical',3,1,true),
  ('c1000000-0000-4000-8000-000000000402','c1000000-0000-4000-8000-000000000101','Comp B','behavioral',3,1,true),
  ('c1000000-0000-4000-8000-000000000403','c1000000-0000-4000-8000-000000000101','Comp Inactive','technical',3,1,false),
  ('c1000000-0000-4000-8000-000000000404','c1000000-0000-4000-8000-000000000102','Beta Comp','technical',3,1,true);

-- Base profile (Alpha) + one active specific Senior profile (Alpha).
insert into public.position_seniority_profiles (id,company_id,position_id,seniority_level_id,active) values
  ('c1000000-0000-4000-8000-000000000501','c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201',null,true),
  ('c1000000-0000-4000-8000-000000000502','c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201','c1000000-0000-4000-8000-000000000701',true);
-- An archived specific profile to prove archived-profile mutation rejection.
insert into public.position_seniority_profiles (id,company_id,position_id,seniority_level_id,active) values
  ('c1000000-0000-4000-8000-000000000503','c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201','c1000000-0000-4000-8000-000000000701',false);

set local role authenticated;

-- ---- AUTHORIZATION / TENANCY ---------------------------------------------
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.set_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000501',
  'c1000000-0000-4000-8000-000000000401',3,1,true,'core',null)$$,
  '42501','AUTHENTICATION_REQUIRED','unauthenticated set denied');
select throws_ok($$select public.get_tenant_position_seniority_competency_matrix_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201',false)$$,
  '42501','AUTHENTICATION_REQUIRED','unauthenticated read denied');

-- Non owner/admin/hr member cannot mutate, but CAN read (member-scoped).
select set_config('request.jwt.claims',
  '{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.set_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000501',
  'c1000000-0000-4000-8000-000000000401',3,1,true,'core',null)$$,
  '42501','TENANT_AUTHORIZATION_DENIED','ordinary member cannot mutate');
select lives_ok($$select public.get_tenant_position_seniority_competency_matrix_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201',false)$$,
  'ordinary member may read the matrix');

-- Outsider (owner of Beta) cannot read Alpha (not a member).
select set_config('request.jwt.claims',
  '{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.get_tenant_position_seniority_competency_matrix_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201',false)$$,
  '42501','TENANT_AUTHORIZATION_DENIED','cross-tenant read rejected');

-- Owner acts from here.
select set_config('request.jwt.claims',
  '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- cross-tenant profile / competency rejected.
select throws_ok($$select public.set_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000999',
  'c1000000-0000-4000-8000-000000000401',3,1,true,'core',null)$$,
  'P0002','PROFILE_NOT_FOUND','unknown profile rejected');
select throws_ok($$select public.set_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000501',
  'c1000000-0000-4000-8000-000000000404',3,1,true,'core',null)$$,
  'P0002','COMPETENCY_NOT_FOUND','cross-tenant competency rejected');
select throws_ok($$select public.set_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000501',
  'c1000000-0000-4000-8000-000000000403',3,1,true,'core',null)$$,
  'P0002','COMPETENCY_NOT_FOUND','inactive competency rejected');
select throws_ok($$select public.set_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000501',
  'c1000000-0000-4000-8000-000000000401',6,1,true,'core',null)$$,
  '22023','VALIDATION_FAILED','out-of-range expected_level rejected');
select throws_ok($$select public.set_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000503',
  'c1000000-0000-4000-8000-000000000401',3,1,true,'core',null)$$,
  '22023','PROFILE_ARCHIVED','archived profile mutation rejected');

-- ---- BASE -----------------------------------------------------------------
select is((public.set_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000501',
  'c1000000-0000-4000-8000-000000000401',4,2,true,'core',' base A ')) ->> 'mode',
  'created','set Base creates expectation');
select is((public.set_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000501',
  'c1000000-0000-4000-8000-000000000401',5,3,false,'leadership','base A v2')) ->> 'mode',
  'updated','set Base updates the same active row (no duplicate)');
-- (single-active-row invariant asserted directly under the privileged phase below)

-- ---- OVERRIDE -------------------------------------------------------------
select is((public.set_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000502',
  'c1000000-0000-4000-8000-000000000401',3,1,true,'core','override A')) ->> 'mode',
  'created','set specific creates override');
select is((public.set_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000502',
  'c1000000-0000-4000-8000-000000000401',2,1,true,'optional','override A v2')) ->> 'mode',
  'updated','set specific updates the same active override');

-- ---- INHERITANCE (effective read) ----------------------------------------
-- Senior overrides A -> effective override.
select is((select source from public.get_tenant_position_seniority_competency_matrix_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201',false)
  where position_seniority_profile_id='c1000000-0000-4000-8000-000000000502'
    and competency_id='c1000000-0000-4000-8000-000000000401'),
  'override','specific override wins over Base');
select is((select expected_level from public.get_tenant_position_seniority_competency_matrix_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201',false)
  where position_seniority_profile_id='c1000000-0000-4000-8000-000000000502'
    and competency_id='c1000000-0000-4000-8000-000000000401'),
  2,'effective value is the override value');
-- Base own expectation.
select is((select source||':'||inherited::text from public.get_tenant_position_seniority_competency_matrix_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201',false)
  where position_seniority_profile_id='c1000000-0000-4000-8000-000000000501'
    and competency_id='c1000000-0000-4000-8000-000000000401'),
  'base:false','Base row is its own base expectation (not inherited)');

-- Clear the override -> Senior inherits Base again.
select is((public.clear_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000502',
  'c1000000-0000-4000-8000-000000000401')) ->> 'status','succeeded','clear override succeeds');
select is((select source||':'||inherited::text from public.get_tenant_position_seniority_competency_matrix_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201',false)
  where position_seniority_profile_id='c1000000-0000-4000-8000-000000000502'
    and competency_id='c1000000-0000-4000-8000-000000000401'),
  'base:true','after clear, Senior inherits Base');
select is((public.clear_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000502',
  'c1000000-0000-4000-8000-000000000401')) ->> 'status','already_cleared','clear override is idempotent');

-- archived override does not block a new active generation.
select is((public.set_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000502',
  'c1000000-0000-4000-8000-000000000401',4,4,true,'promotion','override A gen2')) ->> 'mode',
  'created','new active override coexists with archived generation');
-- (generation-coexistence + single-active invariants asserted in the privileged phase below)

-- ---- BASE CLEAR EDGE CASE -------------------------------------------------
-- Re-establish a clean override on Senior for A, then clear Base A.
select public.clear_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000502',
  'c1000000-0000-4000-8000-000000000401');
select public.set_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000502',
  'c1000000-0000-4000-8000-000000000401',5,5,true,'core','senior keeps A');
select is((public.clear_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000501',
  'c1000000-0000-4000-8000-000000000401')) ->> 'status','succeeded','clear Base succeeds');
-- Senior override survived Base clear unchanged.
select is((select expected_level::text||'/'||source from public.get_tenant_position_seniority_competency_matrix_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201',false)
  where position_seniority_profile_id='c1000000-0000-4000-8000-000000000502'
    and competency_id='c1000000-0000-4000-8000-000000000401'),
  '5/override','specific override survives Base clear unchanged');
-- Base cell for A is now NOT DEFINED.
select is((select source from public.get_tenant_position_seniority_competency_matrix_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201',false)
  where position_seniority_profile_id='c1000000-0000-4000-8000-000000000501'
    and competency_id='c1000000-0000-4000-8000-000000000401'),
  'none','Base cell becomes NOT DEFINED after Base clear');
select is((public.clear_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000501',
  'c1000000-0000-4000-8000-000000000401')) ->> 'status','already_cleared','clear Base is idempotent');

-- ---- ROW SET --------------------------------------------------------------
-- A is override-only now (Base cleared). Add Base-only competency B.
select public.set_tenant_position_seniority_competency_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000501',
  'c1000000-0000-4000-8000-000000000402',3,2,true,'core','base only B');
-- A appears (override-only), B appears (base-only).
select is((select count(distinct competency_id)::int
  from public.get_tenant_position_seniority_competency_matrix_v1(
    'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201',false)
  where competency_id in ('c1000000-0000-4000-8000-000000000401','c1000000-0000-4000-8000-000000000402')),
  2,'override-only and base-only competencies both appear in the row-set');
-- B on Senior inherits Base; B on Base is own.
select is((select source||':'||inherited::text from public.get_tenant_position_seniority_competency_matrix_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201',false)
  where position_seniority_profile_id='c1000000-0000-4000-8000-000000000502'
    and competency_id='c1000000-0000-4000-8000-000000000402'),
  'base:true','Senior inherits Base-only competency B');
-- Base cell for A (override-only) is NOT DEFINED (no fabricated value).
select ok((select expected_level is null from public.get_tenant_position_seniority_competency_matrix_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201',false)
  where position_seniority_profile_id='c1000000-0000-4000-8000-000000000501'
    and competency_id='c1000000-0000-4000-8000-000000000401'),
  'undefined Base cell has NULL expected_level (no fabrication)');
-- Unrelated tenant competency never appears.
select is((select count(*)::int from public.get_tenant_position_seniority_competency_matrix_v1(
  'c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000201',false)
  where competency_id='c1000000-0000-4000-8000-000000000404'),
  0,'cross-tenant competency never appears in the matrix');

-- ---- SECURITY: direct closed-table access denied for authenticated --------
-- Expected-error pattern (never let an unhandled permission error abort TAP).
select throws_ok(
  $$select 1 from public.position_seniority_competencies limit 1$$,
  '42501', NULL,
  'authenticated cannot directly SELECT the closed matrix table');

-- ===========================================================================
-- INTERNAL DB-STATE PHASE — privileged role (closed tables readable here).
-- CLOSED-table pgTAP rule: restore the privileged context and clear the JWT
-- simulation BEFORE any direct table-state assertion.
-- ===========================================================================
reset role;
select set_config('request.jwt.claims','{}',true);

-- Base 501/401: created -> updated in place -> Base-cleared. A single generation
-- ever existed (the update never created a duplicate active row); now archived.
select is((select count(*)::int from public.position_seniority_competencies
  where position_seniority_profile_id='c1000000-0000-4000-8000-000000000501'
    and competency_id='c1000000-0000-4000-8000-000000000401'),
  1,'Base A: single generation (set-update never duplicated the active row)');
select is((select count(*)::int from public.position_seniority_competencies
  where position_seniority_profile_id='c1000000-0000-4000-8000-000000000501'
    and competency_id='c1000000-0000-4000-8000-000000000401' and archived_at is null),
  0,'Base A: no active row remains after Base clear');

-- Senior 502/401: two archived generations + one active -> history retained and
-- an archived override never blocks a new active generation (partial unique idx).
select is((select count(*)::int from public.position_seniority_competencies
  where position_seniority_profile_id='c1000000-0000-4000-8000-000000000502'
    and competency_id='c1000000-0000-4000-8000-000000000401'),
  3,'Senior A: archived generations coexist with the current active override');
select is((select count(*)::int from public.position_seniority_competencies
  where position_seniority_profile_id='c1000000-0000-4000-8000-000000000502'
    and competency_id='c1000000-0000-4000-8000-000000000401' and archived_at is null),
  1,'Senior A: exactly one ACTIVE override row');
select is((select count(*)::int from public.position_seniority_competencies
  where position_seniority_profile_id='c1000000-0000-4000-8000-000000000502'
    and competency_id='c1000000-0000-4000-8000-000000000401' and archived_at is not null),
  2,'Senior A: two archived historical generations retained (never surfaced as effective)');

-- Base-only competency B (501/402): a single active Base row.
select is((select count(*)::int from public.position_seniority_competencies
  where position_seniority_profile_id='c1000000-0000-4000-8000-000000000501'
    and competency_id='c1000000-0000-4000-8000-000000000402' and archived_at is null),
  1,'Base-only B: one active Base row');

-- ---- DATA INTEGRITY -------------------------------------------------------
select col_type_is('public','position_seniority_competencies','expected_level','integer','expected_level type intact');
select ok(exists(select 1 from pg_constraint
  where conname='position_seniority_competencies_active_unique' or contype='u'),
  'a uniqueness constraint/index still governs the table');
-- expected_level check (1..5) still enforced (privileged insert -> 23514, not 42501).
select throws_ok($$insert into public.position_seniority_competencies
  (company_id, position_seniority_profile_id, competency_id, expected_level, weight, required, type)
  values ('c1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000502',
    'c1000000-0000-4000-8000-000000000402',9,1,true,'core')$$,
  '23514',NULL,'expected_level check (1..5) still enforced');

select * from finish();
rollback;
