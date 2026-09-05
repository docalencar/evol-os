begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Slice 0121 — the three Career/Seniority tables are CLOSED to PUBLIC/anon/
-- authenticated at the table-privilege level (defense-in-depth beyond RLS).
-- These assertions are catalog-level and environment-independent: after 0121 the
-- REVOKE holds whether or not the environment had inherited default grants.
-- ---------------------------------------------------------------------------

-- 3 tables × {anon, authenticated} × {select, insert, update, delete} = 24 asserts.
select ok(not has_table_privilege('anon','public.seniority_levels','select'),'anon cannot select seniority_levels');
select ok(not has_table_privilege('anon','public.seniority_levels','insert'),'anon cannot insert seniority_levels');
select ok(not has_table_privilege('anon','public.seniority_levels','update'),'anon cannot update seniority_levels');
select ok(not has_table_privilege('anon','public.seniority_levels','delete'),'anon cannot delete seniority_levels');
select ok(not has_table_privilege('authenticated','public.seniority_levels','select'),'authenticated cannot select seniority_levels');
select ok(not has_table_privilege('authenticated','public.seniority_levels','insert'),'authenticated cannot insert seniority_levels');
select ok(not has_table_privilege('authenticated','public.seniority_levels','update'),'authenticated cannot update seniority_levels');
select ok(not has_table_privilege('authenticated','public.seniority_levels','delete'),'authenticated cannot delete seniority_levels');

select ok(not has_table_privilege('anon','public.position_seniority_profiles','select'),'anon cannot select position_seniority_profiles');
select ok(not has_table_privilege('anon','public.position_seniority_profiles','insert'),'anon cannot insert position_seniority_profiles');
select ok(not has_table_privilege('anon','public.position_seniority_profiles','update'),'anon cannot update position_seniority_profiles');
select ok(not has_table_privilege('anon','public.position_seniority_profiles','delete'),'anon cannot delete position_seniority_profiles');
select ok(not has_table_privilege('authenticated','public.position_seniority_profiles','select'),'authenticated cannot select position_seniority_profiles');
select ok(not has_table_privilege('authenticated','public.position_seniority_profiles','insert'),'authenticated cannot insert position_seniority_profiles');
select ok(not has_table_privilege('authenticated','public.position_seniority_profiles','update'),'authenticated cannot update position_seniority_profiles');
select ok(not has_table_privilege('authenticated','public.position_seniority_profiles','delete'),'authenticated cannot delete position_seniority_profiles');

select ok(not has_table_privilege('anon','public.position_seniority_competencies','select'),'anon cannot select position_seniority_competencies');
select ok(not has_table_privilege('anon','public.position_seniority_competencies','insert'),'anon cannot insert position_seniority_competencies');
select ok(not has_table_privilege('anon','public.position_seniority_competencies','update'),'anon cannot update position_seniority_competencies');
select ok(not has_table_privilege('anon','public.position_seniority_competencies','delete'),'anon cannot delete position_seniority_competencies');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','select'),'authenticated cannot select position_seniority_competencies');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','insert'),'authenticated cannot insert position_seniority_competencies');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','update'),'authenticated cannot update position_seniority_competencies');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','delete'),'authenticated cannot delete position_seniority_competencies');

-- The hardening does not remove the tables, RLS, or their policies.
select has_table('public','seniority_levels','seniority_levels still exists');
select has_table('public','position_seniority_profiles','position_seniority_profiles still exists');
select has_table('public','position_seniority_competencies','position_seniority_competencies still exists');
select ok((select relrowsecurity from pg_class where oid='public.seniority_levels'::regclass),'seniority_levels RLS still enabled');
select ok((select relrowsecurity from pg_class where oid='public.position_seniority_profiles'::regclass),'position_seniority_profiles RLS still enabled');
select ok((select relrowsecurity from pg_class where oid='public.position_seniority_competencies'::regclass),'position_seniority_competencies RLS still enabled');
select is((select count(*)::int from pg_policies where schemaname='public' and tablename='seniority_levels'),2,'seniority_levels keeps its two policies');
select is((select count(*)::int from pg_policies where schemaname='public' and tablename='position_seniority_profiles'),2,'position_seniority_profiles keeps its two policies');
select is((select count(*)::int from pg_policies where schemaname='public' and tablename='position_seniority_competencies'),2,'position_seniority_competencies keeps its two policies');

-- Trusted boundaries are untouched: 0121 revokes TABLE privileges only, never
-- function EXECUTE. A representative read/mutation boundary still executes for
-- authenticated.
select ok(
  has_function_privilege('authenticated','public.get_tenant_position_seniority_profiles_v1(uuid,uuid,boolean)','execute'),
  'the profiles read boundary still executes for authenticated (EXECUTE not revoked)');
select ok(
  has_function_privilege('authenticated','public.create_tenant_seniority_level_v1(uuid,text,text,integer,text)','execute'),
  'the seniority-level create boundary still executes for authenticated (EXECUTE not revoked)');

-- The canonical relocation target remains while the compatibility source is retired.
select has_table('public','position_seniority_competencies','the canonical competency matrix remains');
select hasnt_table('public','position_competencies','the legacy competency source is retired');

select * from finish();
rollback;
