begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select no_plan();

select has_table('public','assessment_execution_snapshots','snapshot root table exists');
select has_table('public','assessment_execution_snapshot_sections','snapshot Section table exists');
select has_table('public','assessment_execution_snapshot_questions','snapshot Question table exists');
select has_column('public','assessment_responses','assessment_execution_snapshot_id','Response snapshot FK exists');
select has_column('public','assessment_answers','assessment_execution_snapshot_question_id','Answer snapshot Question FK exists');
select is((select count(*) from pg_class where relnamespace='public'::regnamespace
  and relname in ('assessment_execution_snapshots','assessment_execution_snapshot_sections',
    'assessment_execution_snapshot_questions') and relrowsecurity),3::bigint,
  'all snapshot tables enable RLS');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'generate_tenant_assessment_cycle_responses_v1','save_tenant_assessment_answer_v1',
    'submit_tenant_assessment_response_v1','get_assessment_evaluator_workspace_v1',
    'get_tenant_assessment_response_structure_v1','read_assessment_result_for_evaluatee')
    and p.prosecdef and p.proconfig=array['search_path=public, pg_temp']),6::bigint,
  'snapshot mutation and read boundaries are hardened SECURITY DEFINER');
select ok(not has_table_privilege('authenticated','public.assessment_execution_snapshots','insert')
  and not has_table_privilege('authenticated','public.assessment_execution_snapshots','update')
  and not has_table_privilege('authenticated','public.assessment_execution_snapshots','delete')
  and not has_table_privilege('authenticated','public.assessment_execution_snapshot_sections','insert')
  and not has_table_privilege('authenticated','public.assessment_execution_snapshot_questions','insert'),
  'authenticated has no direct snapshot mutation');

insert into auth.users(id,email) values
 ('af000000-0000-4000-8000-000000000001','owner-0114@example.com');
insert into public.companies(id,name,slug) values
 ('af000000-0000-4000-8000-000000000101','Snapshot 0114','snapshot-0114');
insert into public.company_members(id,company_id,user_id,role,status) values
 ('af000000-0000-4000-8000-000000000111','af000000-0000-4000-8000-000000000101',
  'af000000-0000-4000-8000-000000000001','owner','active');
insert into public.people(id,company_id,user_id,full_name,status) values
 ('af000000-0000-4000-8000-000000000201','af000000-0000-4000-8000-000000000101',
  'af000000-0000-4000-8000-000000000001','Snapshot Owner','active');
insert into public.competencies(id,company_id,name,category,active) values
 ('af000000-0000-4000-8000-000000000211','af000000-0000-4000-8000-000000000101','Original competency','technical',true),
 ('af000000-0000-4000-8000-000000000212','af000000-0000-4000-8000-000000000101','Changed competency','technical',true);
insert into public.assessment_templates(id,company_id,name,description,instructions,type,status,active) values
 ('af000000-0000-4000-8000-000000000301','af000000-0000-4000-8000-000000000101',
  'Snapshot Model','Original description','Original instructions','annual','active',true),
 ('af000000-0000-4000-8000-000000000302','af000000-0000-4000-8000-000000000101',
  'Empty Model',null,null,'annual','active',true);
insert into public.assessment_sections(id,company_id,assessment_template_id,code,name,
  description,weight,display_order,active) values
 ('af000000-0000-4000-8000-000000000401','af000000-0000-4000-8000-000000000101',
  'af000000-0000-4000-8000-000000000301','SEC','Original Section','Section A',2,1,true),
 ('af000000-0000-4000-8000-000000000402','af000000-0000-4000-8000-000000000101',
  'af000000-0000-4000-8000-000000000302','EMPTY','Empty Section',null,1,1,true);
insert into public.assessment_questions(id,template_id,company_id,assessment_section_id,
  competency_id,code,question,help_text,question_type,scale_min,scale_max,weight,
  required,active,display_order,order_index) values
 ('af000000-0000-4000-8000-000000000501','af000000-0000-4000-8000-000000000301',
  'af000000-0000-4000-8000-000000000101','af000000-0000-4000-8000-000000000401',
  'af000000-0000-4000-8000-000000000211','QUESTION','Question A','Help A','scale',0,10,3,true,true,1,1);
insert into public.assessment_cycles(id,company_id,name,assessment_type,status,start_date,end_date,
  assessment_template_id,allow_self_assessment,allow_manager_assessment,
  allow_peer_assessment,allow_direct_report_assessment,assessment_visibility) values
 ('af000000-0000-4000-8000-000000000601','af000000-0000-4000-8000-000000000101',
  'Original Cycle','performance','active',current_date,current_date+7,
  'af000000-0000-4000-8000-000000000301',true,false,false,false,'full'),
 ('af000000-0000-4000-8000-000000000602','af000000-0000-4000-8000-000000000101',
  'New Cycle','performance','active',current_date,current_date+7,
  'af000000-0000-4000-8000-000000000301',true,false,false,false,'full'),
 ('af000000-0000-4000-8000-000000000603','af000000-0000-4000-8000-000000000101',
  'Empty Cycle','performance','active',current_date,current_date+7,
  'af000000-0000-4000-8000-000000000302',true,false,false,false,'full');
insert into public.assessment_cycle_participants(id,company_id,assessment_cycle_id,employee_id) values
 ('af000000-0000-4000-8000-000000000701','af000000-0000-4000-8000-000000000101','af000000-0000-4000-8000-000000000601','af000000-0000-4000-8000-000000000201'),
 ('af000000-0000-4000-8000-000000000702','af000000-0000-4000-8000-000000000101','af000000-0000-4000-8000-000000000602','af000000-0000-4000-8000-000000000201'),
 ('af000000-0000-4000-8000-000000000703','af000000-0000-4000-8000-000000000101','af000000-0000-4000-8000-000000000603','af000000-0000-4000-8000-000000000201');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"af000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.generate_tenant_assessment_cycle_responses_v1(
  'af000000-0000-4000-8000-000000000101','af000000-0000-4000-8000-000000000601'))->>'createdResponseCount','1',
  'first generation creates one Response');
reset role;
select is((select count(*)::int from public.assessment_execution_snapshots
  where assessment_cycle_id='af000000-0000-4000-8000-000000000601'),1,
  'first generation creates exactly one Cycle snapshot');
select is((select capture_origin from public.assessment_execution_snapshots
  where assessment_cycle_id='af000000-0000-4000-8000-000000000601'),
  'response_generation','new snapshot provenance is response_generation');
select is((select count(*)::int from public.assessment_execution_snapshot_sections section
  join public.assessment_execution_snapshots snapshot on snapshot.id=section.assessment_execution_snapshot_id
  where snapshot.assessment_cycle_id='af000000-0000-4000-8000-000000000601'),1,
  'snapshot copies the Section');
select is((select count(*)::int from public.assessment_execution_snapshot_questions question
  join public.assessment_execution_snapshots snapshot on snapshot.id=question.assessment_execution_snapshot_id
  where snapshot.assessment_cycle_id='af000000-0000-4000-8000-000000000601'),1,
  'snapshot copies the Question');
select results_eq($$select question,scale_min,scale_max,required,weight,display_order,
    competency_name from public.assessment_execution_snapshot_questions
    where source_assessment_question_id='af000000-0000-4000-8000-000000000501'
    order by assessment_execution_snapshot_id limit 1$$,
  $$values ('Question A',0,10,true,3::numeric,1,'Original competency')$$,
  'snapshot preserves wording, bounds, required, weight, order and competency name');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"af000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.generate_tenant_assessment_cycle_responses_v1(
  'af000000-0000-4000-8000-000000000101','af000000-0000-4000-8000-000000000601'))->>'status',
  'no_change','generation retry converges');
reset role;
select is((select count(*)::int from public.activity_events where entity_id=
  'af000000-0000-4000-8000-000000000601' and activity_type='assessment_cycle.responses_generated'),1,
  'generation emits exactly one Activity');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"af000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.generate_tenant_assessment_cycle_responses_v1(
  'af000000-0000-4000-8000-000000000101','af000000-0000-4000-8000-000000000603')$$,
  '22023','ASSESSMENT_EXECUTION_QUESTIONS_REQUIRED','zero executable Questions fail closed');
reset role;
select is((select count(*)::int from public.assessment_execution_snapshots where
  assessment_cycle_id='af000000-0000-4000-8000-000000000603'),0,'zero-Question failure leaves no snapshot');
select is((select count(*)::int from public.assessment_responses where
  assessment_cycle_id='af000000-0000-4000-8000-000000000603'),0,'zero-Question failure leaves no Response');
select is((select count(*)::int from public.activity_events where entity_id=
  'af000000-0000-4000-8000-000000000603' and activity_type='assessment_cycle.responses_generated'),0,
  'zero-Question failure leaves no Activity');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"af000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.update_tenant_assessment_question_v1(
  'af000000-0000-4000-8000-000000000101','af000000-0000-4000-8000-000000000501',
  'af000000-0000-4000-8000-000000000401','af000000-0000-4000-8000-000000000212',
  'QUESTION','Question B','Help B','scale',2,5,4,9,false,true))->>'status','succeeded',
  'live Question changes after snapshot');
select is((public.generate_tenant_assessment_cycle_responses_v1(
  'af000000-0000-4000-8000-000000000101','af000000-0000-4000-8000-000000000602'))->>'status',
  'succeeded','new Cycle generates after live edit');
reset role;
select results_eq($$select question,scale_min,scale_max,required,weight,display_order,
    competency_name from public.assessment_execution_snapshot_questions question
    join public.assessment_execution_snapshots snapshot
      on snapshot.id=question.assessment_execution_snapshot_id
    where snapshot.assessment_cycle_id='af000000-0000-4000-8000-000000000602'$$,
  $$values ('Question B',2,5,false,4::numeric,9,'Changed competency')$$,
  'new Cycle captures the edited live version');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"af000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.save_tenant_assessment_answer_v1(
  'af000000-0000-4000-8000-000000000101',
  (select id from public.assessment_responses where assessment_cycle_id='af000000-0000-4000-8000-000000000601'),
  'af000000-0000-4000-8000-000000000501',null,null,null,8))->>'status','succeeded',
  'old snapshot accepts value valid under original bounds after live bounds change');
select throws_ok($$select public.save_tenant_assessment_answer_v1(
  'af000000-0000-4000-8000-000000000101',
  (select id from public.assessment_responses where assessment_cycle_id='af000000-0000-4000-8000-000000000602'),
  'af000000-0000-4000-8000-000000000501',null,null,null,8)$$,
  '22023','ASSESSMENT_ANSWER_INVALID','new snapshot enforces new bounds');
select is((public.submit_tenant_assessment_response_v1(
  'af000000-0000-4000-8000-000000000101',
  (select id from public.assessment_responses where assessment_cycle_id='af000000-0000-4000-8000-000000000601')))->>'status',
  'succeeded','old required completeness is satisfied and submits');

select is((public.archive_tenant_assessment_question_v1(
  'af000000-0000-4000-8000-000000000101','af000000-0000-4000-8000-000000000501'))->>'status',
  'succeeded','live Question archives');
select is((public.archive_tenant_assessment_section_v1(
  'af000000-0000-4000-8000-000000000101','af000000-0000-4000-8000-000000000401'))->>'status',
  'succeeded','live Section archives');
select is((public.archive_tenant_assessment_template_v1(
  'af000000-0000-4000-8000-000000000101','af000000-0000-4000-8000-000000000301'))->>'status',
  'succeeded','live Model archives');
select results_eq($$select question,scale_min,scale_max,competency_name
  from public.get_assessment_evaluator_workspace_v1(
    'af000000-0000-4000-8000-000000000101',
    (select id from public.assessment_responses where assessment_cycle_id='af000000-0000-4000-8000-000000000601'))
  where record_type='question'$$,
  $$values ('Question A',0,10,'Original competency')$$,
  'old execution read survives live archive with original semantics');
select ok((public.read_assessment_result_for_evaluatee(
  'af000000-0000-4000-8000-000000000101',
  (select id from public.assessment_responses where assessment_cycle_id='af000000-0000-4000-8000-000000000601'))
  ->>'visibility')='full','historical result remains readable from snapshot');

select throws_ok($$insert into public.assessment_execution_snapshots(
  company_id,assessment_cycle_id,source_assessment_template_id,template_name,
  template_type,capture_origin) values(
  'af000000-0000-4000-8000-000000000101','af000000-0000-4000-8000-000000000601',
  'af000000-0000-4000-8000-000000000301','Forbidden','annual','response_generation')$$,
  '42501','permission denied for table assessment_execution_snapshots',
  'authenticated cannot insert snapshot directly');

reset role;
select * from finish();
rollback;
