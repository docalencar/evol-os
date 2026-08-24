begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select no_plan();

select has_function('public','get_current_person_assessment_result_directory_v1',array['uuid']);
select is((select prosecdef from pg_proc where oid='public.get_current_person_assessment_result_directory_v1(uuid)'::regprocedure),true,'directory is SECURITY DEFINER');
select is((select provolatile from pg_proc where oid='public.get_current_person_assessment_result_directory_v1(uuid)'::regprocedure),'s','directory is stable');
select is((select proconfig from pg_proc where oid='public.get_current_person_assessment_result_directory_v1(uuid)'::regprocedure),array['search_path=public, pg_temp'],'search_path is hardened');
select function_privs_are('public','get_current_person_assessment_result_directory_v1',array['uuid'],'authenticated',array['EXECUTE'],'authenticated alone can execute');
select function_privs_are('public','get_current_person_assessment_result_directory_v1',array['uuid'],'anon',array[]::text[],'anon denied');
select function_privs_are('public','get_current_person_assessment_result_directory_v1',array['uuid'],'public',array[]::text[],'PUBLIC denied');
select function_privs_are('public','get_current_person_assessment_result_directory_v1',array['uuid'],'service_role',array[]::text[],'service_role denied by grant contract');
select is((select proargnames from pg_proc where oid='public.get_current_person_assessment_result_directory_v1(uuid)'::regprocedure),array['p_company_id','cycle_id','cycle_name','model_name','cycle_date','response_id','perspective','response_status','submitted_at','completed_at','overall_score','visibility','result_available']::text[],'exact metadata-only shape');
select ok(position('p_employee' in pg_get_functiondef('public.get_current_person_assessment_result_directory_v1(uuid)'::regprocedure))=0 and position('p_person' in pg_get_functiondef('public.get_current_person_assessment_result_directory_v1(uuid)'::regprocedure))=0 and position('p_evaluator' in pg_get_functiondef('public.get_current_person_assessment_result_directory_v1(uuid)'::regprocedure))=0,'no arbitrary identity selector');

insert into auth.users(id,email) values
 ('b2000000-0000-4000-8000-000000000001','evaluatee-b2@example.com'),
 ('b2000000-0000-4000-8000-000000000002','evaluator-b2@example.com'),
 ('b2000000-0000-4000-8000-000000000003','foreign-b2@example.com'),
 ('b2000000-0000-4000-8000-000000000004','inactive-b2@example.com'),
 ('b2000000-0000-4000-8000-000000000005','no-person-b2@example.com'),
 ('b2000000-0000-4000-8000-000000000006','no-membership-b2@example.com'),
 ('b2000000-0000-4000-8000-000000000007','foreign-admin-b2@example.com'),
 ('b2000000-0000-4000-8000-000000000008','foreign-member-b2@example.com');
insert into companies(id,name,slug) values
 ('b2000000-0000-4000-8000-000000000101','Directory Alpha','directory-alpha-b2'),
 ('b2000000-0000-4000-8000-000000000102','Directory Beta','directory-beta-b2');
insert into company_members(id,company_id,user_id,role,status) values
 (gen_random_uuid(),'b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000001','employee','active'),
 (gen_random_uuid(),'b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000002','manager','active'),
 (gen_random_uuid(),'b2000000-0000-4000-8000-000000000102','b2000000-0000-4000-8000-000000000003','owner','active'),
 (gen_random_uuid(),'b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000004','admin','inactive'),
 (gen_random_uuid(),'b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000005','admin','active'),
 (gen_random_uuid(),'b2000000-0000-4000-8000-000000000102','b2000000-0000-4000-8000-000000000007','admin','active'),
 (gen_random_uuid(),'b2000000-0000-4000-8000-000000000102','b2000000-0000-4000-8000-000000000008','employee','active');
insert into people(id,company_id,user_id,full_name,email,status) values
 ('b2000000-0000-4000-8000-000000000201','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000001','Evaluatee','evaluatee-b2@example.com','active'),
 ('b2000000-0000-4000-8000-000000000202','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000002','Evaluator','evaluator-b2@example.com','active'),
 ('b2000000-0000-4000-8000-000000000203','b2000000-0000-4000-8000-000000000102','b2000000-0000-4000-8000-000000000003','Foreign','foreign-b2@example.com','active'),
 ('b2000000-0000-4000-8000-000000000204','b2000000-0000-4000-8000-000000000101',null,'Direct report','direct-report-b2@example.com','active');
insert into assessment_templates(id,company_id,name,type,status,active) values
 ('b2000000-0000-4000-8000-000000000301','b2000000-0000-4000-8000-000000000101','Live model changed','annual','active',true);
insert into assessment_sections(id,company_id,assessment_template_id,name,weight,display_order,active) values
 ('b2000000-0000-4000-8000-000000000311','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000301','Score',1,1,true);
insert into assessment_questions(id,template_id,company_id,assessment_section_id,question,question_type,scale_min,scale_max,weight,display_order,required,active) values
 ('b2000000-0000-4000-8000-000000000321','b2000000-0000-4000-8000-000000000301','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000311','Score 0-10','scale',0,10,1,1,true,true);
insert into assessment_cycles(id,company_id,name,assessment_type,status,start_date,end_date,assessment_template_id,assessment_visibility) values
 ('b2000000-0000-4000-8000-000000000401','b2000000-0000-4000-8000-000000000101','Visible Cycle','performance','active','2026-01-01','2026-01-31','b2000000-0000-4000-8000-000000000301','full'),
 ('b2000000-0000-4000-8000-000000000402','b2000000-0000-4000-8000-000000000101','Hidden Cycle','performance','active','2026-02-01','2026-02-28','b2000000-0000-4000-8000-000000000301','none'),
 ('b2000000-0000-4000-8000-000000000403','b2000000-0000-4000-8000-000000000101','Draft Cycle','performance','active','2026-03-01','2026-03-31','b2000000-0000-4000-8000-000000000301','full'),
 ('b2000000-0000-4000-8000-000000000404','b2000000-0000-4000-8000-000000000101','Progress Cycle','performance','active','2026-04-01','2026-04-30','b2000000-0000-4000-8000-000000000301','full'),
 ('b2000000-0000-4000-8000-000000000405','b2000000-0000-4000-8000-000000000101','Cancelled Cycle','performance','active','2026-05-01','2026-05-31','b2000000-0000-4000-8000-000000000301','full');
insert into assessment_execution_snapshots(id,company_id,assessment_cycle_id,source_assessment_template_id,template_name,template_type,capture_origin) values
 ('b2000000-0000-4000-8000-000000000411','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000401','b2000000-0000-4000-8000-000000000301','Frozen model name','annual','response_generation'),
 ('b2000000-0000-4000-8000-000000000412','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000402','b2000000-0000-4000-8000-000000000301','Hidden frozen model','annual','response_generation'),
 ('b2000000-0000-4000-8000-000000000413','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000403','b2000000-0000-4000-8000-000000000301','Draft model','annual','response_generation'),
 ('b2000000-0000-4000-8000-000000000414','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000404','b2000000-0000-4000-8000-000000000301','Progress model','annual','response_generation'),
 ('b2000000-0000-4000-8000-000000000415','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000405','b2000000-0000-4000-8000-000000000301','Cancelled model','annual','response_generation');
insert into assessment_execution_snapshot_sections(id,company_id,assessment_execution_snapshot_id,source_assessment_section_id,name,weight,display_order,active_at_capture) values
 ('b2000000-0000-4000-8000-000000000421','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000411','b2000000-0000-4000-8000-000000000311','Score',1,1,true),
 ('b2000000-0000-4000-8000-000000000422','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000412','b2000000-0000-4000-8000-000000000311','Score',1,1,true);
insert into assessment_execution_snapshot_questions(id,company_id,assessment_execution_snapshot_id,assessment_execution_snapshot_section_id,source_assessment_question_id,question,question_type,required,weight,display_order,scale_min,scale_max,active_at_capture) values
 ('b2000000-0000-4000-8000-000000000431','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000411','b2000000-0000-4000-8000-000000000421','b2000000-0000-4000-8000-000000000321','Score 0-10','scale',true,1,1,0,10,true),
 ('b2000000-0000-4000-8000-000000000432','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000412','b2000000-0000-4000-8000-000000000422','b2000000-0000-4000-8000-000000000321','Score 0-10','scale',true,1,1,0,10,true);
insert into assessment_responses(id,company_id,assessment_cycle_id,assessment_template_id,assessment_execution_snapshot_id,employee_id,evaluator_id,status,perspective,submitted_at,completed_at) values
 ('b2000000-0000-4000-8000-000000000501','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000401','b2000000-0000-4000-8000-000000000301','b2000000-0000-4000-8000-000000000411','b2000000-0000-4000-8000-000000000201','b2000000-0000-4000-8000-000000000201','submitted','self','2026-01-20',null),
 ('b2000000-0000-4000-8000-000000000502','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000401','b2000000-0000-4000-8000-000000000301','b2000000-0000-4000-8000-000000000411','b2000000-0000-4000-8000-000000000201','b2000000-0000-4000-8000-000000000202','completed','manager',null,'2026-01-21'),
 ('b2000000-0000-4000-8000-000000000503','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000401','b2000000-0000-4000-8000-000000000301','b2000000-0000-4000-8000-000000000411','b2000000-0000-4000-8000-000000000201','b2000000-0000-4000-8000-000000000204','submitted','direct_report','2026-01-22',null),
 ('b2000000-0000-4000-8000-000000000504','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000402','b2000000-0000-4000-8000-000000000301','b2000000-0000-4000-8000-000000000412','b2000000-0000-4000-8000-000000000201','b2000000-0000-4000-8000-000000000201','submitted','legacy_unknown','2026-02-20',null),
 ('b2000000-0000-4000-8000-000000000505','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000401','b2000000-0000-4000-8000-000000000301','b2000000-0000-4000-8000-000000000411','b2000000-0000-4000-8000-000000000202','b2000000-0000-4000-8000-000000000202','submitted','self','2026-01-23',null);
insert into assessment_responses(id,company_id,assessment_cycle_id,assessment_template_id,assessment_execution_snapshot_id,employee_id,evaluator_id,status,perspective) values
 ('b2000000-0000-4000-8000-000000000506','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000403','b2000000-0000-4000-8000-000000000301','b2000000-0000-4000-8000-000000000413','b2000000-0000-4000-8000-000000000201','b2000000-0000-4000-8000-000000000201','draft','self'),
 ('b2000000-0000-4000-8000-000000000507','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000404','b2000000-0000-4000-8000-000000000301','b2000000-0000-4000-8000-000000000414','b2000000-0000-4000-8000-000000000201','b2000000-0000-4000-8000-000000000201','in_progress','self'),
 ('b2000000-0000-4000-8000-000000000508','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000405','b2000000-0000-4000-8000-000000000301','b2000000-0000-4000-8000-000000000415','b2000000-0000-4000-8000-000000000201','b2000000-0000-4000-8000-000000000201','cancelled','self');

insert into assessment_answers(id,company_id,assessment_response_id,assessment_question_id,assessment_execution_snapshot_id,assessment_execution_snapshot_question_id,score) values
 ('b2000000-0000-4000-8000-000000000601','b2000000-0000-4000-8000-000000000101','b2000000-0000-4000-8000-000000000501','b2000000-0000-4000-8000-000000000321','b2000000-0000-4000-8000-000000000411','b2000000-0000-4000-8000-000000000431',8);

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select throws_ok($$select * from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101')$$,'42501','permission denied for function get_current_person_assessment_result_directory_v1','anonymous denied');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101')),2::bigint,'evaluatee sees only own eligible non-hidden non-direct results');
select is((select overall_score from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101') where perspective='self'),80::numeric,'normalized score reuses 0115 authority');
select is((select overall_score from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101') where perspective='manager'),null::numeric,'NULL quantitative score is preserved');
select is((select model_name from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101') limit 1),'Frozen model name','snapshot Model name is authoritative');
select is((select count(*) from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101') where perspective='direct_report'),0::bigint,'direct-report is conservatively omitted');
select is((select count(*) from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101') where visibility='none'),0::bigint,'visibility none leaks no row');
select is((select count(*) from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101') where response_status not in ('submitted','completed')),0::bigint,'open and cancelled states are absent');
select ok(not exists(select 1 from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101') where response_id='b2000000-0000-4000-8000-000000000505'),'another employee result is absent');

select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101')),1::bigint,'evaluator receives only their own evaluatee directory, not evaluated people');

select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select * from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101')$$,'42501','ASSESSMENT_RESULT_DIRECTORY_FORBIDDEN','cross-tenant owner denied');
select throws_ok($$select * from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000999')$$,'42501','ASSESSMENT_RESULT_DIRECTORY_FORBIDDEN','wrong company denied');

select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select * from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101')$$,'42501','ASSESSMENT_RESULT_DIRECTORY_FORBIDDEN','inactive membership denied');
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select * from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101')$$,'42501','ASSESSMENT_RESULT_DIRECTORY_FORBIDDEN','unresolved Person denied');
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select throws_ok($$select * from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101')$$,'42501','ASSESSMENT_RESULT_DIRECTORY_FORBIDDEN','no membership denied');
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000007","role":"authenticated"}',true);
select throws_ok($$select * from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101')$$,'42501','ASSESSMENT_RESULT_DIRECTORY_FORBIDDEN','cross-tenant admin denied');
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000008","role":"authenticated"}',true);
select throws_ok($$select * from get_current_person_assessment_result_directory_v1('b2000000-0000-4000-8000-000000000101')$$,'42501','ASSESSMENT_RESULT_DIRECTORY_FORBIDDEN','cross-tenant ordinary member denied');

select * from finish();
rollback;
