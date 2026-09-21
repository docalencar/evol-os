begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select no_plan();

-- Object, ACL and security posture.
select has_table('public','organization_planning_lifecycle_audit','Planning lifecycle audit exists');
select has_function('public','transition_planning_scenario_v1',array['uuid','text','integer','uuid','text']);
select has_function('public','get_planning_scenario_lifecycle_v1',array['uuid']);
select has_function('public','publish_planning_scenario_v1',array['uuid','integer','uuid','jsonb','jsonb']);
select ok((select bool_and(p.prosecdef and p.proconfig=array['search_path=public, pg_temp']) from pg_proc p where p.oid in (
  'public.transition_planning_scenario_v1(uuid,text,integer,uuid,text)'::regprocedure,
  'public.get_planning_scenario_lifecycle_v1(uuid)'::regprocedure,
  'public.publish_planning_scenario_v1(uuid,integer,uuid,jsonb,jsonb)'::regprocedure
)),'trusted Planning boundaries are SECURITY DEFINER with fixed search_path');
select ok((select bool_and(has_function_privilege('authenticated',oid,'execute')) from unnest(array[
  'public.transition_planning_scenario_v1(uuid,text,integer,uuid,text)'::regprocedure,
  'public.get_planning_scenario_lifecycle_v1(uuid)'::regprocedure,
  'public.publish_planning_scenario_v1(uuid,integer,uuid,jsonb,jsonb)'::regprocedure
]) oid),'authenticated can execute trusted Planning boundaries');
select ok((select bool_and(not has_function_privilege(role,oid,'execute')) from unnest(array['public','anon']) role,unnest(array[
  'public.transition_planning_scenario_v1(uuid,text,integer,uuid,text)'::regprocedure,
  'public.get_planning_scenario_lifecycle_v1(uuid)'::regprocedure,
  'public.publish_planning_scenario_v1(uuid,integer,uuid,jsonb,jsonb)'::regprocedure
]) oid),'PUBLIC and anon cannot execute trusted Planning boundaries');
select ok((select bool_and(not has_function_privilege(role,oid,'execute')) from unnest(array['public','anon','authenticated']) role,unnest(array[
  'public.bootstrap_planning_workspace(uuid,uuid,uuid,timestamp with time zone,jsonb)'::regprocedure,
  'public.publish_planning_scenario(uuid,uuid,integer,uuid,timestamp with time zone,jsonb,jsonb)'::regprocedure,
  'public.delete_planning_scenario(uuid,uuid,integer)'::regprocedure
]) oid),'legacy invoker RPCs expose no client EXECUTE');
select ok((select bool_and(not has_table_privilege(role,t,p)) from unnest(array['public','anon','authenticated']) role,unnest(array[
  'public.organization_planning_workspaces','public.organization_planning_scenarios',
  'public.organization_planning_snapshots','public.organization_planning_change_sets',
  'public.organization_planning_lifecycle_audit']) t,unnest(array['select','insert','update','delete']) p),'direct Planning table DML remains closed');
select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.organization_planning_workspaces'::regclass,'public.organization_planning_scenarios'::regclass,
  'public.organization_planning_snapshots'::regclass,'public.organization_planning_change_sets'::regclass,
  'public.organization_planning_lifecycle_audit'::regclass
)),'RLS remains enabled across Planning relations');
select ok((select not exists(select 1 from pg_proc p,unnest(coalesce(p.proargnames,array[]::text[])) a
  where p.oid in ('public.transition_planning_scenario_v1(uuid,text,integer,uuid,text)'::regprocedure,
    'public.publish_planning_scenario_v1(uuid,integer,uuid,jsonb,jsonb)'::regprocedure)
    and (a ilike '%actor%' or a ilike '%occurred%'))),'actor and timestamp are not caller inputs');

insert into auth.users(id,email) values
 ('a1000000-0000-4000-8000-000000000001','pln-owner@test.local'),
 ('a1000000-0000-4000-8000-000000000002','pln-admin@test.local'),
 ('a1000000-0000-4000-8000-000000000003','pln-hr@test.local'),
 ('a1000000-0000-4000-8000-000000000004','pln-manager@test.local'),
 ('a1000000-0000-4000-8000-000000000005','pln-employee@test.local'),
 ('a1000000-0000-4000-8000-000000000006','pln-foreign@test.local');
insert into public.companies(id,name,slug) values
 ('a2000000-0000-4000-8000-000000000001','PLN Alpha','pln-db1-alpha'),
 ('a2000000-0000-4000-8000-000000000002','PLN Beta','pln-db1-beta');
insert into public.company_members(company_id,user_id,role,status) values
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','owner','active'),
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','admin','active'),
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','hr','active'),
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000004','manager','active'),
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000005','employee','active'),
 ('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000006','owner','active');
insert into public.organization_planning_workspaces(id,company_id) values
 ('a3000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001'),
 ('a3000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002');
insert into public.organization_planning_snapshots(id,company_id,workspace_id,version,published_at,organization,kind) values
 ('a4000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001',1,'2026-09-21Z','{"tenant":"alpha"}','baseline'),
 ('a4000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000002',1,'2026-09-21Z','{"tenant":"beta"}','baseline');
insert into public.organization_planning_scenarios(id,company_id,workspace_id,base_snapshot_id,name,status,version,branch_path) values
 ('a5000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','Owner lifecycle','draft',1,'a5000000-0000-4000-8000-000000000001'),
 ('a5000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','Admin submit','draft',1,'a5000000-0000-4000-8000-000000000002'),
 ('a5000000-0000-4000-8000-000000000003','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','HR submit','draft',1,'a5000000-0000-4000-8000-000000000003'),
 ('a5000000-0000-4000-8000-000000000004','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','Denied actors','draft',1,'a5000000-0000-4000-8000-000000000004'),
 ('a5000000-0000-4000-8000-000000000005','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','Reject revise','submitted',1,'a5000000-0000-4000-8000-000000000005'),
 ('a5000000-0000-4000-8000-000000000006','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','Logical race','submitted',1,'a5000000-0000-4000-8000-000000000006'),
 ('a5000000-0000-4000-8000-000000000007','a2000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000002','a4000000-0000-4000-8000-000000000002','Foreign','draft',1,'a5000000-0000-4000-8000-000000000007');
insert into public.organization_planning_change_sets(id,company_id,scenario_id,change_type,payload,version) values
 ('a6000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001','rename','{"name":"Published"}',1);

-- Owner may submit and self-approve; retries are idempotent.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000001','submit',1,'a7000000-0000-4000-8000-000000000001',null)->>'status','submitted','owner submits draft');
select is(public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000001','submit',1,'a7000000-0000-4000-8000-000000000001',null)->>'idempotent','true','submit retry is idempotent');
select is(public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000001','approve',2,'a7000000-0000-4000-8000-000000000002',null)->>'status','approved','self-approval is allowed');
reset role;
select is((select version from public.organization_planning_scenarios where id='a5000000-0000-4000-8000-000000000001'),3,'idempotent retry does not advance version twice');
select is((select count(*) from public.organization_planning_lifecycle_audit where scenario_id='a5000000-0000-4000-8000-000000000001'),2::bigint,'submit and approval append exactly two audit facts');

-- Admin and HR may mutate; manager, employee and foreign actors may not.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000002','submit',1,'a7000000-0000-4000-8000-000000000003',null)$$,'admin may submit');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select lives_ok($$select public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000003','submit',1,'a7000000-0000-4000-8000-000000000004',null)$$,'hr may submit');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000004','submit',1,'a7000000-0000-4000-8000-000000000005',null)$$,'P0002','PLANNING_RESOURCE_UNAVAILABLE','manager is read-only');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000004','submit',1,'a7000000-0000-4000-8000-000000000006',null)$$,'P0002','PLANNING_RESOURCE_UNAVAILABLE','employee is read-only');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select throws_ok($$select public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000004','submit',1,'a7000000-0000-4000-8000-000000000007',null)$$,'P0002','PLANNING_RESOURCE_UNAVAILABLE','foreign actor cannot mutate known scenario');
reset role;
select is((select status from public.organization_planning_scenarios where id='a5000000-0000-4000-8000-000000000004'),'draft','denied actor attempts leave scenario unchanged');
select is((select count(*) from public.organization_planning_lifecycle_audit where scenario_id='a5000000-0000-4000-8000-000000000004'),0::bigint,'denied actor attempts leave no audit');

-- Rejection reason and revision semantics.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000005','reject',1,'a7000000-0000-4000-8000-000000000008',' ')$$,'22023','PLANNING_REJECTION_REASON_INVALID','blank rejection reason denied');
select throws_ok($$select public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000005','reject',1,'a7000000-0000-4000-8000-000000000009',repeat('x',501))$$,'22023','PLANNING_REJECTION_REASON_INVALID','overlong rejection reason denied');
select is(public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000005','reject',1,'a7000000-0000-4000-8000-000000000010','  Ajustar estrutura  ')->>'status','rejected','submitted scenario is rejected');
select is(public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000005','revise',2,'a7000000-0000-4000-8000-000000000011',null)->>'status','draft','rejected scenario returns to draft');
reset role;
select is((select reason from public.organization_planning_lifecycle_audit where idempotency_key='a7000000-0000-4000-8000-000000000010'),'Ajustar estrutura','trimmed rejection reason is durable and private');

-- Invalid origins, stale writes and logical approve/reject concurrency are atomic.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000004','approve',1,'a7000000-0000-4000-8000-000000000012',null)$$,'55000','PLANNING_TRANSITION_INVALID','draft cannot approve');
select throws_ok($$select public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000004','submit',9,'a7000000-0000-4000-8000-000000000013',null)$$,'40001','PLANNING_VERSION_CONFLICT','stale write denied');
select lives_ok($$select public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000006','approve',1,'a7000000-0000-4000-8000-000000000014',null)$$,'approve wins logical race');
select throws_ok($$select public.transition_planning_scenario_v1('a5000000-0000-4000-8000-000000000006','reject',1,'a7000000-0000-4000-8000-000000000015','Late reject')$$,'40001','PLANNING_VERSION_CONFLICT','stale reject loses logical race');
reset role;
select is((select status from public.organization_planning_scenarios where id='a5000000-0000-4000-8000-000000000006'),'approved','race winner is durable');
select is((select count(*) from public.organization_planning_lifecycle_audit where scenario_id='a5000000-0000-4000-8000-000000000006'),1::bigint,'race loser leaves no partial audit');

-- Trusted publication requires approved and atomically appends publication audit.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.publish_planning_scenario_v1('a5000000-0000-4000-8000-000000000004',1,'a8000000-0000-4000-8000-000000000001','{"bad":true}','[]')$$,'P0001','PLANNING_SCENARIO_MUST_BE_APPROVED','trusted publish still rejects draft');
select is(public.publish_planning_scenario_v1('a5000000-0000-4000-8000-000000000001',3,'a8000000-0000-4000-8000-000000000002','{"state":"published"}',jsonb_build_array(jsonb_build_object('id','a6000000-0000-4000-8000-000000000001','changeType','rename','payload',jsonb_build_object('name','Published'),'version',1)))->>'status','published','approved scenario publishes through trusted boundary');
select is(public.publish_planning_scenario_v1('a5000000-0000-4000-8000-000000000001',3,'a8000000-0000-4000-8000-000000000002','{"state":"published"}',jsonb_build_array(jsonb_build_object('id','a6000000-0000-4000-8000-000000000001','changeType','rename','payload',jsonb_build_object('name','Published'),'version',1)))->>'idempotent','true','publication retry is idempotent');
reset role;
select is((select status from public.organization_planning_scenarios where id='a5000000-0000-4000-8000-000000000001'),'published','publication durably reaches terminal state');
select is((select count(*) from public.organization_planning_snapshots where id='a8000000-0000-4000-8000-000000000002'),1::bigint,'publication creates one snapshot');
select is((select count(*) from public.organization_planning_lifecycle_audit where scenario_id='a5000000-0000-4000-8000-000000000001' and event_type='planning.scenario.published'),1::bigint,'publication appends one audit fact');
select throws_ok($$update public.organization_planning_lifecycle_audit set reason='tamper' where scenario_id='a5000000-0000-4000-8000-000000000001'$$,'55000','PLANNING_LIFECYCLE_AUDIT_APPEND_ONLY','audit UPDATE is impossible');
select throws_ok($$delete from public.organization_planning_lifecycle_audit where scenario_id='a5000000-0000-4000-8000-000000000001'$$,'55000','PLANNING_LIFECYCLE_AUDIT_APPEND_ONLY','audit DELETE is impossible');
select throws_ok($$update public.organization_planning_scenarios set status='draft' where id='a5000000-0000-4000-8000-000000000001'$$,'P0001','PUBLISHED_PLANNING_SCENARIO_IS_IMMUTABLE','published remains terminal and immutable');

-- Authorized readback includes history; foreign selectors are non-oracular.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is((select count(*) from public.get_planning_scenario_lifecycle_v1('a5000000-0000-4000-8000-000000000001')),3::bigint,'manager may read same-tenant lifecycle history');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select is((select count(*) from public.get_planning_scenario_lifecycle_v1('a5000000-0000-4000-8000-000000000001')),3::bigint,'employee may read same-tenant lifecycle history');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select is((select count(*) from public.get_planning_scenario_lifecycle_v1('a5000000-0000-4000-8000-000000000001')),0::bigint,'foreign actor reads zero lifecycle facts');
reset role;

select * from finish();
rollback;
