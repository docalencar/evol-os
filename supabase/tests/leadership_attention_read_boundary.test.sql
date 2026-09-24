-- L-DB1 — trusted, read-only Leadership attention projection.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- Boundary identity and least privilege.
select has_function('public','get_manager_leadership_attention_v1',array['uuid']);
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_manager_leadership_attention_v1'),1::bigint,'one Leadership read boundary exists');
select is((select prosecdef from pg_proc where oid='public.get_manager_leadership_attention_v1(uuid)'::regprocedure),true,'boundary is SECURITY DEFINER');
select is((select provolatile from pg_proc where oid='public.get_manager_leadership_attention_v1(uuid)'::regprocedure),'s'::"char",'boundary is STABLE');
select is((select proconfig from pg_proc where oid='public.get_manager_leadership_attention_v1(uuid)'::regprocedure),array['search_path=public, pg_temp']::text[],'search_path is hardened');
select ok(has_function_privilege('authenticated','public.get_manager_leadership_attention_v1(uuid)','execute'),'authenticated may execute');
select ok(not has_function_privilege('anon','public.get_manager_leadership_attention_v1(uuid)','execute'),'anon cannot execute');
select ok(not has_function_privilege('public','public.get_manager_leadership_attention_v1(uuid)','execute'),'PUBLIC cannot execute');
select ok(not has_function_privilege('service_role','public.get_manager_leadership_attention_v1(uuid)','execute'),'service_role has no human Leadership authority');

select is(
  (select proargnames from pg_proc where oid='public.get_manager_leadership_attention_v1(uuid)'::regprocedure),
  array['p_company_id','subject_id','subject_name','subject_status','reason','priority','source_type','source_id','source_status','due_date','source_version','source_updated_at']::text[],
  'minimal projection names are exact'
);
select ok(not ((select proargnames from pg_proc where oid='public.get_manager_leadership_attention_v1(uuid)'::regprocedure) && array['answer','answers','score','message','content','review','summary','email','user_id','company_id']::text[]),'projection excludes private and authority fields');

-- Existing ACL and RLS posture is unchanged.
select results_eq(
  $$select role_name,relation_name,has_table_privilege(role_name,relation_name,'select') from unnest(array['anon','authenticated']) role_name, unnest(array['public.people','public.assessment_responses','public.feedback_threads','public.development_plans','public.development_goals','public.development_actions']) relation_name order by 1,2$$,
  $$values
    ('anon'::text,'public.assessment_responses'::text,false),
    ('anon','public.development_actions',false),
    ('anon','public.development_goals',false),
    ('anon','public.development_plans',false),
    ('anon','public.feedback_threads',false),
    ('anon','public.people',false),
    ('authenticated','public.assessment_responses',true),
    ('authenticated','public.development_actions',false),
    ('authenticated','public.development_goals',false),
    ('authenticated','public.development_plans',false),
    ('authenticated','public.feedback_threads',false),
    ('authenticated','public.people',false)$$,
  'existing source ACL posture is preserved exactly; no direct SELECT is broadened'
);
select ok((select bool_and(c.relrowsecurity) from pg_class c where c.oid in ('public.people'::regclass,'public.assessment_responses'::regclass,'public.feedback_threads'::regclass,'public.development_plans'::regclass,'public.development_goals'::regclass,'public.development_actions'::regclass)),'RLS remains enabled on every source relation');
select ok(has_function_privilege('authenticated','public.get_assessment_evaluator_workspace_v1(uuid,uuid)','execute'),'Assessment trusted read remains callable');
select ok(has_function_privilege('authenticated','public.get_current_person_feedback_threads_v1(uuid)','execute'),'Feedback trusted read remains callable');
select ok(has_function_privilege('authenticated','public.get_authorized_development_plans_v1(uuid,uuid)','execute'),'Development trusted read remains callable');

-- Run-owned tenant and actor graph.
insert into auth.users(id,email) values
 ('14000000-0000-4000-8000-000000000001','l-db1-manager@example.com'),
 ('14000000-0000-4000-8000-000000000002','l-db1-active@example.com'),
 ('14000000-0000-4000-8000-000000000003','l-db1-leave@example.com'),
 ('14000000-0000-4000-8000-000000000004','l-db1-missing@example.com'),
 ('14000000-0000-4000-8000-000000000005','l-db1-former@example.com'),
 ('14000000-0000-4000-8000-000000000006','l-db1-indirect@example.com'),
 ('14000000-0000-4000-8000-000000000007','l-db1-unrelated@example.com'),
 ('14000000-0000-4000-8000-000000000008','l-db1-role-only@example.com'),
 ('14000000-0000-4000-8000-000000000009','l-db1-owner@example.com'),
 ('14000000-0000-4000-8000-000000000010','l-db1-foreign-owner@example.com'),
 ('14000000-0000-4000-8000-000000000011','l-db1-foreign-person@example.com');

insert into public.companies(id,name,slug) values
 ('14000000-0000-4000-8000-000000000101','Leadership Alpha','leadership-alpha'),
 ('14000000-0000-4000-8000-000000000102','Leadership Foreign','leadership-foreign');

insert into public.company_members(id,company_id,user_id,role,status) values
 ('14000000-0000-4000-8000-000000000109','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000009','owner','active'),
 ('14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000001','manager','active'),
 ('14000000-0000-4000-8000-000000000102','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000002','employee','active'),
 ('14000000-0000-4000-8000-000000000103','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000003','employee','active'),
 ('14000000-0000-4000-8000-000000000104','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000004','employee','active'),
 ('14000000-0000-4000-8000-000000000105','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000005','employee','active'),
 ('14000000-0000-4000-8000-000000000106','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000006','employee','active'),
 ('14000000-0000-4000-8000-000000000107','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000007','employee','active'),
 ('14000000-0000-4000-8000-000000000108','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000008','manager','active'),
 ('14000000-0000-4000-8000-000000000110','14000000-0000-4000-8000-000000000102','14000000-0000-4000-8000-000000000010','owner','active'),
 ('14000000-0000-4000-8000-000000000111','14000000-0000-4000-8000-000000000102','14000000-0000-4000-8000-000000000011','employee','active');

insert into public.people(id,company_id,user_id,full_name,status,manager_id) values
 ('14000000-0000-4000-8000-000000000201','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000001','Manager Alpha','active',null),
 ('14000000-0000-4000-8000-000000000202','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000002','Active Report','active','14000000-0000-4000-8000-000000000201'),
 ('14000000-0000-4000-8000-000000000203','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000003','Leave Report','on_leave','14000000-0000-4000-8000-000000000201'),
 ('14000000-0000-4000-8000-000000000204','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000004','Missing Plan Report','active','14000000-0000-4000-8000-000000000201'),
 ('14000000-0000-4000-8000-000000000205','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000005','Former Report','active',null),
 ('14000000-0000-4000-8000-000000000206','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000006','Indirect Report','active','14000000-0000-4000-8000-000000000202'),
 ('14000000-0000-4000-8000-000000000207','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000007','Unrelated Person','active',null),
 ('14000000-0000-4000-8000-000000000208','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000008','Role Only Manager','active',null),
 ('14000000-0000-4000-8000-000000000209','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000009','Tenant Owner','active',null),
 ('14000000-0000-4000-8000-000000000210','14000000-0000-4000-8000-000000000102','14000000-0000-4000-8000-000000000010','Foreign Owner','active',null),
 ('14000000-0000-4000-8000-000000000211','14000000-0000-4000-8000-000000000102','14000000-0000-4000-8000-000000000011','Foreign Person','active','14000000-0000-4000-8000-000000000210');

insert into public.assessment_templates(id,company_id,name,type) values
 ('14000000-0000-4000-8000-000000000301','14000000-0000-4000-8000-000000000101','Leadership Template','annual'),
 ('14000000-0000-4000-8000-000000000302','14000000-0000-4000-8000-000000000102','Foreign Template','annual');

insert into public.assessment_cycles(id,company_id,name,status,start_date,end_date) values
 ('14000000-0000-4000-8000-000000000401','14000000-0000-4000-8000-000000000101','Overdue Cycle','active',current_date-30,current_date-3),
 ('14000000-0000-4000-8000-000000000402','14000000-0000-4000-8000-000000000101','Pending Cycle','active',current_date-1,current_date+20),
 ('14000000-0000-4000-8000-000000000403','14000000-0000-4000-8000-000000000101','Feedback Cycle','completed',current_date-40,current_date-10),
 ('14000000-0000-4000-8000-000000000404','14000000-0000-4000-8000-000000000101','Excluded Cycle','active',current_date-1,current_date+25),
 ('14000000-0000-4000-8000-000000000405','14000000-0000-4000-8000-000000000102','Foreign Cycle','active',current_date-1,current_date+25);

insert into public.assessment_execution_snapshots(id,company_id,assessment_cycle_id,source_assessment_template_id,template_name,template_type,capture_origin) values
 ('14000000-0000-4000-8000-000000000451','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000401','14000000-0000-4000-8000-000000000301','Leadership Template','annual','response_generation'),
 ('14000000-0000-4000-8000-000000000452','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000402','14000000-0000-4000-8000-000000000301','Leadership Template','annual','response_generation'),
 ('14000000-0000-4000-8000-000000000453','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000403','14000000-0000-4000-8000-000000000301','Leadership Template','annual','response_generation'),
 ('14000000-0000-4000-8000-000000000454','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000404','14000000-0000-4000-8000-000000000301','Leadership Template','annual','response_generation'),
 ('14000000-0000-4000-8000-000000000455','14000000-0000-4000-8000-000000000102','14000000-0000-4000-8000-000000000405','14000000-0000-4000-8000-000000000302','Foreign Template','annual','response_generation');

insert into public.assessment_responses(id,company_id,assessment_cycle_id,assessment_template_id,assessment_execution_snapshot_id,employee_id,evaluator_id,status,perspective,updated_at) values
 ('14000000-0000-4000-8000-000000000501','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000401','14000000-0000-4000-8000-000000000301','14000000-0000-4000-8000-000000000451','14000000-0000-4000-8000-000000000202','14000000-0000-4000-8000-000000000201','draft','manager',clock_timestamp()-interval '3 days'),
 ('14000000-0000-4000-8000-000000000502','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000402','14000000-0000-4000-8000-000000000301','14000000-0000-4000-8000-000000000452','14000000-0000-4000-8000-000000000203','14000000-0000-4000-8000-000000000201','in_progress','manager',clock_timestamp()-interval '1 day'),
 ('14000000-0000-4000-8000-000000000503','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000403','14000000-0000-4000-8000-000000000301','14000000-0000-4000-8000-000000000453','14000000-0000-4000-8000-000000000202','14000000-0000-4000-8000-000000000201','submitted','manager',clock_timestamp()),
 ('14000000-0000-4000-8000-000000000504','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000404','14000000-0000-4000-8000-000000000301','14000000-0000-4000-8000-000000000454','14000000-0000-4000-8000-000000000205','14000000-0000-4000-8000-000000000201','draft','manager',clock_timestamp()),
 ('14000000-0000-4000-8000-000000000505','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000404','14000000-0000-4000-8000-000000000301','14000000-0000-4000-8000-000000000454','14000000-0000-4000-8000-000000000206','14000000-0000-4000-8000-000000000201','draft','manager',clock_timestamp()),
 ('14000000-0000-4000-8000-000000000506','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000404','14000000-0000-4000-8000-000000000301','14000000-0000-4000-8000-000000000454','14000000-0000-4000-8000-000000000207','14000000-0000-4000-8000-000000000201','draft','manager',clock_timestamp()),
 ('14000000-0000-4000-8000-000000000507','14000000-0000-4000-8000-000000000102','14000000-0000-4000-8000-000000000405','14000000-0000-4000-8000-000000000302','14000000-0000-4000-8000-000000000455','14000000-0000-4000-8000-000000000211','14000000-0000-4000-8000-000000000210','draft','manager',clock_timestamp());

-- A second finalized response already has its formal Feedback and must not emit
-- formal_feedback_pending.
insert into public.assessment_responses(id,company_id,assessment_cycle_id,assessment_template_id,assessment_execution_snapshot_id,employee_id,evaluator_id,status,perspective,updated_at) values
 ('14000000-0000-4000-8000-000000000508','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000404','14000000-0000-4000-8000-000000000301','14000000-0000-4000-8000-000000000454','14000000-0000-4000-8000-000000000202','14000000-0000-4000-8000-000000000201','completed','manager',clock_timestamp());

insert into public.feedback_threads(id,company_id,sender_employee_id,receiver_employee_id,created_by_user_id,assessment_response_id,type,status,priority,visibility,title) values
 ('14000000-0000-4000-8000-000000000601','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000201','14000000-0000-4000-8000-000000000202','14000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000508','feedback','awaiting_acknowledgement','normal','participants','Existing formal feedback');

insert into public.competencies(id,company_id,name,category,expected_level,active) values
 ('14000000-0000-4000-8000-000000000701','14000000-0000-4000-8000-000000000101','Leadership Test Skill','leadership',3,true);

insert into public.development_plans(id,company_id,employee_id,created_by,owner_id,title,status,priority,due_date,version,updated_at) values
 ('14000000-0000-4000-8000-000000000801','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000202','14000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000201','Active overdue PDI','active','high',null,4,clock_timestamp()-interval '2 days'),
 ('14000000-0000-4000-8000-000000000802','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000203','14000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000201','Leave due PDI','active','medium',current_date+10,2,clock_timestamp()-interval '1 day'),
 ('14000000-0000-4000-8000-000000000803','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000205','14000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000201','Former PDI','active','medium',current_date+5,1,clock_timestamp()),
 ('14000000-0000-4000-8000-000000000804','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000206','14000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000202','Indirect PDI','active','medium',current_date+5,1,clock_timestamp()),
 ('14000000-0000-4000-8000-000000000805','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000207','14000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000209','Unrelated PDI','active','medium',current_date+5,1,clock_timestamp());

insert into public.development_goals(id,company_id,plan_id,competency_id,title,current_level,expected_level,target_level) values
 ('14000000-0000-4000-8000-000000000901','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000801','14000000-0000-4000-8000-000000000701','Overdue Goal',1,3,3);
insert into public.development_actions(id,company_id,goal_id,title,type,status,due_date) values
 ('14000000-0000-4000-8000-000000000902','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000901','Overdue Action','other','pending',current_date-2),
 ('14000000-0000-4000-8000-000000000903','14000000-0000-4000-8000-000000000101','14000000-0000-4000-8000-000000000901','Completed Older Action','other','completed',current_date-20);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select is((select count(*) from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101')),6::bigint,'exactly six factual attention rows are projected');
select is((select count(distinct subject_id) from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101')),3::bigint,'active and on-leave current direct reports are included');
select is((select distinct subject_status from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where subject_id='14000000-0000-4000-8000-000000000202'),'active','active direct report is included');
select is((select distinct subject_status from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where subject_id='14000000-0000-4000-8000-000000000203'),'on_leave','on-leave direct report is included');
select ok(not exists(select 1 from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where subject_id in ('14000000-0000-4000-8000-000000000205','14000000-0000-4000-8000-000000000206','14000000-0000-4000-8000-000000000207','14000000-0000-4000-8000-000000000211')),'former, indirect, unrelated and foreign people are absent');
select is((select count(*) from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where subject_id='14000000-0000-4000-8000-000000000202'),3::bigint,'multiple reasons for one subject remain separate');

select is((select priority from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason='assigned_assessment_overdue'),'high','overdue Assessment is high');
select is((select due_date from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason='assigned_assessment_overdue'),current_date-3,'overdue Assessment uses canonical cycle date');
select is((select priority from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason='assigned_assessment_pending'),'medium','pending Assessment is medium');
select is((select due_date from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason='assigned_assessment_pending'),current_date+20,'pending Assessment uses canonical cycle date');
select is((select priority from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason='formal_feedback_pending'),'medium','eligible missing formal Feedback is medium');
select is((select source_id from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason='formal_feedback_pending'),'14000000-0000-4000-8000-000000000503'::uuid,'Feedback reason routes by eligible response identity');
select ok(not exists(select 1 from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason='formal_feedback_pending' and source_id='14000000-0000-4000-8000-000000000508'),'existing formal Feedback suppresses pending reason');
select is((select priority from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason='development_follow_up_overdue'),'high','overdue Development follow-up is high');
select is((select due_date from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason='development_follow_up_overdue'),current_date-2,'earliest nonterminal action date drives overdue follow-up');
select is((select source_version from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason='development_follow_up_overdue'),4::bigint,'Development route carries canonical plan version');
select is((select priority from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason='development_follow_up_due'),'medium','Development due within 30 days is medium');
select is((select due_date from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason='development_follow_up_due'),current_date+10,'plan due date is canonical');
select is((select priority from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason='development_plan_missing'),'low','authoritatively missing PDI is low');
select is((select source_id from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason='development_plan_missing'),'14000000-0000-4000-8000-000000000204'::uuid,'missing-PDI route identifies the eligible subject');

select results_eq(
  $$select reason from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101')$$,
  $$values ('assigned_assessment_overdue'::text),('development_follow_up_overdue'),('development_follow_up_due'),('assigned_assessment_pending'),('formal_feedback_pending'),('development_plan_missing')$$,
  'stable ordering is priority, due date, reason, subject name and subject ID'
);
select results_eq(
  $$select subject_id,reason,priority,source_type,source_id,source_status,due_date,source_version,source_updated_at from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101')$$,
  $$select subject_id,reason,priority,source_type,source_id,source_status,due_date,source_version,source_updated_at from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101')$$,
  'fixed canonical state produces byte-equivalent factual rows and order'
);
select is((select count(*) from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101') where reason not in ('assigned_assessment_overdue','assigned_assessment_pending','formal_feedback_pending','development_follow_up_overdue','development_follow_up_due','development_plan_missing')),0::bigint,'no competency, score, recognition or canned reason exists');

-- Role alone grants no subject access.
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000008","role":"authenticated"}',true);
select is((select count(*) from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101')),0::bigint,'manager role without current direct reports grants no rows');

-- Foreign selector and unauthenticated execution fail, rather than degrading to
-- an empty successful response. Because all sources are one SQL statement and
-- there is no exception-to-empty handler, any source error propagates likewise.
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000010","role":"authenticated"}',true);
select throws_ok($$select * from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','foreign actor cannot inspect tenant Leadership state');
reset role;

-- A real source failure must propagate. The temporary column rename is wholly
-- contained by this test transaction and is restored immediately; it proves
-- that the composed read cannot turn an unavailable source into an empty queue.
alter table public.assessment_responses rename column updated_at to source_unavailable_for_test;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101')$$,'42703',null,'real source-read failure propagates instead of returning empty success');
reset role;
alter table public.assessment_responses rename column source_unavailable_for_test to updated_at;

select set_config('request.jwt.claims','{}',true);
select throws_ok($$select * from public.get_manager_leadership_attention_v1('14000000-0000-4000-8000-000000000101')$$,'42501','AUTHENTICATION_REQUIRED','missing identity fails closed');
select ok(lower(pg_get_functiondef('public.get_manager_leadership_attention_v1(uuid)'::regprocedure)) !~ 'exception[[:space:]]+when','source failures are not caught or converted into empty success');

select * from finish();
rollback;
