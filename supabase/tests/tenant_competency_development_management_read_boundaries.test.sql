begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select plan(78);

select has_function('public',name,args) from (values
 ('get_tenant_competencies_management_v1',array['uuid']::text[]),
 ('get_tenant_development_plans_management_v1',array['uuid','uuid']::text[]),
 ('get_tenant_development_goals_management_v1',array['uuid','uuid']::text[]),
 ('get_tenant_development_actions_management_v1',array['uuid','uuid']::text[]),
 ('get_tenant_development_templates_management_v1',array['uuid','uuid']::text[]),
 ('get_tenant_development_template_goals_v1',array['uuid','uuid']::text[]),
 ('get_tenant_development_template_actions_v1',array['uuid','uuid']::text[])
) f(name,args);

select is((select proargnames from pg_proc where oid=signature::regprocedure),expected,description) from (values
 ('public.get_tenant_competencies_management_v1(uuid)',array['p_company_id','competency_id','name','description','category','expected_level','weight','active','created_at','updated_at']::text[],'competency shape is exact'),
 ('public.get_tenant_development_plans_management_v1(uuid,uuid)',array['p_company_id','p_plan_id','plan_id','employee_id','owner_id','template_id','title','description','status','priority','start_date','due_date','completed_at','created_at','updated_at']::text[],'plan shape is exact'),
 ('public.get_tenant_development_goals_management_v1(uuid,uuid)',array['p_company_id','p_plan_id','goal_id','plan_id','competency_id','title','description','current_level','expected_level','target_level','status','created_at','updated_at']::text[],'goal shape is exact'),
 ('public.get_tenant_development_actions_management_v1(uuid,uuid)',array['p_company_id','p_plan_id','action_id','goal_id','plan_id','title','description','action_type','status','due_date','completed_at','created_at','updated_at']::text[],'action shape is exact'),
 ('public.get_tenant_development_templates_management_v1(uuid,uuid)',array['p_company_id','p_template_id','template_id','name','description','scope','suggested_duration_days','active','created_at','updated_at']::text[],'template shape is exact'),
 ('public.get_tenant_development_template_goals_v1(uuid,uuid)',array['p_company_id','p_template_id','template_goal_id','template_id','competency_id','competency_name','description','suggested_target_level','order_index','created_at','updated_at']::text[],'template goal shape is exact'),
 ('public.get_tenant_development_template_actions_v1(uuid,uuid)',array['p_company_id','p_template_id','template_action_id','template_goal_id','title','description','action_type','suggested_due_days','order_index','created_at','updated_at']::text[],'template action shape is exact')
) shapes(signature,expected,description);

select is((select array_agg(format_type(t,null) order by n) from pg_proc p,unnest(p.proallargtypes) with ordinality x(t,n) where p.oid=signature::regprocedure),expected,description) from (values
 ('public.get_tenant_competencies_management_v1(uuid)',array['uuid','uuid','text','text','text','integer','integer','boolean','timestamp with time zone','timestamp with time zone']::text[],'competency types are exact'),
 ('public.get_tenant_development_plans_management_v1(uuid,uuid)',array['uuid','uuid','uuid','uuid','uuid','uuid','text','text','text','text','date','date','timestamp with time zone','timestamp with time zone','timestamp with time zone']::text[],'plan types are exact'),
 ('public.get_tenant_development_goals_management_v1(uuid,uuid)',array['uuid','uuid','uuid','uuid','uuid','text','text','integer','integer','integer','text','timestamp with time zone','timestamp with time zone']::text[],'goal types are exact'),
 ('public.get_tenant_development_actions_management_v1(uuid,uuid)',array['uuid','uuid','uuid','uuid','uuid','text','text','text','text','date','timestamp with time zone','timestamp with time zone','timestamp with time zone']::text[],'action types are exact'),
 ('public.get_tenant_development_templates_management_v1(uuid,uuid)',array['uuid','uuid','uuid','text','text','text','integer','boolean','timestamp with time zone','timestamp with time zone']::text[],'template types are exact'),
 ('public.get_tenant_development_template_goals_v1(uuid,uuid)',array['uuid','uuid','uuid','uuid','uuid','text','text','integer','integer','timestamp with time zone','timestamp with time zone']::text[],'template goal types are exact'),
 ('public.get_tenant_development_template_actions_v1(uuid,uuid)',array['uuid','uuid','uuid','uuid','text','text','text','integer','integer','timestamp with time zone','timestamp with time zone']::text[],'template action types are exact')
) types(signature,expected,description);

select ok(p.prosecdef and p.provolatile='s' and p.proconfig=array['search_path=public, pg_temp']::text[],p.proname||' is hardened')
from pg_proc p where p.oid in (
 'public.get_tenant_competencies_management_v1(uuid)'::regprocedure,
 'public.get_tenant_development_plans_management_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_goals_management_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_actions_management_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_templates_management_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_template_goals_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_template_actions_v1(uuid,uuid)'::regprocedure
) order by p.proname;

select ok(has_function_privilege('authenticated',p.oid,'execute'),p.proname||' authenticated execute')
from pg_proc p where p.oid in (
 'public.get_tenant_competencies_management_v1(uuid)'::regprocedure,
 'public.get_tenant_development_plans_management_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_goals_management_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_actions_management_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_templates_management_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_template_goals_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_template_actions_v1(uuid,uuid)'::regprocedure
) order by p.proname;

select ok(not has_function_privilege('anon',p.oid,'execute') and not has_function_privilege('service_role',p.oid,'execute') and not has_function_privilege('public',p.oid,'execute'),p.proname||' privileged roles denied')
from pg_proc p where p.oid in (
 'public.get_tenant_competencies_management_v1(uuid)'::regprocedure,
 'public.get_tenant_development_plans_management_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_goals_management_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_actions_management_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_templates_management_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_template_goals_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_development_template_actions_v1(uuid,uuid)'::regprocedure
) order by p.proname;

select ok(not has_table_privilege('authenticated','public.'||table_name,'select'),table_name||' SELECT remains closed') from (values
 ('competencies'),('employee_competencies'),('position_competencies'),('development_plans'),('development_goals'),('development_actions'),
 ('development_templates'),('development_template_goals'),('development_template_actions')
) t(table_name);

insert into auth.users(id,email,email_confirmed_at) select id,email,now() from (values
 ('87000000-0000-4000-8000-000000000001'::uuid,'e-owner@example.com'),('87000000-0000-4000-8000-000000000002','e-admin@example.com'),
 ('87000000-0000-4000-8000-000000000003','e-hr@example.com'),('87000000-0000-4000-8000-000000000004','e-manager@example.com'),
 ('87000000-0000-4000-8000-000000000005','e-employee@example.com'),('87000000-0000-4000-8000-000000000006','e-inactive@example.com'),
 ('87000000-0000-4000-8000-000000000007','e-none@example.com')
) u(id,email);
insert into public.companies(id,name,slug) values
 ('87000000-0000-4000-8000-000000000101','E Alpha','e-alpha'),('87000000-0000-4000-8000-000000000102','E Foreign','e-foreign');
insert into public.company_members(id,company_id,user_id,role,status) select id,'87000000-0000-4000-8000-000000000101',user_id,role,status from (values
 ('87000000-0000-4000-8000-000000000111'::uuid,'87000000-0000-4000-8000-000000000001'::uuid,'owner','active'),
 ('87000000-0000-4000-8000-000000000112','87000000-0000-4000-8000-000000000002','admin','active'),
 ('87000000-0000-4000-8000-000000000113','87000000-0000-4000-8000-000000000003','hr','active'),
 ('87000000-0000-4000-8000-000000000114','87000000-0000-4000-8000-000000000004','manager','active'),
 ('87000000-0000-4000-8000-000000000115','87000000-0000-4000-8000-000000000005','employee','active'),
 ('87000000-0000-4000-8000-000000000116','87000000-0000-4000-8000-000000000006','employee','inactive')
) m(id,user_id,role,status);
insert into public.people(id,company_id,full_name) values ('87000000-0000-4000-8000-000000000201','87000000-0000-4000-8000-000000000101','Person');
insert into public.competencies(id,company_id,name,description,category,expected_level,weight,active) values
 ('87000000-0000-4000-8000-000000000301','87000000-0000-4000-8000-000000000101','Alpha','Description','technical',3,2,true),
 ('87000000-0000-4000-8000-000000000304','87000000-0000-4000-8000-000000000101','Beta','Description','leadership',4,3,true),
 ('87000000-0000-4000-8000-000000000302','87000000-0000-4000-8000-000000000101','Inactive',null,'behavioral',2,1,false),
 ('87000000-0000-4000-8000-000000000303','87000000-0000-4000-8000-000000000102','Foreign',null,'technical',2,1,true);
insert into public.development_plans(id,company_id,employee_id,created_by,title,description,status,priority,created_at) values
 ('87000000-0000-4000-8000-000000000401','87000000-0000-4000-8000-000000000101','87000000-0000-4000-8000-000000000201','87000000-0000-4000-8000-000000000001','Plan old','Description','active','high','2024-01-01'),
 ('87000000-0000-4000-8000-000000000402','87000000-0000-4000-8000-000000000101','87000000-0000-4000-8000-000000000201','87000000-0000-4000-8000-000000000001','Plan new','Description','draft','low','2024-02-01');
insert into public.development_goals(id,company_id,plan_id,competency_id,title,description,current_level,expected_level,target_level,status) values
 ('87000000-0000-4000-8000-000000000501','87000000-0000-4000-8000-000000000101','87000000-0000-4000-8000-000000000401','87000000-0000-4000-8000-000000000301','Goal A','Description',1,3,3,'in_progress'),
 ('87000000-0000-4000-8000-000000000502','87000000-0000-4000-8000-000000000101','87000000-0000-4000-8000-000000000401','87000000-0000-4000-8000-000000000304','Goal B','Description',1,4,4,'not_started');
insert into public.development_actions(id,company_id,goal_id,title,description,type,status) values
 ('87000000-0000-4000-8000-000000000601','87000000-0000-4000-8000-000000000101','87000000-0000-4000-8000-000000000501','Action A','Description','course','pending'),
 ('87000000-0000-4000-8000-000000000602','87000000-0000-4000-8000-000000000101','87000000-0000-4000-8000-000000000501','Action B','Description','book','pending');
insert into public.development_templates(id,company_id,name,description,scope,active) values
 ('87000000-0000-4000-8000-000000000701','87000000-0000-4000-8000-000000000101','Template','Description','company',true),
 ('87000000-0000-4000-8000-000000000702','87000000-0000-4000-8000-000000000101','Inactive',null,'company',false),
 ('87000000-0000-4000-8000-000000000703',null,'Global template','Global','global',true),
 ('87000000-0000-4000-8000-000000000704','87000000-0000-4000-8000-000000000102','Foreign template','Foreign','company',true);
insert into public.development_template_goals(id,template_id,competency_id,description,order_index,company_id) values
 ('87000000-0000-4000-8000-000000000801','87000000-0000-4000-8000-000000000701','87000000-0000-4000-8000-000000000301','Goal description',0,'87000000-0000-4000-8000-000000000101'),
 ('87000000-0000-4000-8000-000000000802','87000000-0000-4000-8000-000000000701','87000000-0000-4000-8000-000000000304','Goal second',1,'87000000-0000-4000-8000-000000000101');
insert into public.development_template_actions(id,template_goal_id,title,description,type,order_index) values
 ('87000000-0000-4000-8000-000000000901','87000000-0000-4000-8000-000000000801','Template action A','Description','course',0),
 ('87000000-0000-4000-8000-000000000902','87000000-0000-4000-8000-000000000801','Template action B','Description','book',1);

set local role authenticated;
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select * from public.get_tenant_competencies_management_v1('87000000-0000-4000-8000-000000000101')$$,'42501','AUTHENTICATION_REQUIRED','unauthenticated denied');
select set_config('request.jwt.claims','{"sub":"87000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_competencies_management_v1('87000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','inactive member denied');
select set_config('request.jwt.claims','{"sub":"87000000-0000-4000-8000-000000000007","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_competencies_management_v1('87000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','user without membership denied');
select set_config('request.jwt.claims','{"sub":"87000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_competencies_management_v1('87000000-0000-4000-8000-000000000102')$$,'42501','TENANT_AUTHORIZATION_DENIED','foreign tenant denied');
select lives_ok(format('select * from public.get_tenant_competencies_management_v1(%L)', '87000000-0000-4000-8000-000000000101'),role||' active member allowed') from (values
 ('owner','87000000-0000-4000-8000-000000000001'),('admin','87000000-0000-4000-8000-000000000002'),('hr','87000000-0000-4000-8000-000000000003'),
 ('manager','87000000-0000-4000-8000-000000000004'),('employee','87000000-0000-4000-8000-000000000005')
) r(role,user_id), lateral (select set_config('request.jwt.claims',format('{"sub":"%s","role":"authenticated"}',user_id),true)) s;
select set_config('request.jwt.claims','{"sub":"87000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select results_eq($$select name from public.get_tenant_competencies_management_v1('87000000-0000-4000-8000-000000000101')$$,$$values ('Alpha'),('Beta')$$,'competency ordering and active filter');
select results_eq($$select title from public.get_tenant_development_plans_management_v1('87000000-0000-4000-8000-000000000101',null)$$,$$values ('Plan new'),('Plan old')$$,'plan ordering is deterministic');
select is((select count(*) from public.get_tenant_development_plans_management_v1('87000000-0000-4000-8000-000000000101','87000000-0000-4000-8000-000000000499')),0::bigint,'foreign plan selector is empty');
select results_eq($$select title from public.get_tenant_development_goals_management_v1('87000000-0000-4000-8000-000000000101','87000000-0000-4000-8000-000000000401')$$,$$values ('Goal A'),('Goal B')$$,'goal ordering is deterministic');
select results_eq($$select title from public.get_tenant_development_actions_management_v1('87000000-0000-4000-8000-000000000101','87000000-0000-4000-8000-000000000401')$$,$$values ('Action A'),('Action B')$$,'action ordering and tenant-safe plan join');
select results_eq($$select name from public.get_tenant_development_templates_management_v1('87000000-0000-4000-8000-000000000101',null)$$,$$values ('Template'),('Global template')$$,'template ordering contains tenant and global only');
select is((select count(*) from public.get_tenant_development_templates_management_v1('87000000-0000-4000-8000-000000000101',null) where name='Global template'),1::bigint,'global template is visible');
select is((select count(*) from public.get_tenant_development_templates_management_v1('87000000-0000-4000-8000-000000000101',null) where name='Template'),1::bigint,'own company template is visible');
select is((select count(*) from public.get_tenant_development_templates_management_v1('87000000-0000-4000-8000-000000000101',null) where name='Foreign template'),0::bigint,'foreign company template is excluded');
select is((select count(*) from public.get_tenant_development_templates_management_v1('87000000-0000-4000-8000-000000000101',null) where name='Inactive'),0::bigint,'inactive template is excluded');
select results_eq($$select competency_name from public.get_tenant_development_template_goals_v1('87000000-0000-4000-8000-000000000101','87000000-0000-4000-8000-000000000701')$$,$$values ('Alpha'),('Beta')$$,'company template goal ordering and competency names are tenant-safe');
select ok((select pg_get_constraintdef(oid) like '%FOREIGN KEY (competency_id, company_id)%REFERENCES competencies(id, company_id)%' from pg_constraint where conname='development_template_goals_competency_company_fkey'),'composite FK prevents foreign tenant competency references');
select ok((select pg_get_constraintdef(oid) like '%global_concept_version_id IS NOT NULL%' from pg_constraint where conname='development_template_goals_reference_check'),'global template goals use global concept versions instead of impossible global competencies');
select results_eq($$select title from public.get_tenant_development_template_actions_v1('87000000-0000-4000-8000-000000000101','87000000-0000-4000-8000-000000000701')$$,$$values ('Template action A'),('Template action B')$$,'template action ordering is deterministic');
select is((select count(*) from public.get_tenant_development_template_goals_v1('87000000-0000-4000-8000-000000000101','87000000-0000-4000-8000-000000000799')),0::bigint,'foreign template goal selector is empty');
select is((select count(*) from public.get_tenant_development_template_actions_v1('87000000-0000-4000-8000-000000000101','87000000-0000-4000-8000-000000000799')),0::bigint,'foreign template action selector is empty');
select ok((select bool_and(array_position(proargnames,'created_by') is null) from pg_proc where oid in (
 'public.get_tenant_development_plans_management_v1(uuid,uuid)'::regprocedure,'public.get_tenant_development_templates_management_v1(uuid,uuid)'::regprocedure)), 'raw created_by Auth IDs are excluded');
select ok((select bool_and(array_position(proargnames,'company_id') is null and array_position(proargnames,'user_id') is null and array_position(proargnames,'created_by') is null)
  from pg_proc where oid in ('public.get_tenant_competencies_management_v1(uuid)'::regprocedure,'public.get_tenant_development_plans_management_v1(uuid,uuid)'::regprocedure,
  'public.get_tenant_development_goals_management_v1(uuid,uuid)'::regprocedure,'public.get_tenant_development_actions_management_v1(uuid,uuid)'::regprocedure,
  'public.get_tenant_development_templates_management_v1(uuid,uuid)'::regprocedure,'public.get_tenant_development_template_goals_v1(uuid,uuid)'::regprocedure,
  'public.get_tenant_development_template_actions_v1(uuid,uuid)'::regprocedure)), 'return shapes exclude tenant and Auth authority fields');

reset role;
select * from finish();
rollback;
