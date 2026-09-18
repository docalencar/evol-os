begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select no_plan();

-- Object and privilege contract.
select has_table('public','development_reviews','development reviews table exists');
select has_table('public','development_private_audit','private audit table exists');
select has_function('public','get_authorized_development_plans_v1',array['uuid','uuid']);
select has_function('public','create_development_plan_v1',array['uuid','uuid','text','text','text','date','date','uuid']);
select has_function('public','complete_development_action_v1',array['uuid']);
select has_function('public','record_development_review_v1',array['uuid','text','text','text','uuid']);
select has_function('public','publish_development_template_version_v1',array['uuid','bigint']);
select ok((select bool_and(p.prosecdef and p.proconfig=array['search_path=public, pg_temp']) from pg_proc p where p.oid in (
  'public.get_authorized_development_plans_v1(uuid,uuid)'::regprocedure,
  'public.create_development_plan_v1(uuid,uuid,text,text,text,date,date,uuid)'::regprocedure,
  'public.complete_development_action_v1(uuid)'::regprocedure,
  'public.record_development_review_v1(uuid,text,text,text,uuid)'::regprocedure
)),'public boundaries are SECURITY DEFINER with fixed search_path');
select ok(has_function_privilege('authenticated','public.create_development_plan_v1(uuid,uuid,text,text,text,date,date,uuid)','execute'),'authenticated may execute trusted plan create');
select ok(not has_function_privilege('anon','public.create_development_plan_v1(uuid,uuid,text,text,text,date,date,uuid)','execute'),'anon cannot execute plan create');
select ok(not has_function_privilege('public','public.create_development_plan_v1(uuid,uuid,text,text,text,date,date,uuid)','execute'),'PUBLIC cannot execute plan create');
select ok(not has_table_privilege('authenticated','public.development_plans','select'),'authenticated direct plan SELECT closed');
select ok(not has_table_privilege('authenticated','public.development_plans','insert'),'authenticated direct plan INSERT closed');
select ok(not has_table_privilege('authenticated','public.development_goals','update'),'authenticated direct goal UPDATE closed');
select ok(not has_table_privilege('authenticated','public.development_actions','delete'),'authenticated direct action DELETE closed');
select ok(not has_table_privilege('authenticated','public.development_reviews','insert'),'authenticated direct review INSERT closed');
select ok(not has_table_privilege('authenticated','public.development_private_audit','select'),'authenticated private audit SELECT closed');
select ok((select relrowsecurity from pg_class where oid='public.development_reviews'::regclass),'review RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.development_private_audit'::regclass),'audit RLS enabled');

insert into auth.users(id,email) values
 ('dd010000-0000-4000-8000-000000000001','ddb-owner@example.com'),
 ('dd010000-0000-4000-8000-000000000002','ddb-manager@example.com'),
 ('dd010000-0000-4000-8000-000000000003','ddb-employee@example.com'),
 ('dd010000-0000-4000-8000-000000000004','ddb-other@example.com'),
 ('dd010000-0000-4000-8000-000000000005','ddb-foreign-owner@example.com');
insert into public.companies(id,name,slug) values
 ('dd010000-0000-4000-8000-000000000101','D DB One','d-db-one'),
 ('dd010000-0000-4000-8000-000000000102','D DB Foreign','d-db-foreign');
insert into public.company_members(id,company_id,user_id,role,status) values
 ('dd010000-0000-4000-8000-000000000111','dd010000-0000-4000-8000-000000000101','dd010000-0000-4000-8000-000000000001','owner','active'),
 ('dd010000-0000-4000-8000-000000000112','dd010000-0000-4000-8000-000000000101','dd010000-0000-4000-8000-000000000002','manager','active'),
 ('dd010000-0000-4000-8000-000000000113','dd010000-0000-4000-8000-000000000101','dd010000-0000-4000-8000-000000000003','employee','active'),
 ('dd010000-0000-4000-8000-000000000114','dd010000-0000-4000-8000-000000000101','dd010000-0000-4000-8000-000000000004','employee','active'),
 ('dd010000-0000-4000-8000-000000000115','dd010000-0000-4000-8000-000000000102','dd010000-0000-4000-8000-000000000005','owner','active');
insert into public.people(id,company_id,user_id,full_name,status,manager_id) values
 ('dd010000-0000-4000-8000-000000000201','dd010000-0000-4000-8000-000000000101','dd010000-0000-4000-8000-000000000001','Owner','active',null),
 ('dd010000-0000-4000-8000-000000000202','dd010000-0000-4000-8000-000000000101','dd010000-0000-4000-8000-000000000002','Manager','active',null),
 ('dd010000-0000-4000-8000-000000000203','dd010000-0000-4000-8000-000000000101','dd010000-0000-4000-8000-000000000003','Employee','active','dd010000-0000-4000-8000-000000000202'),
 ('dd010000-0000-4000-8000-000000000204','dd010000-0000-4000-8000-000000000101','dd010000-0000-4000-8000-000000000004','Other','active',null),
 ('dd010000-0000-4000-8000-000000000205','dd010000-0000-4000-8000-000000000102','dd010000-0000-4000-8000-000000000005','Foreign Owner','active',null);
insert into public.competencies(id,company_id,name,category,expected_level,active) values
 ('dd010000-0000-4000-8000-000000000301','dd010000-0000-4000-8000-000000000101','D DB Skill','technical',3,true);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.create_development_plan_v1('dd010000-0000-4000-8000-000000000203',null,'Own','x','medium',null,null,'dd010000-0000-4000-8000-000000000401')$$,'P0002','DEVELOPMENT_RESOURCE_UNAVAILABLE','employee cannot create own formal plan');

select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select public.create_development_plan_v1('dd010000-0000-4000-8000-000000000203',null,'Direct report PDI','Private','high','2026-09-17','2026-12-17','dd010000-0000-4000-8000-000000000402')$$,'manager creates direct-report plan');
reset role;
select set_config('ddb.plan',(select id::text from public.development_plans where creation_idempotency_key='dd010000-0000-4000-8000-000000000402'),true);
select is((select owner_id from public.development_plans where id=current_setting('ddb.plan')::uuid),'dd010000-0000-4000-8000-000000000202'::uuid,'manager ownership is server-derived');
select is((select created_by from public.development_plans where id=current_setting('ddb.plan')::uuid),'dd010000-0000-4000-8000-000000000002'::uuid,'created_by is session-derived');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.get_authorized_development_plans_v1('dd010000-0000-4000-8000-000000000101',null)),1::bigint,'manager reads direct report');
select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*) from public.get_authorized_development_plans_v1('dd010000-0000-4000-8000-000000000101',null)),1::bigint,'subject reads own plan');
select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is((select count(*) from public.get_authorized_development_plans_v1('dd010000-0000-4000-8000-000000000101',null)),0::bigint,'same-company nonparticipant denied');
select is((select count(*) from public.get_authorized_development_plans_v1('dd010000-0000-4000-8000-000000000101',current_setting('ddb.plan')::uuid)),0::bigint,'known protected id is non-oracular');
select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select * from public.get_authorized_development_plans_v1('dd010000-0000-4000-8000-000000000101',null)$$,'42501','TENANT_AUTHORIZATION_DENIED','foreign tenant denied');
select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.get_authorized_development_plans_v1('dd010000-0000-4000-8000-000000000101',null)),1::bigint,'administrative owner reads tenant plan');

select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select public.add_development_plan_goal_v1(current_setting('ddb.plan')::uuid,'dd010000-0000-4000-8000-000000000301','Goal','Meaningful',1,3,3)$$,'manager adds draft goal');
reset role; select set_config('ddb.goal',(select id::text from public.development_goals where plan_id=current_setting('ddb.plan')::uuid),true);
set local role authenticated; select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select public.add_development_goal_action_v1(current_setting('ddb.goal')::uuid,'Action','Do it','course','2026-10-01')$$,'manager adds meaningful action');
reset role; select set_config('ddb.action',(select id::text from public.development_actions where goal_id=current_setting('ddb.goal')::uuid),true);
set local role authenticated; select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select public.activate_development_plan_v1(current_setting('ddb.plan')::uuid,1)$$,'draft activates with action');
select throws_ok($$select public.add_development_goal_action_v1(current_setting('ddb.goal')::uuid,'Late',null,'other',null)$$,'23514','DEVELOPMENT_PLAN_STRUCTURE_LOCKED','active structure is locked');
select throws_ok($$select public.start_development_action_v1(current_setting('ddb.action')::uuid)$$,'P0002','DEVELOPMENT_RESOURCE_UNAVAILABLE','manager cannot impersonate subject start');
select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select lives_ok($$select public.start_development_action_v1(current_setting('ddb.action')::uuid)$$,'subject starts own action');
select lives_ok($$select public.complete_development_action_v1(current_setting('ddb.action')::uuid)$$,'subject completes own action');
select lives_ok($$select public.complete_development_action_v1(current_setting('ddb.action')::uuid)$$,'completion retry is idempotent');
select is((select status from public.get_authorized_development_goals_v1('dd010000-0000-4000-8000-000000000101',current_setting('ddb.plan')::uuid)),'completed','goal status is action-derived');
select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select public.record_development_review_v1(current_setting('ddb.plan')::uuid,'final','Final summary','Next step','dd010000-0000-4000-8000-000000000403')$$,'manager records final review');
select lives_ok($$select public.complete_development_plan_v1(current_setting('ddb.plan')::uuid,2)$$,'fresh final review permits completion');
select throws_ok($$select public.activate_development_plan_v1(current_setting('ddb.plan')::uuid,3)$$,'55000','DEVELOPMENT_TRANSITION_INVALID','completed plan cannot reopen');
reset role;
select is((select count(*) from public.development_private_audit where company_id='dd010000-0000-4000-8000-000000000101' and event_type in ('plan.created','goal.created','action.created','plan.activated','action.started','action.completed','review.final_recorded','plan.completed')),8::bigint,'every lifecycle mutation is privately audited');
select is((select count(*) from public.activity_events where entity_id=current_setting('ddb.plan')::uuid),0::bigint,'private narratives never enter company timeline');
select throws_ok($$update public.development_reviews set summary='tamper' where development_plan_id=current_setting('ddb.plan')::uuid$$,'55000','DEVELOPMENT_APPEND_ONLY_RECORD','reviews are append-only');

-- Template state machine and actor separation.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.create_development_template_draft_v1('dd010000-0000-4000-8000-000000000101','Manager template',null,30,'dd010000-0000-4000-8000-000000000501')$$,'42501','DEVELOPMENT_TEMPLATE_FORBIDDEN','manager cannot author template');
select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.create_development_template_draft_v1('dd010000-0000-4000-8000-000000000101','Admin template','Description',30,'dd010000-0000-4000-8000-000000000502')$$,'owner creates template draft');
reset role; select set_config('ddb.version',(select id::text from public.development_template_versions where authoring_idempotency_key='dd010000-0000-4000-8000-000000000502'),true);
set local role authenticated; select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.add_development_template_goal_v1(current_setting('ddb.version')::uuid,'dd010000-0000-4000-8000-000000000301','Goal',3,0)$$,'owner adds template goal');
reset role; select set_config('ddb.tgoal',(select id::text from public.development_template_version_goals where template_version_id=current_setting('ddb.version')::uuid),true);
set local role authenticated; select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.add_development_template_action_v1(current_setting('ddb.tgoal')::uuid,'Learn','Practice','course',10,0)$$,'owner adds template action');
select lives_ok($$select public.publish_development_template_version_v1(current_setting('ddb.version')::uuid,3)$$,'owner publishes complete draft');
select throws_ok($$select public.add_development_template_action_v1(current_setting('ddb.tgoal')::uuid,'Mutate',null,'other',null,1)$$,'23514','DEVELOPMENT_TEMPLATE_IMMUTABLE','published content immutable');
select set_config('request.jwt.claims','{"sub":"dd010000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.obsolete_development_template_version_v1(current_setting('ddb.version')::uuid)$$,'P0002','DEVELOPMENT_TEMPLATE_NOT_FOUND','manager cannot obsolete template');
reset role;
select ok(public.can_apply_development_template_v1('dd010000-0000-4000-8000-000000000101','dd010000-0000-4000-8000-000000000002','dd010000-0000-4000-8000-000000000203','dd010000-0000-4000-8000-000000000202'),'manager may apply to direct report as owner');
select ok(not public.can_apply_development_template_v1('dd010000-0000-4000-8000-000000000101','dd010000-0000-4000-8000-000000000002','dd010000-0000-4000-8000-000000000204','dd010000-0000-4000-8000-000000000202'),'manager cannot apply to unrelated employee');
select ok(public.can_apply_development_template_v1('dd010000-0000-4000-8000-000000000101','dd010000-0000-4000-8000-000000000001','dd010000-0000-4000-8000-000000000203','dd010000-0000-4000-8000-000000000202'),'administrative template application preserved');
select is((select count(*) from public.get_company_retention_pressure_v1('dd010000-0000-4000-8000-000000000101') where relation_name in ('development_reviews','development_private_audit')),2::bigint,'new retained evidence is registered');

select * from finish();
rollback;
