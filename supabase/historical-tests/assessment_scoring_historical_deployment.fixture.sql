-- Deliberate 0114-state fixture for deploying 0115 over terminal history.
insert into public.companies(id,name,slug) values
  ('b5000000-0000-4000-8000-000000000101','Historical 0115','historical-0115');
insert into public.people(id,company_id,full_name,status) values
  ('b5000000-0000-4000-8000-000000000201','b5000000-0000-4000-8000-000000000101','Self evaluator','active'),
  ('b5000000-0000-4000-8000-000000000202','b5000000-0000-4000-8000-000000000101','Non-self evaluatee','active');
insert into public.assessment_templates(id,company_id,name,type,status,active) values
  ('b5000000-0000-4000-8000-000000000301','b5000000-0000-4000-8000-000000000101','Historical Model','annual','active',true);
insert into public.assessment_sections(id,company_id,assessment_template_id,name,weight,display_order,active) values
  ('b5000000-0000-4000-8000-000000000401','b5000000-0000-4000-8000-000000000101','b5000000-0000-4000-8000-000000000301','Historical Section',1,1,true);
insert into public.assessment_questions(id,template_id,company_id,assessment_section_id,question,question_type,scale_min,scale_max,weight,required,active,display_order,order_index) values
  ('b5000000-0000-4000-8000-000000000501','b5000000-0000-4000-8000-000000000301','b5000000-0000-4000-8000-000000000101','b5000000-0000-4000-8000-000000000401','Historical score','scale',0,10,1,true,true,1,1);
insert into public.assessment_cycles(id,company_id,name,assessment_type,status,start_date,end_date,assessment_template_id,allow_self_assessment,allow_manager_assessment,allow_peer_assessment,allow_direct_report_assessment,assessment_visibility) values
  ('b5000000-0000-4000-8000-000000000601','b5000000-0000-4000-8000-000000000101','Historical Cycle','performance','active','2026-01-01','2026-01-31','b5000000-0000-4000-8000-000000000301',true,true,false,false,'full');
insert into public.assessment_execution_snapshots(id,company_id,assessment_cycle_id,source_assessment_template_id,template_name,template_type,capture_origin) values
  ('b5000000-0000-4000-8000-000000000701','b5000000-0000-4000-8000-000000000101','b5000000-0000-4000-8000-000000000601','b5000000-0000-4000-8000-000000000301','Historical Model','annual','response_generation');
insert into public.assessment_execution_snapshot_sections(id,company_id,assessment_execution_snapshot_id,source_assessment_section_id,name,weight,display_order,active_at_capture) values
  ('b5000000-0000-4000-8000-000000000711','b5000000-0000-4000-8000-000000000101','b5000000-0000-4000-8000-000000000701','b5000000-0000-4000-8000-000000000401','Historical Section',1,1,true);
insert into public.assessment_execution_snapshot_questions(id,company_id,assessment_execution_snapshot_id,assessment_execution_snapshot_section_id,source_assessment_question_id,question,question_type,required,weight,display_order,scale_min,scale_max,active_at_capture) values
  ('b5000000-0000-4000-8000-000000000721','b5000000-0000-4000-8000-000000000101','b5000000-0000-4000-8000-000000000701','b5000000-0000-4000-8000-000000000711','b5000000-0000-4000-8000-000000000501','Historical score','scale',true,1,1,0,10,true);
insert into public.assessment_responses(id,company_id,assessment_cycle_id,assessment_template_id,assessment_execution_snapshot_id,employee_id,evaluator_id,status,submitted_at,completed_at,created_at,updated_at) values
  ('b5000000-0000-4000-8000-000000000801','b5000000-0000-4000-8000-000000000101','b5000000-0000-4000-8000-000000000601','b5000000-0000-4000-8000-000000000301','b5000000-0000-4000-8000-000000000701','b5000000-0000-4000-8000-000000000201','b5000000-0000-4000-8000-000000000201','submitted','2026-01-10',null,'2026-01-01','2026-01-10'),
  ('b5000000-0000-4000-8000-000000000802','b5000000-0000-4000-8000-000000000101','b5000000-0000-4000-8000-000000000601','b5000000-0000-4000-8000-000000000301','b5000000-0000-4000-8000-000000000701','b5000000-0000-4000-8000-000000000202','b5000000-0000-4000-8000-000000000201','submitted','2026-01-11',null,'2026-01-01','2026-01-11'),
  ('b5000000-0000-4000-8000-000000000803','b5000000-0000-4000-8000-000000000101','b5000000-0000-4000-8000-000000000601','b5000000-0000-4000-8000-000000000301','b5000000-0000-4000-8000-000000000701','b5000000-0000-4000-8000-000000000202','b5000000-0000-4000-8000-000000000202','completed','2026-01-12','2026-01-13','2026-01-01','2026-01-13');
insert into public.assessment_answers(id,company_id,assessment_response_id,assessment_question_id,assessment_execution_snapshot_id,assessment_execution_snapshot_question_id,score,created_at,updated_at) values
  ('b5000000-0000-4000-8000-000000000901','b5000000-0000-4000-8000-000000000101','b5000000-0000-4000-8000-000000000801','b5000000-0000-4000-8000-000000000501','b5000000-0000-4000-8000-000000000701','b5000000-0000-4000-8000-000000000721',8,'2026-01-09','2026-01-09'),
  ('b5000000-0000-4000-8000-000000000902','b5000000-0000-4000-8000-000000000101','b5000000-0000-4000-8000-000000000802','b5000000-0000-4000-8000-000000000501','b5000000-0000-4000-8000-000000000701','b5000000-0000-4000-8000-000000000721',7,'2026-01-10','2026-01-10'),
  ('b5000000-0000-4000-8000-000000000903','b5000000-0000-4000-8000-000000000101','b5000000-0000-4000-8000-000000000803','b5000000-0000-4000-8000-000000000501','b5000000-0000-4000-8000-000000000701','b5000000-0000-4000-8000-000000000721',9,'2026-01-11','2026-01-11');
