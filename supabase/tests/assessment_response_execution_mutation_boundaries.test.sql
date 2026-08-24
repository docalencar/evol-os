begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

select has_function('public','save_tenant_assessment_answer_v1',
  array['uuid','uuid','uuid','text','numeric','boolean','integer']);
select has_function('public','submit_tenant_assessment_response_v1',array['uuid','uuid']);
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'save_tenant_assessment_answer_v1','submit_tenant_assessment_response_v1')
    and p.prosecdef and p.proconfig=array['search_path=public, pg_temp']),2::bigint,
  'both execution boundaries use hardened SECURITY DEFINER configuration');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'save_tenant_assessment_answer_v1','submit_tenant_assessment_response_v1')
    and has_function_privilege('authenticated',p.oid,'execute')),2::bigint,
  'authenticated can execute both trusted boundaries');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'save_tenant_assessment_answer_v1','submit_tenant_assessment_response_v1')
    and (has_function_privilege('anon',p.oid,'execute')
      or has_function_privilege('public',p.oid,'execute')
      or has_function_privilege('service_role',p.oid,'execute'))),0::bigint,
  'PUBLIC, anon and service_role cannot execute the boundaries');
select ok(not has_table_privilege('authenticated','public.assessment_answers','insert')
  and not has_table_privilege('authenticated','public.assessment_answers','update')
  and not has_table_privilege('authenticated','public.assessment_answers','delete'),
  'authenticated direct Answer mutation is closed');
select ok(not has_table_privilege('authenticated','public.assessment_responses','insert')
  and not has_table_privilege('authenticated','public.assessment_responses','update')
  and not has_table_privilege('authenticated','public.assessment_responses','delete'),
  'authenticated direct Response mutation is closed');
select ok(has_table_privilege('authenticated','public.assessment_answers','select')
  and has_table_privilege('authenticated','public.assessment_responses','select'),
  'evaluator SELECT privileges are preserved');

insert into auth.users(id,email) values
 ('ae000000-0000-4000-8000-000000000001','evaluator-0113@example.com'),
 ('ae000000-0000-4000-8000-000000000002','owner-0113@example.com'),
 ('ae000000-0000-4000-8000-000000000003','admin-0113@example.com'),
 ('ae000000-0000-4000-8000-000000000004','hr-0113@example.com'),
 ('ae000000-0000-4000-8000-000000000005','other-0113@example.com'),
 ('ae000000-0000-4000-8000-000000000006','beta-0113@example.com');
insert into public.companies(id,name,slug) values
 ('ae000000-0000-4000-8000-000000000101','Response Alpha','response-alpha-0113'),
 ('ae000000-0000-4000-8000-000000000102','Response Beta','response-beta-0113');
insert into public.company_members(id,company_id,user_id,role,status) values
 ('ae000000-0000-4000-8000-000000000112','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000002','owner','active'),
 ('ae000000-0000-4000-8000-000000000111','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000001','manager','active'),
 ('ae000000-0000-4000-8000-000000000113','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000003','admin','active'),
 ('ae000000-0000-4000-8000-000000000114','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000004','hr','active'),
 ('ae000000-0000-4000-8000-000000000115','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000005','manager','active'),
 ('ae000000-0000-4000-8000-000000000116','ae000000-0000-4000-8000-000000000102','ae000000-0000-4000-8000-000000000006','owner','active');
insert into public.people(id,company_id,user_id,full_name,email,status) values
 ('ae000000-0000-4000-8000-000000000301','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000001','Evaluator','evaluator@example.com','active'),
 ('ae000000-0000-4000-8000-000000000302','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000002','Owner','owner@example.com','active'),
 ('ae000000-0000-4000-8000-000000000303','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000003','Admin','admin@example.com','active'),
 ('ae000000-0000-4000-8000-000000000304','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000004','HR','hr@example.com','active'),
 ('ae000000-0000-4000-8000-000000000305','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000005','Other','other@example.com','active'),
 ('ae000000-0000-4000-8000-000000000306','ae000000-0000-4000-8000-000000000102','ae000000-0000-4000-8000-000000000006','Beta','beta@example.com','active');
insert into public.assessment_templates(id,company_id,name,type,status,active) values
 ('ae000000-0000-4000-8000-000000000201','ae000000-0000-4000-8000-000000000101','Model A','annual','active',true),
 ('ae000000-0000-4000-8000-000000000202','ae000000-0000-4000-8000-000000000101','Model B','annual','active',true),
 ('ae000000-0000-4000-8000-000000000203','ae000000-0000-4000-8000-000000000102','Model Beta','annual','active',true);
insert into public.assessment_sections(id,company_id,assessment_template_id,name,active) values
 ('ae000000-0000-4000-8000-000000000211','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000201','Active',true),
 ('ae000000-0000-4000-8000-000000000212','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000201','Inactive',false),
 ('ae000000-0000-4000-8000-000000000213','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000202','Other Model',true),
 ('ae000000-0000-4000-8000-000000000214','ae000000-0000-4000-8000-000000000102','ae000000-0000-4000-8000-000000000203','Beta',true);
insert into public.assessment_questions(
  id,template_id,company_id,assessment_section_id,question,question_type,
  scale_min,scale_max,required,active,order_index
) values
 ('ae000000-0000-4000-8000-000000000221','ae000000-0000-4000-8000-000000000201','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000211','Scale dynamic','scale',0,10,true,true,1),
 ('ae000000-0000-4000-8000-000000000222','ae000000-0000-4000-8000-000000000201','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000211','Boolean answer','yes_no',0,1,false,true,2),
 ('ae000000-0000-4000-8000-000000000223','ae000000-0000-4000-8000-000000000201','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000211','Text answer','text',0,1,false,true,3),
 ('ae000000-0000-4000-8000-000000000224','ae000000-0000-4000-8000-000000000201','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000211','Number answer','number',2,8,false,true,4),
 ('ae000000-0000-4000-8000-000000000225','ae000000-0000-4000-8000-000000000201','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000211','Inactive question','scale',1,5,false,false,5),
 ('ae000000-0000-4000-8000-000000000226','ae000000-0000-4000-8000-000000000201','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000212','Inactive section question','scale',1,5,false,true,6),
 ('ae000000-0000-4000-8000-000000000227','ae000000-0000-4000-8000-000000000202','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000213','Other model question','scale',1,5,true,true,7),
 ('ae000000-0000-4000-8000-000000000228','ae000000-0000-4000-8000-000000000203','ae000000-0000-4000-8000-000000000102','ae000000-0000-4000-8000-000000000214','Beta question','scale',1,5,true,true,8);
insert into public.assessment_cycles(
  id,company_id,name,assessment_type,status,start_date,end_date,assessment_template_id
) values
 ('ae000000-0000-4000-8000-000000000401','ae000000-0000-4000-8000-000000000101','Cycle A','performance','active',current_date,current_date+7,'ae000000-0000-4000-8000-000000000201'),
 ('ae000000-0000-4000-8000-000000000402','ae000000-0000-4000-8000-000000000101','Cycle Missing','performance','active',current_date,current_date+7,'ae000000-0000-4000-8000-000000000201'),
 ('ae000000-0000-4000-8000-000000000403','ae000000-0000-4000-8000-000000000101','Cycle Invalid','performance','active',current_date,current_date+7,'ae000000-0000-4000-8000-000000000201'),
 ('ae000000-0000-4000-8000-000000000404','ae000000-0000-4000-8000-000000000101','Cycle Cancelled','performance','active',current_date,current_date+7,'ae000000-0000-4000-8000-000000000201'),
 ('ae000000-0000-4000-8000-000000000405','ae000000-0000-4000-8000-000000000101','Cycle Completed','performance','active',current_date,current_date+7,'ae000000-0000-4000-8000-000000000201'),
 ('ae000000-0000-4000-8000-000000000406','ae000000-0000-4000-8000-000000000102','Cycle Beta','performance','active',current_date,current_date+7,'ae000000-0000-4000-8000-000000000203');
insert into public.assessment_execution_snapshots(
  id,company_id,assessment_cycle_id,source_assessment_template_id,
  template_name,template_type,capture_origin
) values
 ('ae000000-0000-4000-8000-000000000451','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000401','ae000000-0000-4000-8000-000000000201','Model A','annual','legacy_backfill_current_state'),
 ('ae000000-0000-4000-8000-000000000452','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000402','ae000000-0000-4000-8000-000000000201','Model A','annual','legacy_backfill_current_state'),
 ('ae000000-0000-4000-8000-000000000453','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000403','ae000000-0000-4000-8000-000000000201','Model A','annual','legacy_backfill_current_state'),
 ('ae000000-0000-4000-8000-000000000454','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000404','ae000000-0000-4000-8000-000000000201','Model A','annual','legacy_backfill_current_state'),
 ('ae000000-0000-4000-8000-000000000455','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000405','ae000000-0000-4000-8000-000000000201','Model A','annual','legacy_backfill_current_state'),
 ('ae000000-0000-4000-8000-000000000456','ae000000-0000-4000-8000-000000000102','ae000000-0000-4000-8000-000000000406','ae000000-0000-4000-8000-000000000203','Model Beta','annual','legacy_backfill_current_state');
insert into public.assessment_execution_snapshot_sections(
  company_id,assessment_execution_snapshot_id,source_assessment_section_id,
  name,weight,display_order,active_at_capture
)
select snapshot.company_id,snapshot.id,section.id,section.name,section.weight,
  section.display_order,section.active and section.deleted_at is null
from public.assessment_execution_snapshots snapshot
join public.assessment_sections section on section.company_id=snapshot.company_id
  and section.assessment_template_id=snapshot.source_assessment_template_id
where snapshot.id::text like 'ae000000-0000-4000-8000-00000000045%';
insert into public.assessment_execution_snapshot_questions(
  company_id,assessment_execution_snapshot_id,assessment_execution_snapshot_section_id,
  source_assessment_question_id,question,question_type,required,weight,display_order,
  scale_min,scale_max,active_at_capture
)
select snapshot_section.company_id,snapshot_section.assessment_execution_snapshot_id,
  snapshot_section.id,question.id,question.question,question.question_type,
  question.required,question.weight,question.display_order,question.scale_min,
  question.scale_max,question.active and question.deleted_at is null
    and snapshot_section.active_at_capture
from public.assessment_execution_snapshot_sections snapshot_section
join public.assessment_questions question
  on question.company_id=snapshot_section.company_id
  and question.assessment_section_id=snapshot_section.source_assessment_section_id
where snapshot_section.assessment_execution_snapshot_id::text
  like 'ae000000-0000-4000-8000-00000000045%';
insert into public.assessment_responses(
  id,company_id,assessment_cycle_id,assessment_template_id,
  assessment_execution_snapshot_id,employee_id,evaluator_id,status
) values
 ('ae000000-0000-4000-8000-000000000501','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000401','ae000000-0000-4000-8000-000000000201','ae000000-0000-4000-8000-000000000451','ae000000-0000-4000-8000-000000000305','ae000000-0000-4000-8000-000000000301','draft'),
 ('ae000000-0000-4000-8000-000000000502','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000402','ae000000-0000-4000-8000-000000000201','ae000000-0000-4000-8000-000000000452','ae000000-0000-4000-8000-000000000305','ae000000-0000-4000-8000-000000000301','draft'),
 ('ae000000-0000-4000-8000-000000000503','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000403','ae000000-0000-4000-8000-000000000201','ae000000-0000-4000-8000-000000000453','ae000000-0000-4000-8000-000000000305','ae000000-0000-4000-8000-000000000301','draft'),
 ('ae000000-0000-4000-8000-000000000504','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000404','ae000000-0000-4000-8000-000000000201','ae000000-0000-4000-8000-000000000454','ae000000-0000-4000-8000-000000000305','ae000000-0000-4000-8000-000000000301','cancelled'),
 ('ae000000-0000-4000-8000-000000000505','ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000405','ae000000-0000-4000-8000-000000000201','ae000000-0000-4000-8000-000000000455','ae000000-0000-4000-8000-000000000305','ae000000-0000-4000-8000-000000000301','completed'),
 ('ae000000-0000-4000-8000-000000000506','ae000000-0000-4000-8000-000000000102','ae000000-0000-4000-8000-000000000406','ae000000-0000-4000-8000-000000000203','ae000000-0000-4000-8000-000000000456','ae000000-0000-4000-8000-000000000306','ae000000-0000-4000-8000-000000000306','draft');

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select throws_ok($$select public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000221',null,null,null,5)$$,'42501',
 'permission denied for function save_tenant_assessment_answer_v1','anon cannot save');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ae000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000221',null,null,null,5)$$,'42501','ASSESSMENT_RESPONSE_WRITE_DENIED','owner non-evaluator cannot save');
select set_config('request.jwt.claims','{"sub":"ae000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.submit_tenant_assessment_response_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501')$$,
 '42501','ASSESSMENT_RESPONSE_WRITE_DENIED','admin non-evaluator cannot submit');
select set_config('request.jwt.claims','{"sub":"ae000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000221',null,null,null,5)$$,'42501','ASSESSMENT_RESPONSE_WRITE_DENIED','hr non-evaluator cannot save');

select set_config('request.jwt.claims','{"sub":"ae000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000102','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000228',null,null,null,3)$$,'P0002','ASSESSMENT_RESPONSE_NOT_FOUND','cross-tenant response is rejected');
select throws_ok($$select public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000227',null,null,null,3)$$,'P0002','ASSESSMENT_QUESTION_NOT_ANSWERABLE','Question from another Model is rejected');
select throws_ok($$select public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000225',null,null,null,3)$$,'P0002','ASSESSMENT_QUESTION_NOT_ANSWERABLE','inactive Question is rejected');
select throws_ok($$select public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000226',null,null,null,3)$$,'P0002','ASSESSMENT_QUESTION_NOT_ANSWERABLE','Question in inactive Section is rejected');
select throws_ok($$select public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000221',null,null,null,-1)$$,'22023','ASSESSMENT_ANSWER_INVALID','scale below dynamic minimum is rejected');
select throws_ok($$select public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000221',null,null,null,11)$$,'22023','ASSESSMENT_ANSWER_INVALID','scale above dynamic maximum is rejected');
select throws_ok($$select public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000221','mixed',null,null,5)$$,'22023','ASSESSMENT_ANSWER_INVALID','mixed payload is rejected');
select throws_ok($$select public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000221',null,null,null,null)$$,'22023','ASSESSMENT_ANSWER_INVALID','empty payload is rejected');

select is((public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000221',null,null,null,0))->>'status','succeeded','dynamic scale minimum is saved');
select is((select status from public.assessment_responses where id='ae000000-0000-4000-8000-000000000501'),'in_progress','first effective Answer starts Response');
select ok((select started_at is not null from public.assessment_responses where id='ae000000-0000-4000-8000-000000000501'),'first effective Answer initializes started_at');
create temporary table start_time as select started_at from public.assessment_responses where id='ae000000-0000-4000-8000-000000000501';
select is((public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000221',null,null,null,0))->>'status','no_change','identical autosave converges');
select is((select started_at from public.assessment_responses where id='ae000000-0000-4000-8000-000000000501'),(select started_at from start_time),'started_at remains unchanged');
select is((public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000221',null,null,null,10))->>'status','succeeded','changed scale updates same Answer');
select is((select count(*)::int from public.assessment_answers where assessment_response_id='ae000000-0000-4000-8000-000000000501' and assessment_question_id='ae000000-0000-4000-8000-000000000221'),1,'natural key has no duplicate Answer');
select is((select score from public.assessment_answers where assessment_response_id='ae000000-0000-4000-8000-000000000501' and assessment_question_id='ae000000-0000-4000-8000-000000000221'),10,'dynamic scale maximum persists');
select is((public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000222',null,null,true,null))->>'status','succeeded','yes/no payload is valid');
select is((public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000223','  useful text  ',null,null,null))->>'status','succeeded','text payload is valid');
select is((select answer_text from public.assessment_answers where assessment_response_id='ae000000-0000-4000-8000-000000000501' and assessment_question_id='ae000000-0000-4000-8000-000000000223'),'useful text','text is normalized');
select is((public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000224',null,5,null,null))->>'status','succeeded','number payload is valid');
select throws_ok($$select public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000504',
 'ae000000-0000-4000-8000-000000000221',null,null,null,5)$$,'55000','ASSESSMENT_RESPONSE_IMMUTABLE','cancelled Response cannot be answered');
select throws_ok($$select public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000505',
 'ae000000-0000-4000-8000-000000000221',null,null,null,5)$$,'55000','ASSESSMENT_RESPONSE_IMMUTABLE','completed Response cannot be answered');
reset role;
select is((select count(*)::int from public.activity_events where company_id='ae000000-0000-4000-8000-000000000101' and activity_type='assessment_response.submitted'),0,'autosave emits no submit Activity');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ae000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select throws_ok($$select public.submit_tenant_assessment_response_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000502')$$,
 '22023','ASSESSMENT_REQUIRED_ANSWERS_MISSING','missing required Answer blocks submit');
select is((public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000502',
 'ae000000-0000-4000-8000-000000000221',null,null,null,5))->>'status','succeeded',
 'required Answer can be saved without optional Answers');
select is((public.submit_tenant_assessment_response_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000502'))->>'status','succeeded',
 'optional Answers are not required for submit');
select throws_ok($$select public.submit_tenant_assessment_response_v1(
 'ae000000-0000-4000-8000-000000000102','ae000000-0000-4000-8000-000000000506')$$,
 '42501','ASSESSMENT_RESPONSE_WRITE_DENIED','cross-tenant evaluator cannot submit');

reset role;
insert into public.assessment_answers(company_id,assessment_response_id,assessment_question_id,
  assessment_execution_snapshot_id,assessment_execution_snapshot_question_id,score)
select 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000503',
  'ae000000-0000-4000-8000-000000000221','ae000000-0000-4000-8000-000000000453',question.id,11
from public.assessment_execution_snapshot_questions question
where question.assessment_execution_snapshot_id='ae000000-0000-4000-8000-000000000453'
  and question.source_assessment_question_id='ae000000-0000-4000-8000-000000000221';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ae000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.submit_tenant_assessment_response_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000503')$$,
 '22023','ASSESSMENT_REQUIRED_ANSWERS_MISSING','invalid persisted required Answer blocks submit');

select is((public.submit_tenant_assessment_response_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501'))->>'status','succeeded','complete Response submits');
select is((select status from public.assessment_responses where id='ae000000-0000-4000-8000-000000000501'),'submitted','submit sets submitted status');
select ok((select submitted_at is not null from public.assessment_responses where id='ae000000-0000-4000-8000-000000000501'),'submit initializes submitted_at');
reset role;
select is((select count(*)::int from public.activity_events where company_id='ae000000-0000-4000-8000-000000000101' and activity_type='assessment_response.submitted' and entity_id='ae000000-0000-4000-8000-000000000501'),1,'effective submit emits exactly one canonical Activity');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ae000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.submit_tenant_assessment_response_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501'))->>'status','already_submitted','second submit converges');
reset role;
select is((select count(*)::int from public.activity_events where company_id='ae000000-0000-4000-8000-000000000101' and activity_type='assessment_response.submitted' and entity_id='ae000000-0000-4000-8000-000000000501'),1,'submit retry emits no duplicate Activity');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ae000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.save_tenant_assessment_answer_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000501',
 'ae000000-0000-4000-8000-000000000221',null,null,null,9)$$,'55000','ASSESSMENT_RESPONSE_IMMUTABLE','Answer after submit is rejected');
select throws_ok($$select public.submit_tenant_assessment_response_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000504')$$,
 '55000','ASSESSMENT_RESPONSE_IMMUTABLE','cancelled Response cannot submit');
select throws_ok($$select public.submit_tenant_assessment_response_v1(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000505')$$,
 '55000','ASSESSMENT_RESPONSE_IMMUTABLE','completed Response cannot submit');
select throws_ok($$insert into public.assessment_answers(
 company_id,assessment_response_id,assessment_question_id,score) values(
 'ae000000-0000-4000-8000-000000000101','ae000000-0000-4000-8000-000000000502',
 'ae000000-0000-4000-8000-000000000221',5)$$,'42501','permission denied for table assessment_answers','direct Answer INSERT is denied');
select throws_ok($$update public.assessment_responses set status='in_progress'
 where id='ae000000-0000-4000-8000-000000000502'$$,'42501','permission denied for table assessment_responses','direct Response UPDATE is denied');
select set_config('request.jwt.claims','{"sub":"ae000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select public.read_assessment_administratively(
 'ae000000-0000-4000-8000-000000000101','response',
 'ae000000-0000-4000-8000-000000000501','verify_response_boundary')$$,
 'administrative read remains available to owner');

select * from finish();
rollback;
