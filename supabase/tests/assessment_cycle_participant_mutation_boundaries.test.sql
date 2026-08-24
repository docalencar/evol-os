begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

select has_function('public','create_tenant_assessment_cycle_v1',
  array['uuid','text','text','text','uuid','text','date','date','date','boolean','boolean','boolean','boolean','boolean','text','text']);
select has_function('public','update_tenant_assessment_cycle_v1',
  array['uuid','uuid','text','text','text','uuid','text','date','date','date','boolean','boolean','boolean','boolean','boolean','text']);
select has_function('public','archive_tenant_assessment_cycle_v1',array['uuid','uuid']);
select has_function('public','add_tenant_assessment_cycle_participants_v1',array['uuid','uuid','uuid[]']);
select has_function('public','remove_tenant_assessment_cycle_participant_v1',array['uuid','uuid','uuid']);
select has_function('public','generate_tenant_assessment_cycle_responses_v1',array['uuid','uuid']);

select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'create_tenant_assessment_cycle_v1','update_tenant_assessment_cycle_v1',
    'archive_tenant_assessment_cycle_v1','add_tenant_assessment_cycle_participants_v1',
    'remove_tenant_assessment_cycle_participant_v1','generate_tenant_assessment_cycle_responses_v1')
    and p.prosecdef and p.proconfig=array['search_path=public, pg_temp']),6::bigint,
  'all six boundaries use hardened SECURITY DEFINER configuration');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'create_tenant_assessment_cycle_v1','update_tenant_assessment_cycle_v1',
    'archive_tenant_assessment_cycle_v1','add_tenant_assessment_cycle_participants_v1',
    'remove_tenant_assessment_cycle_participant_v1','generate_tenant_assessment_cycle_responses_v1')
    and has_function_privilege('authenticated',p.oid,'execute')),6::bigint,
  'authenticated can execute all six trusted boundaries');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'create_tenant_assessment_cycle_v1','update_tenant_assessment_cycle_v1',
    'archive_tenant_assessment_cycle_v1','add_tenant_assessment_cycle_participants_v1',
    'remove_tenant_assessment_cycle_participant_v1','generate_tenant_assessment_cycle_responses_v1')
    and (has_function_privilege('anon',p.oid,'execute')
      or has_function_privilege('public',p.oid,'execute')
      or has_function_privilege('service_role',p.oid,'execute'))),0::bigint,
  'anon, PUBLIC and service_role cannot execute the boundaries');
select ok(not has_table_privilege('authenticated','public.assessment_cycles','insert')
  and not has_table_privilege('authenticated','public.assessment_cycles','update')
  and not has_table_privilege('authenticated','public.assessment_cycles','delete'),
  'authenticated direct cycle DML is closed');
select ok(not has_table_privilege('authenticated','public.assessment_cycle_participants','insert')
  and not has_table_privilege('authenticated','public.assessment_cycle_participants','update')
  and not has_table_privilege('authenticated','public.assessment_cycle_participants','delete'),
  'authenticated direct participant DML is closed');
select ok(not has_table_privilege('authenticated','public.assessment_responses','insert'),
  'authenticated direct response generation is closed');
select ok(has_table_privilege('authenticated','public.assessment_responses','select')
  and not has_table_privilege('authenticated','public.assessment_responses','update'),
  'response SELECT remains while 0113 closes direct execution UPDATE');

insert into auth.users(id,email) values
 ('ad000000-0000-4000-8000-000000000001','owner-acp@example.com'),
 ('ad000000-0000-4000-8000-000000000002','manager-acp@example.com'),
 ('ad000000-0000-4000-8000-000000000003','admin-acp@example.com'),
 ('ad000000-0000-4000-8000-000000000004','hr-acp@example.com'),
 ('ad000000-0000-4000-8000-000000000005','employee-acp@example.com');
insert into public.companies(id,name,slug) values
 ('ad000000-0000-4000-8000-000000000101','ACP Alpha','acp-alpha'),
 ('ad000000-0000-4000-8000-000000000102','ACP Beta','acp-beta');
insert into public.company_members(id,company_id,user_id,role,status) values
 ('ad000000-0000-4000-8000-000000000111','ad000000-0000-4000-8000-000000000101','ad000000-0000-4000-8000-000000000001','owner','active'),
 ('ad000000-0000-4000-8000-000000000112','ad000000-0000-4000-8000-000000000101','ad000000-0000-4000-8000-000000000002','manager','active'),
 ('ad000000-0000-4000-8000-000000000113','ad000000-0000-4000-8000-000000000101','ad000000-0000-4000-8000-000000000003','admin','active'),
 ('ad000000-0000-4000-8000-000000000114','ad000000-0000-4000-8000-000000000101','ad000000-0000-4000-8000-000000000004','hr','active'),
 ('ad000000-0000-4000-8000-000000000115','ad000000-0000-4000-8000-000000000101','ad000000-0000-4000-8000-000000000005','employee','active');
insert into public.assessment_templates(id,company_id,name,type,status,active) values
 ('ad000000-0000-4000-8000-000000000201','ad000000-0000-4000-8000-000000000101','Active Model','annual','active',true),
 ('ad000000-0000-4000-8000-000000000202','ad000000-0000-4000-8000-000000000102','Other Model','annual','active',true);
insert into public.people(id,company_id,user_id,full_name,email,status,manager_id) values
 ('ad000000-0000-4000-8000-000000000301','ad000000-0000-4000-8000-000000000101','ad000000-0000-4000-8000-000000000001','Manager','manager@example.com','active',null),
 ('ad000000-0000-4000-8000-000000000302','ad000000-0000-4000-8000-000000000101',null,'Report','report@example.com','active','ad000000-0000-4000-8000-000000000301'),
 ('ad000000-0000-4000-8000-000000000303','ad000000-0000-4000-8000-000000000101',null,'Inactive','inactive@example.com','inactive',null),
 ('ad000000-0000-4000-8000-000000000304','ad000000-0000-4000-8000-000000000102',null,'Other','other@example.com','active',null);
insert into public.assessment_sections(id,company_id,assessment_template_id,name)
values ('ad000000-0000-4000-8000-000000000211','ad000000-0000-4000-8000-000000000101',
 'ad000000-0000-4000-8000-000000000201','Execution');
insert into public.assessment_questions(id,template_id,company_id,assessment_section_id,question,question_type,scale_min,scale_max)
values ('ad000000-0000-4000-8000-000000000221','ad000000-0000-4000-8000-000000000201',
 'ad000000-0000-4000-8000-000000000101','ad000000-0000-4000-8000-000000000211',
 'Generated response can be answered?','scale',1,5);
create temporary table acp_result(kind text primary key,id uuid);
grant select,insert on acp_result to authenticated;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ad000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.create_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101','Denied','', 'performance',
 'ad000000-0000-4000-8000-000000000201','draft',current_date,current_date+7,null,
 true,true,false,true,false,'full','denied')$$,'42501','TENANT_AUTHORIZATION_DENIED',
 'manager cannot mutate cycles');
select set_config('request.jwt.claims','{"sub":"ad000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select public.archive_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101','ad000000-0000-4000-8000-000000000999')$$,
 '42501','TENANT_AUTHORIZATION_DENIED','employee cannot mutate cycles');
select set_config('request.jwt.claims','{"sub":"ad000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select lives_ok($$select public.create_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101','Admin Cycle','', 'performance',
 'ad000000-0000-4000-8000-000000000201','draft',current_date,current_date+7,null,
 true,false,false,false,false,'full','admin-create')$$,'admin can create a cycle');
select set_config('request.jwt.claims','{"sub":"ad000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select lives_ok($$select public.create_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101','HR Cycle','', 'performance',
 'ad000000-0000-4000-8000-000000000201','draft',current_date,current_date+7,null,
 true,false,false,false,false,'full','hr-create')$$,'hr can create a cycle');

select set_config('request.jwt.claims','{"sub":"ad000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.create_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101','Wrong tenant','', 'performance',
 'ad000000-0000-4000-8000-000000000202','draft',current_date,current_date+7,null,
 true,true,false,true,false,'full','cross')$$,'P0002','ASSESSMENT_TEMPLATE_NOT_FOUND',
 'cross-tenant model is rejected');
insert into acp_result values ('cycle',(
 public.create_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101','Trusted Cycle','', 'performance',
 'ad000000-0000-4000-8000-000000000201','draft',current_date,current_date+7,null,
 true,true,false,true,false,'full','create-1')->>'assessmentCycleId')::uuid);
select is((public.create_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101','Trusted Cycle','', 'performance',
 'ad000000-0000-4000-8000-000000000201','draft',current_date,current_date+7,null,
 true,true,false,true,false,'full','create-1'))->>'status','idempotent_retry',
 'cycle create retry converges');
select throws_ok($$select public.create_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101','Different payload','', 'performance',
 'ad000000-0000-4000-8000-000000000201','draft',current_date,current_date+7,null,
 true,true,false,true,false,'full','create-1')$$,'23505','IDEMPOTENCY_CONFLICT',
 'same create intent with another fingerprint fails');
select is((public.add_tenant_assessment_cycle_participants_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='cycle'),
 array['ad000000-0000-4000-8000-000000000301'::uuid,'ad000000-0000-4000-8000-000000000302'::uuid,
 'ad000000-0000-4000-8000-000000000302'::uuid]))->>'addedParticipantCount','2',
 'participant batch deduplicates and adds active people');
select is((public.add_tenant_assessment_cycle_participants_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='cycle'),
 array['ad000000-0000-4000-8000-000000000301'::uuid]))->>'addedParticipantCount','0',
 'participant retry converges without duplicate');
select throws_ok($$select public.add_tenant_assessment_cycle_participants_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='cycle'),
 array['ad000000-0000-4000-8000-000000000303'::uuid])$$,'P0002','ACTIVE_PARTICIPANT_NOT_FOUND',
 'new inactive participant is rejected');
select throws_ok($$select public.add_tenant_assessment_cycle_participants_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='cycle'),
 array['ad000000-0000-4000-8000-000000000304'::uuid])$$,'P0002','ACTIVE_PARTICIPANT_NOT_FOUND',
 'cross-tenant participant is rejected');
select is((public.update_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='cycle'),
 'Trusted Cycle','', 'performance','ad000000-0000-4000-8000-000000000201','active',
 current_date,current_date+7,null,true,true,false,true,false,'full'))->>'status','succeeded',
 'draft cycle can activate');
select is((public.generate_tenant_assessment_cycle_responses_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='cycle'))
 ->>'createdResponseCount')::int,4,'generation derives self, manager and direct-report assignments');
set local role postgres;
select is((select count(*)::int from public.assessment_responses
 where assessment_cycle_id=(select id from acp_result where kind='cycle')
   and perspective='self'),2,
 'new generation persists self perspective');
select is((select count(*)::int from public.assessment_responses
 where assessment_cycle_id=(select id from acp_result where kind='cycle')
   and perspective='manager'),1,
 'new generation persists manager perspective');
select is((select count(*)::int from public.assessment_responses
 where assessment_cycle_id=(select id from acp_result where kind='cycle')
   and perspective='direct_report'),1,
 'new generation persists direct-report perspective');
select is((select count(*)::int from public.assessment_responses
 where assessment_cycle_id=(select id from acp_result where kind='cycle')
   and perspective='legacy_unknown'),0,
 'new generation never writes the historical-only legacy_unknown perspective');
set local role authenticated;
select lives_ok($$select public.save_tenant_assessment_answer_v1(
 'ad000000-0000-4000-8000-000000000101',(
   select response.id from public.assessment_responses response
   where response.assessment_cycle_id=(select id from acp_result where kind='cycle')
     and response.employee_id='ad000000-0000-4000-8000-000000000301'
     and response.evaluator_id='ad000000-0000-4000-8000-000000000301'
 ),'ad000000-0000-4000-8000-000000000221',null,null,null,4)$$,
 'authorized evaluator saves through 0113 on an 0112-generated self response');
select results_eq($$select status from public.assessment_responses
 where assessment_cycle_id=(select id from acp_result where kind='cycle')
   and employee_id='ad000000-0000-4000-8000-000000000301'
   and evaluator_id='ad000000-0000-4000-8000-000000000301'$$,
 array['in_progress'::text],
 'trusted first save transitions generated response to in_progress');
select is((public.generate_tenant_assessment_cycle_responses_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='cycle'))
 ->>'createdResponseCount')::int,0,'generation retry converges to zero new responses');
select throws_ok($$select public.remove_tenant_assessment_cycle_participant_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='cycle'),
 'ad000000-0000-4000-8000-000000000302')$$,'55000','ASSESSMENT_PARTICIPANT_HAS_RESPONSES',
 'participant removal is blocked after related responses exist');
select throws_ok($$select public.update_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='cycle'),
 'Changed','', 'performance','ad000000-0000-4000-8000-000000000201','active',
 current_date,current_date+7,null,true,true,false,true,false,'full')$$,'55000','ASSESSMENT_CYCLE_CONFIGURATION_FROZEN',
 'active cycle configuration is frozen');
select is((public.update_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='cycle'),
 'Trusted Cycle','', 'performance','ad000000-0000-4000-8000-000000000201','completed',
 current_date,current_date+7,null,true,true,false,true,false,'full'))->>'status','succeeded',
 'active cycle can complete');
select throws_ok($$select public.update_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='cycle'),
 'Trusted Cycle','', 'performance','ad000000-0000-4000-8000-000000000201','active',
 current_date,current_date+7,null,true,true,false,true,false,'full')$$,'55000','ASSESSMENT_CYCLE_TRANSITION_FORBIDDEN',
  'completed cycle is terminal');
insert into acp_result values ('peer_cycle',(
 public.create_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101','Peer Cycle','', '360',
 'ad000000-0000-4000-8000-000000000201','draft',current_date,current_date+7,null,
 true,false,true,false,false,'full','create-peer')->>'assessmentCycleId')::uuid);
select is((public.add_tenant_assessment_cycle_participants_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='peer_cycle'),
 array['ad000000-0000-4000-8000-000000000301'::uuid]))->>'addedParticipantCount','1',
 'participant can be added before responses exist');
select is((public.remove_tenant_assessment_cycle_participant_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='peer_cycle'),
 'ad000000-0000-4000-8000-000000000301'))->>'status','succeeded',
 'participant can be removed before responses exist');
select lives_ok($$select public.update_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='peer_cycle'),
 'Peer Cycle','', '360','ad000000-0000-4000-8000-000000000201','active',
 current_date,current_date+7,null,true,false,true,false,false,'full')$$,
 'peer cycle can activate before generation');
select throws_ok($$select public.generate_tenant_assessment_cycle_responses_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='peer_cycle'))$$,
 '0A000','ASSESSMENT_PEER_SELECTION_NOT_SUPPORTED',
 'peer generation fails closed with the approved explicit contract');
select is((public.update_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='peer_cycle'),
 'Peer Cycle','', '360','ad000000-0000-4000-8000-000000000201','cancelled',
 current_date,current_date+7,null,true,false,true,false,false,'full'))->>'status','succeeded',
 'active cycle can cancel');
select throws_ok($$select public.update_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='peer_cycle'),
 'Peer Cycle','', '360','ad000000-0000-4000-8000-000000000201','active',
 current_date,current_date+7,null,true,false,true,false,false,'full')$$,
 '55000','ASSESSMENT_CYCLE_TRANSITION_FORBIDDEN','cancelled cycle is terminal');

insert into acp_result values ('scheduled_cycle',(
 public.create_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101','Scheduled Cycle','', 'performance',
 'ad000000-0000-4000-8000-000000000201','draft',current_date,current_date+7,null,
 true,false,false,false,false,'full','create-scheduled')->>'assessmentCycleId')::uuid);
select lives_ok($$select public.update_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='scheduled_cycle'),
 'Scheduled Cycle','', 'performance','ad000000-0000-4000-8000-000000000201','scheduled',
 current_date,current_date+7,null,true,false,false,false,false,'full')$$,'draft can schedule');
select lives_ok($$select public.update_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='scheduled_cycle'),
 'Scheduled Cycle','', 'performance','ad000000-0000-4000-8000-000000000201','draft',
 current_date,current_date+7,null,true,false,false,false,false,'full')$$,'scheduled can return to draft');
select throws_ok($$select public.update_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='scheduled_cycle'),
 'Scheduled Cycle','', 'performance','ad000000-0000-4000-8000-000000000201','completed',
 current_date,current_date+7,null,true,false,false,false,false,'full')$$,
 '55000','ASSESSMENT_CYCLE_TRANSITION_FORBIDDEN','draft cannot jump to completed');

insert into acp_result values ('inactive_cycle',(
 public.create_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101','Inactive History','', 'performance',
 'ad000000-0000-4000-8000-000000000201','draft',current_date,current_date+7,null,
 true,false,false,false,false,'full','create-inactive')->>'assessmentCycleId')::uuid);
reset role;
insert into public.assessment_cycle_participants(company_id,assessment_cycle_id,employee_id)
values ('ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='inactive_cycle'),
 'ad000000-0000-4000-8000-000000000303');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ad000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.update_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='inactive_cycle'),
 'Inactive History','', 'performance','ad000000-0000-4000-8000-000000000201','active',
 current_date,current_date+7,null,true,false,false,false,false,'full')$$,'historical inactive membership does not block activation');
select is((public.generate_tenant_assessment_cycle_responses_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='inactive_cycle'))
 ->>'createdResponseCount')::int,0,'inactive historical participant is preserved but skipped');

insert into acp_result values ('archived_model_cycle',(
 public.create_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101','Archived Model Cycle','', 'performance',
 'ad000000-0000-4000-8000-000000000201','draft',current_date,current_date+7,null,
 true,false,false,false,false,'full','create-archived-model')->>'assessmentCycleId')::uuid);
select lives_ok($$select public.add_tenant_assessment_cycle_participants_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='archived_model_cycle'),
 array['ad000000-0000-4000-8000-000000000301'::uuid])$$,'active participant added before model archive');
select lives_ok($$select public.update_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='archived_model_cycle'),
 'Archived Model Cycle','', 'performance','ad000000-0000-4000-8000-000000000201','active',
 current_date,current_date+7,null,true,false,false,false,false,'full')$$,'cycle activates while model is active');
reset role;
update public.assessment_templates set status='archived',active=false,deleted_at=now()
where id='ad000000-0000-4000-8000-000000000201';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ad000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.generate_tenant_assessment_cycle_responses_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='archived_model_cycle'))$$,
 '55000','ASSESSMENT_TEMPLATE_ARCHIVED','archived model blocks first generation atomically');
select is((public.archive_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='cycle')))->>'status','succeeded',
 'cycle archive succeeds');
select is((public.archive_tenant_assessment_cycle_v1(
 'ad000000-0000-4000-8000-000000000101',(select id from acp_result where kind='cycle')))->>'status','already_archived',
 'cycle archive is idempotent');
reset role;

select is((select count(*)::int from public.activity_events
 where company_id='ad000000-0000-4000-8000-000000000101'
   and activity_type='assessment_cycle.responses_generated'),1,
 'successful generation emits one activity and retry emits none');
select is((select count(*)::int from public.assessment_responses
 where assessment_cycle_id=(select id from acp_result where kind='cycle')),4,
 'generation persists the expected unique assignments');

select * from finish();
rollback;
