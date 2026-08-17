begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

select has_function('public',name,args) from (values
 ('get_tenant_assessment_catalog_v1',array['uuid']::text[]),
 ('get_tenant_assessment_template_structure_v1',array['uuid','uuid']::text[]),
 ('get_tenant_assessment_cycle_management_v1',array['uuid','uuid']::text[]),
 ('get_assessment_evaluator_workspace_v1',array['uuid','uuid']::text[]),
 ('get_current_person_feedback_threads_v1',array['uuid']::text[]),
 ('get_feedback_thread_detail_v1',array['uuid','uuid']::text[]),
 ('get_feedback_thread_messages_v1',array['uuid','uuid']::text[])
) f(name,args);

select ok(p.prosecdef and p.provolatile='s' and p.proconfig=array['search_path=public, pg_temp']::text[],p.proname||' is hardened')
from pg_proc p where p.oid in (
 'public.get_tenant_assessment_catalog_v1(uuid)'::regprocedure,
 'public.get_tenant_assessment_template_structure_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_assessment_cycle_management_v1(uuid,uuid)'::regprocedure,
 'public.get_assessment_evaluator_workspace_v1(uuid,uuid)'::regprocedure,
 'public.get_current_person_feedback_threads_v1(uuid)'::regprocedure,
 'public.get_feedback_thread_detail_v1(uuid,uuid)'::regprocedure,
 'public.get_feedback_thread_messages_v1(uuid,uuid)'::regprocedure) order by p.proname;

select ok(has_function_privilege('authenticated',p.oid,'execute'),p.proname||' authenticated execute')
from pg_proc p where p.oid in (
 'public.get_tenant_assessment_catalog_v1(uuid)'::regprocedure,
 'public.get_tenant_assessment_template_structure_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_assessment_cycle_management_v1(uuid,uuid)'::regprocedure,
 'public.get_assessment_evaluator_workspace_v1(uuid,uuid)'::regprocedure,
 'public.get_current_person_feedback_threads_v1(uuid)'::regprocedure,
 'public.get_feedback_thread_detail_v1(uuid,uuid)'::regprocedure,
 'public.get_feedback_thread_messages_v1(uuid,uuid)'::regprocedure) order by p.proname;

select ok(not has_function_privilege('anon',p.oid,'execute') and not has_function_privilege('service_role',p.oid,'execute')
  and not has_function_privilege('public',p.oid,'execute'),p.proname||' public anon service role denied')
from pg_proc p where p.oid in (
 'public.get_tenant_assessment_catalog_v1(uuid)'::regprocedure,
 'public.get_tenant_assessment_template_structure_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_assessment_cycle_management_v1(uuid,uuid)'::regprocedure,
 'public.get_assessment_evaluator_workspace_v1(uuid,uuid)'::regprocedure,
 'public.get_current_person_feedback_threads_v1(uuid)'::regprocedure,
 'public.get_feedback_thread_detail_v1(uuid,uuid)'::regprocedure,
 'public.get_feedback_thread_messages_v1(uuid,uuid)'::regprocedure) order by p.proname;

select ok(not has_table_privilege('authenticated','public.'||table_name,'select'),table_name||' SELECT remains closed')
from (values ('assessment_templates'),('assessment_sections'),('assessment_questions'),('assessment_cycles'),
 ('assessment_cycle_participants'),('feedback_threads'),('feedback_messages'),('feedback_acknowledgements'),
 ('feedback_attachments'),('feedback_mentions')) t(table_name);

select is((select proargnames from pg_proc where oid=signature::regprocedure),expected,description) from (values
 ('public.get_tenant_assessment_catalog_v1(uuid)',array['p_company_id','record_type','record_id','name','description','instructions','assessment_type','status','active','template_id','start_date','end_date','close_date','allow_self_assessment','allow_manager_assessment','allow_peer_assessment','allow_direct_report_assessment','anonymous','assessment_visibility']::text[],'assessment catalog exact shape'),
 ('public.get_tenant_assessment_template_structure_v1(uuid,uuid)',array['p_company_id','p_template_id','record_type','record_id','parent_id','name','description','instructions','assessment_type','status','icon','color','weight','display_order','question','help_text','question_type','scale_min','scale_max','required','active']::text[],'assessment structure exact shape'),
 ('public.get_tenant_assessment_cycle_management_v1(uuid,uuid)',array['p_company_id','p_cycle_id','record_type','record_id','person_id','full_name','email','name','description','assessment_type','status','template_id','start_date','end_date','close_date','allow_self_assessment','allow_manager_assessment','allow_peer_assessment','allow_direct_report_assessment','anonymous','assessment_visibility','created_at']::text[],'assessment cycle exact shape'),
 ('public.get_assessment_evaluator_workspace_v1(uuid,uuid)',array['p_company_id','p_response_id','record_type','record_id','parent_id','template_id','cycle_id','employee_id','evaluator_id','status','name','description','instructions','assessment_type','icon','color','weight','display_order','question','help_text','question_type','scale_min','scale_max','required','active','started_at','completed_at','submitted_at']::text[],'assessment evaluator workspace exact shape'),
 ('public.get_current_person_feedback_threads_v1(uuid)',array['p_company_id','thread_id','sender_person_id','receiver_person_id','sender_name','receiver_name','title','thread_type','priority','status','updated_at']::text[],'feedback directory exact shape'),
 ('public.get_feedback_thread_detail_v1(uuid,uuid)',array['p_company_id','p_thread_id','thread_id','sender_person_id','receiver_person_id','sender_name','receiver_name','title','thread_type','priority','status','visibility','requires_follow_up','follow_up_at','acknowledged_at','closed_at','created_at','updated_at']::text[],'feedback detail exact shape'),
 ('public.get_feedback_thread_messages_v1(uuid,uuid)',array['p_company_id','p_thread_id','message_id','author_person_id','author_name','message_type','content','edited_at','created_at']::text[],'feedback messages exact shape')
) s(signature,expected,description);

select is((select array_agg(format_type(t,null) order by n) from pg_proc p,
  unnest(p.proallargtypes) with ordinality x(t,n) where p.oid=signature::regprocedure),expected,description)
from (values
 ('public.get_tenant_assessment_catalog_v1(uuid)',array['uuid','text','uuid','text','text','text','text','text','boolean','uuid','date','date','date','boolean','boolean','boolean','boolean','boolean','text']::text[],'assessment catalog exact types'),
 ('public.get_tenant_assessment_template_structure_v1(uuid,uuid)',array['uuid','uuid','text','uuid','uuid','text','text','text','text','text','text','text','numeric','integer','text','text','text','integer','integer','boolean','boolean']::text[],'assessment structure exact types'),
 ('public.get_tenant_assessment_cycle_management_v1(uuid,uuid)',array['uuid','uuid','text','uuid','uuid','text','text','text','text','text','text','uuid','date','date','date','boolean','boolean','boolean','boolean','boolean','text','timestamp with time zone']::text[],'assessment cycle exact types'),
 ('public.get_assessment_evaluator_workspace_v1(uuid,uuid)',array['uuid','uuid','text','uuid','uuid','uuid','uuid','uuid','uuid','text','text','text','text','text','text','text','numeric','integer','text','text','text','integer','integer','boolean','boolean','timestamp with time zone','timestamp with time zone','timestamp with time zone']::text[],'assessment workspace exact types'),
 ('public.get_current_person_feedback_threads_v1(uuid)',array['uuid','uuid','uuid','uuid','text','text','text','text','text','text','timestamp with time zone']::text[],'feedback directory exact types'),
 ('public.get_feedback_thread_detail_v1(uuid,uuid)',array['uuid','uuid','uuid','uuid','uuid','text','text','text','text','text','text','text','boolean','timestamp with time zone','timestamp with time zone','timestamp with time zone','timestamp with time zone','timestamp with time zone']::text[],'feedback detail exact types'),
 ('public.get_feedback_thread_messages_v1(uuid,uuid)',array['uuid','uuid','uuid','uuid','text','text','text','timestamp with time zone','timestamp with time zone']::text[],'feedback messages exact types')
) t(signature,expected,description);

select ok((select bool_and(array_position(proargnames,'company_id') is null and array_position(proargnames,'user_id') is null
 and array_position(proargnames,'created_by_user_id') is null and array_position(proargnames,'metadata') is null)
 from pg_proc where oid in ('public.get_tenant_assessment_catalog_v1(uuid)'::regprocedure,
 'public.get_tenant_assessment_template_structure_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_assessment_cycle_management_v1(uuid,uuid)'::regprocedure,
 'public.get_assessment_evaluator_workspace_v1(uuid,uuid)'::regprocedure,
 'public.get_current_person_feedback_threads_v1(uuid)'::regprocedure,
 'public.get_feedback_thread_detail_v1(uuid,uuid)'::regprocedure,
 'public.get_feedback_thread_messages_v1(uuid,uuid)'::regprocedure)),
 'new projections omit company Auth IDs and metadata');

insert into auth.users(id,email,email_confirmed_at) select id,email,now() from (values
 ('88000000-0000-4000-8000-000000000001'::uuid,'owner88@example.com'),
 ('88000000-0000-4000-8000-000000000002','admin88@example.com'),
 ('88000000-0000-4000-8000-000000000003','hr88@example.com'),
 ('88000000-0000-4000-8000-000000000004','manager88@example.com'),
 ('88000000-0000-4000-8000-000000000005','sender88@example.com'),
 ('88000000-0000-4000-8000-000000000006','receiver88@example.com'),
 ('88000000-0000-4000-8000-000000000007','unrelated88@example.com'),
 ('88000000-0000-4000-8000-000000000008','inactive88@example.com'),
 ('88000000-0000-4000-8000-000000000009','foreign88@example.com'),
 ('88000000-0000-4000-8000-000000000010','none88@example.com')) u(id,email);
insert into public.companies(id,name,slug) values
 ('88000000-0000-4000-8000-000000000101','Boundary Alpha','boundary-alpha'),
 ('88000000-0000-4000-8000-000000000102','Boundary Foreign','boundary-foreign');
insert into public.company_members(id,company_id,user_id,role,status) select gen_random_uuid(),company_id,user_id,role,status from (values
 ('88000000-0000-4000-8000-000000000101'::uuid,'88000000-0000-4000-8000-000000000001'::uuid,'owner','active'),
 ('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000002','admin','active'),
 ('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000003','hr','active'),
 ('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000004','manager','active'),
 ('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000005','employee','active'),
 ('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000006','employee','active'),
 ('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000007','employee','active'),
 ('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000008','employee','inactive'),
 ('88000000-0000-4000-8000-000000000102','88000000-0000-4000-8000-000000000009','employee','active')) m(company_id,user_id,role,status);
insert into public.people(id,company_id,user_id,full_name,email,manager_id) values
 ('88000000-0000-4000-8000-000000000201','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000001','Owner','owner88@example.com',null),
 ('88000000-0000-4000-8000-000000000202','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000002','Admin','admin88@example.com',null),
 ('88000000-0000-4000-8000-000000000203','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000003','HR','hr88@example.com',null),
 ('88000000-0000-4000-8000-000000000204','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000004','Manager','manager88@example.com',null),
 ('88000000-0000-4000-8000-000000000205','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000005','Sender','sender88@example.com',null),
 ('88000000-0000-4000-8000-000000000206','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000006','Receiver','receiver88@example.com','88000000-0000-4000-8000-000000000204'),
 ('88000000-0000-4000-8000-000000000207','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000007','Unrelated','unrelated88@example.com',null),
 ('88000000-0000-4000-8000-000000000208','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000008','Inactive','inactive88@example.com',null),
 ('88000000-0000-4000-8000-000000000209','88000000-0000-4000-8000-000000000102','88000000-0000-4000-8000-000000000009','Foreign','foreign88@example.com',null),
 ('88000000-0000-4000-8000-000000000210','88000000-0000-4000-8000-000000000102',null,'Foreign Receiver',null,null);

insert into public.assessment_templates(id,company_id,name,description,instructions,type,status,active) values
 ('88000000-0000-4000-8000-000000000301','88000000-0000-4000-8000-000000000101','Template A','Desc','Instructions','360','active',true),
 ('88000000-0000-4000-8000-000000000302','88000000-0000-4000-8000-000000000102','Foreign Template','Desc','Instructions','360','active',true);
insert into public.assessment_sections(id,company_id,assessment_template_id,name,description,weight,display_order) values
 ('88000000-0000-4000-8000-000000000401','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000301','Section B','Second',1,2),
 ('88000000-0000-4000-8000-000000000402','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000301','Section A','First',1,1);
insert into public.assessment_questions(id,company_id,assessment_section_id,question,question_type,display_order) values
 ('88000000-0000-4000-8000-000000000501','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000402','Question B','scale',2),
 ('88000000-0000-4000-8000-000000000502','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000402','Question A','scale',1);
insert into public.assessment_cycles(id,company_id,name,assessment_type,status,start_date,end_date,assessment_template_id,assessment_visibility) values
 ('88000000-0000-4000-8000-000000000601','88000000-0000-4000-8000-000000000101','Cycle A','360','active','2026-01-01','2026-12-31','88000000-0000-4000-8000-000000000301','full'),
 ('88000000-0000-4000-8000-000000000602','88000000-0000-4000-8000-000000000102','Foreign Cycle','360','active','2026-01-01','2026-12-31','88000000-0000-4000-8000-000000000302','full');
insert into public.assessment_cycle_participants(id,company_id,assessment_cycle_id,employee_id,created_at) values
 ('88000000-0000-4000-8000-000000000701','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000601','88000000-0000-4000-8000-000000000206','2026-01-02');
insert into public.assessment_responses(id,company_id,assessment_cycle_id,assessment_template_id,employee_id,evaluator_id,status) values
 ('88000000-0000-4000-8000-000000000801','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000601','88000000-0000-4000-8000-000000000301','88000000-0000-4000-8000-000000000206','88000000-0000-4000-8000-000000000205','submitted');
insert into public.assessment_answers(id,company_id,assessment_response_id,assessment_question_id,answer_text,score) values
 ('88000000-0000-4000-8000-000000000901','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000801','88000000-0000-4000-8000-000000000502','Sensitive assessment',4);

insert into public.feedback_threads(id,company_id,sender_employee_id,receiver_employee_id,created_by_user_id,title,visibility,updated_at) values
 ('88100000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000205','88000000-0000-4000-8000-000000000206','88000000-0000-4000-8000-000000000005','Normal private','participants','2026-01-01'),
 ('88100000-0000-4000-8000-000000000002','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000205','88000000-0000-4000-8000-000000000206','88000000-0000-4000-8000-000000000005','HR explicit','hr','2026-01-02'),
 ('88100000-0000-4000-8000-000000000003','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000205','88000000-0000-4000-8000-000000000206','88000000-0000-4000-8000-000000000005','Historical management','management','2026-01-03'),
 ('88100000-0000-4000-8000-000000000004','88000000-0000-4000-8000-000000000102','88000000-0000-4000-8000-000000000209','88000000-0000-4000-8000-000000000210','88000000-0000-4000-8000-000000000009','Foreign','participants','2026-01-04');
insert into public.feedback_messages(id,company_id,thread_id,author_employee_id,created_by_user_id,type,content,metadata,created_at) values
 ('88200000-0000-4000-8000-000000000002','88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000205','88000000-0000-4000-8000-000000000005','message','Second sensitive message','{"secret":true}','2026-01-02'),
 ('88200000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000205','88000000-0000-4000-8000-000000000005','message','First sensitive message','{"secret":true}','2026-01-01'),
 ('88200000-0000-4000-8000-000000000003','88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000002','88000000-0000-4000-8000-000000000205','88000000-0000-4000-8000-000000000005','message','HR sensitive message','{"secret":true}','2026-01-01');

set local role authenticated;
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select * from public.get_tenant_assessment_catalog_v1('88000000-0000-4000-8000-000000000101')$$,'42501','AUTHENTICATION_REQUIRED','assessment unauthenticated denied');
select throws_ok($$select * from public.get_current_person_feedback_threads_v1('88000000-0000-4000-8000-000000000101')$$,'42501','AUTHENTICATION_REQUIRED','feedback unauthenticated denied');

select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000008","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_assessment_catalog_v1('88000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','inactive assessment member denied');
select throws_ok($$select * from public.get_current_person_feedback_threads_v1('88000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','inactive feedback member denied');
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000010","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_assessment_catalog_v1('88000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','no membership assessment denied');

select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_assessment_catalog_v1('88000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','manager assessment catalog denied');
select throws_ok($$select * from public.get_tenant_assessment_cycle_management_v1('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000601')$$,'42501','TENANT_AUTHORIZATION_DENIED','manager cycle management denied');
select is((select count(*) from public.get_feedback_thread_detail_v1('88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000003')),0::bigint,'manager cannot read management thread by hierarchy');

select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000007","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_assessment_catalog_v1('88000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','employee assessment catalog denied');
select is((select count(*) from public.get_feedback_thread_detail_v1('88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000001')),0::bigint,'unrelated employee cannot read private thread');

select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_assessment_catalog_v1('88000000-0000-4000-8000-000000000101')$$,'owner assessment catalog allowed');
select is((select count(*) from public.get_feedback_thread_detail_v1('88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000001')),0::bigint,'owner has no universal feedback read');
select is((select count(*) from public.get_feedback_thread_detail_v1('88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000002')),0::bigint,'owner does not inherit HR visibility');
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_assessment_template_structure_v1('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000301')$$,'admin assessment structure allowed');
select is((select count(*) from public.get_feedback_thread_detail_v1('88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000001')),0::bigint,'admin has no universal feedback read');
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_assessment_cycle_management_v1('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000601')$$,'HR assessment cycle allowed');
select is((select count(*) from public.get_feedback_thread_detail_v1('88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000001')),0::bigint,'HR cannot read normal private thread');
select is((select count(*) from public.get_feedback_thread_detail_v1('88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000002')),1::bigint,'active HR reads explicitly HR-visible thread');
select results_eq($$select title from public.get_current_person_feedback_threads_v1('88000000-0000-4000-8000-000000000101')$$,$$values ('HR explicit')$$,'HR directory contains only explicitly HR-visible thread');
select results_eq($$select content from public.get_feedback_thread_messages_v1('88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000002')$$,$$values ('HR sensitive message')$$,'HR reads authorized HR message content');

select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select results_eq($$select title from public.get_current_person_feedback_threads_v1('88000000-0000-4000-8000-000000000101')$$,$$values ('Historical management'),('HR explicit'),('Normal private')$$,'sender directory ordering is deterministic');
select is((select count(*) from public.get_feedback_thread_detail_v1('88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000002')),1::bigint,'sender reads HR-visible own thread');
select is((select count(*) from public.get_feedback_thread_detail_v1('88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000004')),0::bigint,'tenant A cannot infer foreign tenant thread');
select results_eq($$select content from public.get_feedback_thread_messages_v1('88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000001')$$,$$values ('First sensitive message'),('Second sensitive message')$$,'message ordering is deterministic after authorization');
select is((select count(*) from public.get_assessment_evaluator_workspace_v1('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000801') where record_type='response'),1::bigint,'evaluator accesses own response workspace');
select is((select count(*) from public.get_assessment_evaluator_workspace_v1('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000899')),0::bigint,'foreign or nonexistent response does not reveal existence');
select results_eq($$select question from public.get_assessment_evaluator_workspace_v1('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000801') where record_type='question'$$,$$values ('Question A'),('Question B')$$,'evaluator structure question ordering');
select throws_ok($$select * from public.get_tenant_assessment_catalog_v1('88000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','evaluator receives no admin catalog');

select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select is((select count(*) from public.get_feedback_thread_detail_v1('88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000002')),1::bigint,'receiver reads HR-visible own thread');
select is((select count(*) from public.get_assessment_evaluator_workspace_v1('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000801')),0::bigint,'evaluatee cannot access evaluator workspace');
select ok((public.read_assessment_result_for_evaluatee('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000801')->>'visibility')='full','existing evaluatee boundary preserved');

select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select results_eq($$select name from public.get_tenant_assessment_catalog_v1('88000000-0000-4000-8000-000000000101')$$,$$values ('Cycle A'),('Template A')$$,'assessment catalog ordering and tenant filter');
select results_eq($$select name from public.get_tenant_assessment_template_structure_v1('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000301') where record_type='section'$$,$$values ('Section A'),('Section B')$$,'assessment section ordering');
select is((select count(*) from public.get_tenant_assessment_template_structure_v1('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000302')),0::bigint,'foreign template selector hides existence');
select is((select count(*) from public.get_tenant_assessment_cycle_management_v1('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000602')),0::bigint,'foreign cycle selector hides existence');
select is((select count(*) from public.get_feedback_thread_messages_v1('88000000-0000-4000-8000-000000000101','88100000-0000-4000-8000-000000000001')),0::bigint,'owner cannot infer content through messages');
select lives_ok($$select public.read_assessment_administratively('88000000-0000-4000-8000-000000000101','response','88000000-0000-4000-8000-000000000801','boundary_regression')$$,'existing administrative boundary preserved');

select * from finish();
rollback;
