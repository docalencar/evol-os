-- PLN-DB3 — deterministic SQLSTATE for Planning version conflicts (0139).
--
-- A stale p_expected_version is a deterministic business conflict, not a
-- serialization failure. Raised as 40001 it was retried 70,598 times through
-- PostgREST and never settled (HTTP 504 after ~64s); as P0001 it settles once,
-- promptly, carrying PLANNING_VERSION_CONFLICT.
--
-- This suite proves the corrected contract holds across EVERY affected boundary,
-- that a losing writer mutates nothing, and that the privilege fingerprint the
-- correction must not disturb is still intact.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- 1. Structural: no Planning boundary may pair 40001 with the conflict message.
--    Catalog-level rather than per-function, so a NEW boundary reintroducing the
--    old contract fails here without anyone remembering to extend this list.
-- ---------------------------------------------------------------------------
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosrc like '%PLANNING_VERSION_CONFLICT%'
      and p.prosrc like '%40001%'),
  0::bigint,
  'no public function pairs SQLSTATE 40001 with PLANNING_VERSION_CONFLICT');

-- Genuine serialization semantics elsewhere are deliberately untouched: other
-- surfaces still raise 40001 for their own conflicts and this slice must not
-- have altered them.
select ok(
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosrc like '%40001%') > 0,
  'SQLSTATE 40001 still exists elsewhere in the schema (not blanket-replaced)');

-- Every corrected boundary, named explicitly.
select ok((select bool_and(p.prosrc like '%P0001%' and p.prosrc like '%PLANNING_VERSION_CONFLICT%')
  from pg_proc p where p.oid in (
    'public.transition_planning_scenario_v1(uuid,text,integer,uuid,text)'::regprocedure,
    'public.create_planning_scenario_branch_v1(uuid,integer,uuid)'::regprocedure,
    'public.rename_planning_scenario_v1(uuid,integer,text)'::regprocedure,
    'public.delete_planning_scenario_v1(uuid,integer)'::regprocedure,
    'public.create_planning_change_set_v1(uuid,integer,uuid,text,jsonb)'::regprocedure,
    'public.replace_planning_change_set_v1(uuid,integer,uuid,uuid,text,jsonb)'::regprocedure,
    'public.remove_planning_change_set_v1(uuid,integer,uuid)'::regprocedure,
    'public.reorder_planning_change_sets_v1(uuid,integer,uuid[])'::regprocedure
  )),'all eight corrected boundaries raise the conflict as P0001');

-- ---------------------------------------------------------------------------
-- 2. Security fingerprint: CREATE OR REPLACE must have disturbed none of it.
-- ---------------------------------------------------------------------------
select ok((select bool_and(p.prosecdef and p.proconfig=array['search_path=public, pg_temp'])
  from pg_proc p where p.oid in (
    'public.create_planning_change_set_v1(uuid,integer,uuid,text,jsonb)'::regprocedure,
    'public.replace_planning_change_set_v1(uuid,integer,uuid,uuid,text,jsonb)'::regprocedure,
    'public.remove_planning_change_set_v1(uuid,integer,uuid)'::regprocedure,
    'public.reorder_planning_change_sets_v1(uuid,integer,uuid[])'::regprocedure
  )),'change-set boundaries remain SECURITY DEFINER with fixed search_path');
select ok((select bool_and(p.prosecdef) from pg_proc p where p.oid in (
    'public.transition_planning_scenario_v1(uuid,text,integer,uuid,text)'::regprocedure,
    'public.create_planning_scenario_branch_v1(uuid,integer,uuid)'::regprocedure,
    'public.rename_planning_scenario_v1(uuid,integer,text)'::regprocedure,
    'public.delete_planning_scenario_v1(uuid,integer)'::regprocedure
  )),'lifecycle and operational boundaries remain SECURITY DEFINER');

select ok((select bool_and(has_function_privilege('authenticated',oid,'execute')) from unnest(array[
  'public.transition_planning_scenario_v1(uuid,text,integer,uuid,text)'::regprocedure,
  'public.create_planning_scenario_branch_v1(uuid,integer,uuid)'::regprocedure,
  'public.rename_planning_scenario_v1(uuid,integer,text)'::regprocedure,
  'public.delete_planning_scenario_v1(uuid,integer)'::regprocedure,
  'public.create_planning_change_set_v1(uuid,integer,uuid,text,jsonb)'::regprocedure,
  'public.replace_planning_change_set_v1(uuid,integer,uuid,uuid,text,jsonb)'::regprocedure,
  'public.remove_planning_change_set_v1(uuid,integer,uuid)'::regprocedure,
  'public.reorder_planning_change_sets_v1(uuid,integer,uuid[])'::regprocedure
]) oid),'authenticated retains EXECUTE on every corrected boundary');

select ok((select bool_and(not has_function_privilege(role,oid,'execute'))
  from unnest(array['public','anon']) role, unnest(array[
    'public.transition_planning_scenario_v1(uuid,text,integer,uuid,text)'::regprocedure,
    'public.create_planning_scenario_branch_v1(uuid,integer,uuid)'::regprocedure,
    'public.rename_planning_scenario_v1(uuid,integer,text)'::regprocedure,
    'public.delete_planning_scenario_v1(uuid,integer)'::regprocedure,
    'public.create_planning_change_set_v1(uuid,integer,uuid,text,jsonb)'::regprocedure,
    'public.replace_planning_change_set_v1(uuid,integer,uuid,uuid,text,jsonb)'::regprocedure,
    'public.remove_planning_change_set_v1(uuid,integer,uuid)'::regprocedure,
    'public.reorder_planning_change_sets_v1(uuid,integer,uuid[])'::regprocedure
  ]) oid),'PUBLIC and anon still cannot execute any corrected boundary');

select ok((select bool_and(not has_table_privilege(role,t,p))
  from unnest(array['public','anon','authenticated']) role,
  unnest(array['public.organization_planning_workspaces','public.organization_planning_scenarios',
    'public.organization_planning_snapshots','public.organization_planning_change_sets']) t,
  unnest(array['select','insert','update','delete']) p),'direct Planning table ACL stays closed');
select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.organization_planning_workspaces'::regclass,'public.organization_planning_scenarios'::regclass,
  'public.organization_planning_snapshots'::regclass,'public.organization_planning_change_sets'::regclass
)),'Planning RLS stays enabled');

-- ---------------------------------------------------------------------------
-- 3. Behavioural fixture.
-- ---------------------------------------------------------------------------
insert into auth.users(id,email) values
 ('e1000000-0000-4000-8000-000000000001','pln-db3-owner@test.local');
insert into public.companies(id,name,slug) values
 ('e2000000-0000-4000-8000-000000000001','PLN-DB3 Alpha','pln-db3-alpha');
insert into public.company_members(company_id,user_id,role,status) values
 ('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','owner','active');
insert into public.organization_planning_workspaces(id,company_id) values
 ('e3000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001');
insert into public.organization_planning_snapshots(id,company_id,workspace_id,version,published_at,organization,kind) values
 ('e4000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001',1,now(),'{}','baseline');
insert into public.organization_planning_scenarios(id,company_id,workspace_id,base_snapshot_id,name,status,version,branch_path) values
 ('e5000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001','Content','draft',1,'e5000000-0000-4000-8000-000000000001'),
 ('e5000000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001','Rename','draft',1,'e5000000-0000-4000-8000-000000000002'),
 ('e5000000-0000-4000-8000-000000000003','e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001','Delete','draft',1,'e5000000-0000-4000-8000-000000000003'),
 ('e5000000-0000-4000-8000-000000000004','e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001','Branch','draft',1,'e5000000-0000-4000-8000-000000000004');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- --- the winner succeeds exactly once -------------------------------------
select is(public.create_planning_change_set_v1('e5000000-0000-4000-8000-000000000001',1,'e6000000-0000-4000-8000-000000000001','department.create','{"department":{"id":"winner","name":"Winner"}}')->'scenario'->>'version','2','winner succeeds and advances the scenario version N -> N+1');

-- --- the stale writer conflicts, deterministically, as P0001 --------------
select throws_ok($$select public.create_planning_change_set_v1('e5000000-0000-4000-8000-000000000001',1,'e6000000-0000-4000-8000-000000000002','team.create','{"team":{"id":"stale"}}')$$,
  'P0001','PLANNING_VERSION_CONFLICT','stale create conflicts as a deterministic business error');

-- Replaying the SAME stale call must be identically deterministic. A retry can
-- never win, which is precisely why 40001 was the wrong contract.
select throws_ok($$select public.create_planning_change_set_v1('e5000000-0000-4000-8000-000000000001',1,'e6000000-0000-4000-8000-000000000002','team.create','{"team":{"id":"stale"}}')$$,
  'P0001','PLANNING_VERSION_CONFLICT','retrying the stale call is equally hopeless (deterministic, not transient)');

-- --- the corrected contract on the operational boundaries -----------------
select throws_ok($$select public.rename_planning_scenario_v1('e5000000-0000-4000-8000-000000000002',9,'Stale rename')$$,
  'P0001','PLANNING_VERSION_CONFLICT','stale rename conflicts as P0001');
select throws_ok($$select public.delete_planning_scenario_v1('e5000000-0000-4000-8000-000000000003',9)$$,
  'P0001','PLANNING_VERSION_CONFLICT','stale delete conflicts as P0001');
select throws_ok($$select public.create_planning_scenario_branch_v1('e5000000-0000-4000-8000-000000000004',9,'e5000000-0000-4000-8000-000000000009')$$,
  'P0001','PLANNING_VERSION_CONFLICT','stale branch conflicts as P0001');

-- ---------------------------------------------------------------------------
-- 4. Zero canonical mutation from every losing writer.
-- ---------------------------------------------------------------------------
reset role;
select is((select version from public.organization_planning_scenarios where id='e5000000-0000-4000-8000-000000000001'),2,'stale content writer leaves the scenario version at the winner''s value');
select is((select count(*) from public.organization_planning_change_sets where scenario_id='e5000000-0000-4000-8000-000000000001'),1::bigint,'stale content writer leaves exactly the winning change set');
select is((select count(*) from public.organization_planning_change_sets where id='e6000000-0000-4000-8000-000000000002'),0::bigint,'stale content writer persists no partial change set');
select is((select payload->'department'->>'id' from public.organization_planning_change_sets where id='e6000000-0000-4000-8000-000000000001'),'winner','the winning payload is untouched by the losing writer');

select is((select name from public.organization_planning_scenarios where id='e5000000-0000-4000-8000-000000000002'),'Rename','stale rename mutates nothing');
select is((select version from public.organization_planning_scenarios where id='e5000000-0000-4000-8000-000000000002'),1,'stale rename leaves the version unchanged');
select is((select count(*) from public.organization_planning_scenarios where id='e5000000-0000-4000-8000-000000000003'),1::bigint,'stale delete removes nothing');
select is((select count(*) from public.organization_planning_scenarios where id='e5000000-0000-4000-8000-000000000009'),0::bigint,'stale branch creates no scenario');
select is((select count(*) from public.organization_planning_snapshots where company_id='e2000000-0000-4000-8000-000000000001'),1::bigint,'no losing writer touched the snapshot ledger');

select * from finish();
rollback;
