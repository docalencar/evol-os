begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select plan(118);

select has_function('public', name, args)
from (values
 ('get_tenant_people_management_v1',array['uuid']::text[]),
 ('get_tenant_person_profile_v1',array['uuid','uuid']::text[]),
 ('get_tenant_departments_management_v1',array['uuid']::text[]),
 ('get_tenant_teams_management_v1',array['uuid']::text[]),
 ('get_tenant_positions_management_v1',array['uuid']::text[]),
 ('get_tenant_position_requirements_v1',array['uuid','uuid']::text[]),
 ('get_tenant_position_competencies_v1',array['uuid','uuid']::text[]),
 ('get_tenant_entity_activity_timeline_v1',array['uuid','text','uuid','integer']::text[])
) f(name,args);

select is((select proargnames from pg_proc where oid='public.get_tenant_people_management_v1(uuid)'::regprocedure),
 array['p_company_id','person_id','full_name','email','phone','birth_date','hire_date','status','has_user_access','manager_id','manager_name','team_id','team_name','position_id','position_name','disc_profile','avatar_url','created_at','updated_at']::text[],'people contract shape is exact');
select is((select proargnames from pg_proc where oid='public.get_tenant_person_profile_v1(uuid,uuid)'::regprocedure),
 array['p_company_id','p_person_id','person_id','full_name','email','phone','birth_date','hire_date','status','has_user_access','manager_id','manager_name','team_id','team_name','position_id','position_name','disc_profile','avatar_url','created_at','updated_at']::text[],'profile contract shape is exact');
select is((select proargnames from pg_proc where oid='public.get_tenant_departments_management_v1(uuid)'::regprocedure),
 array['p_company_id','department_id','name','description','leader_id','parent_department_id','created_at','updated_at']::text[],'department contract shape is exact');
select is((select proargnames from pg_proc where oid='public.get_tenant_teams_management_v1(uuid)'::regprocedure),
 array['p_company_id','team_id','name','description','department_id','parent_team_id','leader_id','created_at','updated_at']::text[],'team contract shape is exact');
select is((select proargnames from pg_proc where oid='public.get_tenant_positions_management_v1(uuid)'::regprocedure),
 array['p_company_id','position_id','name','description','department_id','hierarchical_level','status','weekly_workload_hours','work_model','employment_type','travel_requirement','created_at','updated_at']::text[],'position contract shape is exact');
select is((select proargnames from pg_proc where oid='public.get_tenant_position_requirements_v1(uuid,uuid)'::regprocedure),
 array['p_company_id','p_position_id','requirement_id','position_id','category','value','required','notes','created_at','updated_at']::text[],'requirements contract shape is exact');
select is((select proargnames from pg_proc where oid='public.get_tenant_position_competencies_v1(uuid,uuid)'::regprocedure),
 array['p_company_id','p_position_id','position_competency_id','position_id','competency_id','competency_name','expected_level','weight','required','competency_type','notes','created_at','updated_at']::text[],'competencies contract shape is exact');
select is((select proargnames from pg_proc where oid='public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)'::regprocedure),
 array['p_company_id','p_entity_type','p_entity_id','p_limit','activity_id','activity_type','module','title','description','actor_type','entity_type','entity_id','occurred_at','created_at']::text[],'activity contract shape excludes raw Auth IDs and metadata');

select is((select array_agg(format_type(type_oid,null) order by ordinal) from pg_proc p,
 unnest(p.proallargtypes) with ordinality t(type_oid,ordinal) where p.oid='public.get_tenant_people_management_v1(uuid)'::regprocedure),
 array['uuid','uuid','text','text','text','date','date','text','boolean','uuid','text','uuid','text','uuid','text','text','text','timestamp with time zone','timestamp with time zone']::text[],'people contract types are exact');
select is((select array_agg(format_type(type_oid,null) order by ordinal) from pg_proc p,
 unnest(p.proallargtypes) with ordinality t(type_oid,ordinal) where p.oid='public.get_tenant_person_profile_v1(uuid,uuid)'::regprocedure),
 array['uuid','uuid','uuid','text','text','text','date','date','text','boolean','uuid','text','uuid','text','uuid','text','text','text','timestamp with time zone','timestamp with time zone']::text[],'profile contract types are exact');
select is((select array_agg(format_type(type_oid,null) order by ordinal) from pg_proc p,
 unnest(p.proallargtypes) with ordinality t(type_oid,ordinal) where p.oid='public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)'::regprocedure),
 array['uuid','text','uuid','integer','uuid','text','text','text','text','text','text','uuid','timestamp with time zone','timestamp with time zone']::text[],'activity contract types are exact');

select ok(p.prosecdef and p.provolatile='s' and p.proconfig=array['search_path=public, pg_temp']::text[],
  p.proname||' is stable, SECURITY DEFINER and has a hardened search_path')
from pg_proc p where p.oid in (
 'public.get_tenant_people_management_v1(uuid)'::regprocedure,
 'public.get_tenant_person_profile_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_departments_management_v1(uuid)'::regprocedure,
 'public.get_tenant_teams_management_v1(uuid)'::regprocedure,
 'public.get_tenant_positions_management_v1(uuid)'::regprocedure,
 'public.get_tenant_position_requirements_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_position_competencies_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)'::regprocedure
) order by p.proname;

select ok(has_function_privilege('authenticated',p.oid,'execute'),p.proname||' is executable by authenticated')
from pg_proc p where p.oid in (
 'public.get_tenant_people_management_v1(uuid)'::regprocedure,'public.get_tenant_person_profile_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_departments_management_v1(uuid)'::regprocedure,'public.get_tenant_teams_management_v1(uuid)'::regprocedure,
 'public.get_tenant_positions_management_v1(uuid)'::regprocedure,'public.get_tenant_position_requirements_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_position_competencies_v1(uuid,uuid)'::regprocedure,'public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)'::regprocedure
) order by p.proname;

select ok(not has_function_privilege('anon',p.oid,'execute') and not has_function_privilege('service_role',p.oid,'execute')
  and not has_function_privilege('public',p.oid,'execute'),p.proname||' denies anon, service_role and PUBLIC')
from pg_proc p where p.oid in (
 'public.get_tenant_people_management_v1(uuid)'::regprocedure,'public.get_tenant_person_profile_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_departments_management_v1(uuid)'::regprocedure,'public.get_tenant_teams_management_v1(uuid)'::regprocedure,
 'public.get_tenant_positions_management_v1(uuid)'::regprocedure,'public.get_tenant_position_requirements_v1(uuid,uuid)'::regprocedure,
 'public.get_tenant_position_competencies_v1(uuid,uuid)'::regprocedure,'public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)'::regprocedure
) order by p.proname;

select ok(not has_table_privilege('authenticated','public.'||table_name,'select'),table_name||' SELECT remains closed')
from (values ('people'),('departments'),('teams'),('positions'),('position_requirements'),('position_competencies'),('activity_events')) t(table_name);

insert into auth.users(id,email,email_confirmed_at) values
 ('85000000-0000-4000-8000-000000000001','b-owner@example.com',now()),
 ('85000000-0000-4000-8000-000000000002','b-inactive@example.com',now()),
 ('85000000-0000-4000-8000-000000000003','b-admin@example.com',now()),
 ('85000000-0000-4000-8000-000000000004','b-employee@example.com',now()),
 ('85000000-0000-4000-8000-000000000005','b-none@example.com',now());
insert into public.companies(id,name,slug) values
 ('85000000-0000-4000-8000-000000000101','Boundary Alpha','boundary-alpha'),
 ('85000000-0000-4000-8000-000000000102','Boundary Foreign','boundary-foreign'),
 ('85000000-0000-4000-8000-000000000103','Boundary Empty','boundary-empty');
insert into public.company_members(id,company_id,user_id,role,status) values
 ('85000000-0000-4000-8000-000000000111','85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000001','owner','active'),
 ('85000000-0000-4000-8000-000000000112','85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000002','admin','inactive'),
 ('85000000-0000-4000-8000-000000000113','85000000-0000-4000-8000-000000000103','85000000-0000-4000-8000-000000000001','owner','active'),
 ('85000000-0000-4000-8000-000000000114','85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000003','admin','active'),
 ('85000000-0000-4000-8000-000000000115','85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000004','employee','active');
insert into public.departments(id,company_id,name,description,deleted_at) values
 ('85000000-0000-4000-8000-000000000201','85000000-0000-4000-8000-000000000101','Zulu Department','Description',null),
 ('85000000-0000-4000-8000-000000000202','85000000-0000-4000-8000-000000000101','Alpha Department','Description',null),
 ('85000000-0000-4000-8000-000000000203','85000000-0000-4000-8000-000000000101','Deleted Department','Description',now());
insert into public.teams(id,company_id,name,description,department_id,deleted_at) values
 ('85000000-0000-4000-8000-000000000211','85000000-0000-4000-8000-000000000101','Zulu Team','Description','85000000-0000-4000-8000-000000000201',null),
 ('85000000-0000-4000-8000-000000000212','85000000-0000-4000-8000-000000000101','Alpha Team','Description','85000000-0000-4000-8000-000000000202',null),
 ('85000000-0000-4000-8000-000000000213','85000000-0000-4000-8000-000000000101','Deleted Team','Description',null,now());
insert into public.positions(id,company_id,name,description,department_id,status,deleted_at) values
 ('85000000-0000-4000-8000-000000000221','85000000-0000-4000-8000-000000000101','Zulu Position','Description','85000000-0000-4000-8000-000000000201','active',null),
 ('85000000-0000-4000-8000-000000000222','85000000-0000-4000-8000-000000000101','Alpha Position','Description','85000000-0000-4000-8000-000000000202','active',null),
 ('85000000-0000-4000-8000-000000000223','85000000-0000-4000-8000-000000000101','Deleted Position','Description',null,'active',now());
insert into public.people(id,company_id,user_id,full_name,email,team_id,position_id) values
 ('85000000-0000-4000-8000-000000000231','85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000001','Zulu Person','zulu@example.com','85000000-0000-4000-8000-000000000211','85000000-0000-4000-8000-000000000221'),
 ('85000000-0000-4000-8000-000000000232','85000000-0000-4000-8000-000000000101',null,'Alpha Person','alpha@example.com','85000000-0000-4000-8000-000000000212','85000000-0000-4000-8000-000000000222'),
 ('85000000-0000-4000-8000-000000000233','85000000-0000-4000-8000-000000000101',null,'Terminated Person','terminated@example.com',null,null);
update public.people set status='terminated' where id='85000000-0000-4000-8000-000000000233';
insert into public.competencies(id,company_id,name,category) values
 ('85000000-0000-4000-8000-000000000241','85000000-0000-4000-8000-000000000101','Zulu Competency','technical'),
 ('85000000-0000-4000-8000-000000000242','85000000-0000-4000-8000-000000000101','Alpha Competency','technical'),
 ('85000000-0000-4000-8000-000000000243','85000000-0000-4000-8000-000000000101','Archived Competency','technical');
insert into public.position_requirements(id,company_id,position_id,category,value,created_at,archived_at) values
 ('85000000-0000-4000-8000-000000000251','85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221','knowledge','Second','2024-02-01',null),
 ('85000000-0000-4000-8000-000000000252','85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221','knowledge','First','2024-01-01',null),
 ('85000000-0000-4000-8000-000000000253','85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221','knowledge','Archived','2023-01-01',now());
insert into public.position_competencies(id,company_id,position_id,competency_id,created_at,archived_at) values
 ('85000000-0000-4000-8000-000000000261','85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221','85000000-0000-4000-8000-000000000241','2024-02-01',null),
 ('85000000-0000-4000-8000-000000000262','85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221','85000000-0000-4000-8000-000000000242','2024-01-01',null),
 ('85000000-0000-4000-8000-000000000263','85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221','85000000-0000-4000-8000-000000000243','2023-01-01',now());
insert into public.activity_events(id,company_id,activity_type,module,title,entity_type,entity_id,visibility,occurred_at) values
 ('85000000-0000-4000-8000-000000000271','85000000-0000-4000-8000-000000000101','team.old','organization','Old','team','85000000-0000-4000-8000-000000000211','company','2024-01-01'),
 ('85000000-0000-4000-8000-000000000272','85000000-0000-4000-8000-000000000101','team.new','organization','New','team','85000000-0000-4000-8000-000000000211','company','2024-02-01'),
 ('85000000-0000-4000-8000-000000000273','85000000-0000-4000-8000-000000000101','team.secret','organization','Secret','team','85000000-0000-4000-8000-000000000211','restricted','2024-03-01'),
 ('85000000-0000-4000-8000-000000000274','85000000-0000-4000-8000-000000000101','team.other','organization','Other','team','85000000-0000-4000-8000-000000000212','company','2024-04-01');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"85000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok(call,description) from (values
 ($$select * from public.get_tenant_people_management_v1('85000000-0000-4000-8000-000000000101')$$,'people owner allowed'),
 ($$select * from public.get_tenant_person_profile_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000231')$$,'profile owner allowed'),
 ($$select * from public.get_tenant_departments_management_v1('85000000-0000-4000-8000-000000000101')$$,'departments owner allowed'),
 ($$select * from public.get_tenant_teams_management_v1('85000000-0000-4000-8000-000000000101')$$,'teams owner allowed'),
 ($$select * from public.get_tenant_positions_management_v1('85000000-0000-4000-8000-000000000101')$$,'positions owner allowed'),
 ($$select * from public.get_tenant_position_requirements_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221')$$,'requirements owner allowed'),
 ($$select * from public.get_tenant_position_competencies_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221')$$,'competencies owner allowed'),
 ($$select * from public.get_tenant_entity_activity_timeline_v1('85000000-0000-4000-8000-000000000101','team','85000000-0000-4000-8000-000000000211',20)$$,'activity owner allowed')
) calls(call,description);
select set_config('request.jwt.claims','{"sub":"85000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select lives_ok(call,description) from (values
 ($$select * from public.get_tenant_people_management_v1('85000000-0000-4000-8000-000000000101')$$,'people admin allowed'),
 ($$select * from public.get_tenant_person_profile_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000231')$$,'profile admin allowed'),
 ($$select * from public.get_tenant_departments_management_v1('85000000-0000-4000-8000-000000000101')$$,'departments admin allowed'),
 ($$select * from public.get_tenant_teams_management_v1('85000000-0000-4000-8000-000000000101')$$,'teams admin allowed'),
 ($$select * from public.get_tenant_positions_management_v1('85000000-0000-4000-8000-000000000101')$$,'positions admin allowed'),
 ($$select * from public.get_tenant_position_requirements_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221')$$,'requirements admin allowed'),
 ($$select * from public.get_tenant_position_competencies_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221')$$,'competencies admin allowed'),
 ($$select * from public.get_tenant_entity_activity_timeline_v1('85000000-0000-4000-8000-000000000101','team','85000000-0000-4000-8000-000000000211',20)$$,'activity admin allowed')
) calls(call,description);
select set_config('request.jwt.claims','{"sub":"85000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select lives_ok(call,description) from (values
 ($$select * from public.get_tenant_people_management_v1('85000000-0000-4000-8000-000000000101')$$,'people employee allowed'),
 ($$select * from public.get_tenant_person_profile_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000231')$$,'profile employee allowed'),
 ($$select * from public.get_tenant_departments_management_v1('85000000-0000-4000-8000-000000000101')$$,'departments employee allowed'),
 ($$select * from public.get_tenant_teams_management_v1('85000000-0000-4000-8000-000000000101')$$,'teams employee allowed'),
 ($$select * from public.get_tenant_positions_management_v1('85000000-0000-4000-8000-000000000101')$$,'positions employee allowed'),
 ($$select * from public.get_tenant_position_requirements_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221')$$,'requirements employee allowed'),
 ($$select * from public.get_tenant_position_competencies_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221')$$,'competencies employee allowed'),
 ($$select * from public.get_tenant_entity_activity_timeline_v1('85000000-0000-4000-8000-000000000101','team','85000000-0000-4000-8000-000000000211',20)$$,'activity employee allowed')
) calls(call,description);
select set_config('request.jwt.claims','{"sub":"85000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok(call,'42501','TENANT_AUTHORIZATION_DENIED',description) from (values
 ($$select * from public.get_tenant_people_management_v1('85000000-0000-4000-8000-000000000101')$$,'inactive denied: people'),
 ($$select * from public.get_tenant_person_profile_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000231')$$,'inactive denied: profile'),
 ($$select * from public.get_tenant_departments_management_v1('85000000-0000-4000-8000-000000000101')$$,'inactive denied: departments'),
 ($$select * from public.get_tenant_teams_management_v1('85000000-0000-4000-8000-000000000101')$$,'inactive denied: teams'),
 ($$select * from public.get_tenant_positions_management_v1('85000000-0000-4000-8000-000000000101')$$,'inactive denied: positions'),
 ($$select * from public.get_tenant_position_requirements_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221')$$,'inactive denied: requirements'),
 ($$select * from public.get_tenant_position_competencies_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221')$$,'inactive denied: competencies'),
 ($$select * from public.get_tenant_entity_activity_timeline_v1('85000000-0000-4000-8000-000000000101','team','85000000-0000-4000-8000-000000000211',20)$$,'inactive denied: activity')
) calls(call,description);
select set_config('request.jwt.claims','{"sub":"85000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok(call,'42501','TENANT_AUTHORIZATION_DENIED',description) from (values
 ($$select * from public.get_tenant_people_management_v1('85000000-0000-4000-8000-000000000102')$$,'foreign denied: people'),
 ($$select * from public.get_tenant_person_profile_v1('85000000-0000-4000-8000-000000000102','85000000-0000-4000-8000-000000000231')$$,'foreign denied: profile'),
 ($$select * from public.get_tenant_departments_management_v1('85000000-0000-4000-8000-000000000102')$$,'foreign denied: departments'),
 ($$select * from public.get_tenant_teams_management_v1('85000000-0000-4000-8000-000000000102')$$,'foreign denied: teams'),
 ($$select * from public.get_tenant_positions_management_v1('85000000-0000-4000-8000-000000000102')$$,'foreign denied: positions'),
 ($$select * from public.get_tenant_position_requirements_v1('85000000-0000-4000-8000-000000000102','85000000-0000-4000-8000-000000000221')$$,'foreign denied: requirements'),
 ($$select * from public.get_tenant_position_competencies_v1('85000000-0000-4000-8000-000000000102','85000000-0000-4000-8000-000000000221')$$,'foreign denied: competencies'),
 ($$select * from public.get_tenant_entity_activity_timeline_v1('85000000-0000-4000-8000-000000000102','team','85000000-0000-4000-8000-000000000211',20)$$,'foreign denied: activity')
) calls(call,description);
select set_config('request.jwt.claims','{"sub":"85000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok(call,'42501','TENANT_AUTHORIZATION_DENIED',description) from (values
 ($$select * from public.get_tenant_people_management_v1('85000000-0000-4000-8000-000000000101')$$,'no membership denied: people'),
 ($$select * from public.get_tenant_person_profile_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000231')$$,'no membership denied: profile'),
 ($$select * from public.get_tenant_departments_management_v1('85000000-0000-4000-8000-000000000101')$$,'no membership denied: departments'),
 ($$select * from public.get_tenant_teams_management_v1('85000000-0000-4000-8000-000000000101')$$,'no membership denied: teams'),
 ($$select * from public.get_tenant_positions_management_v1('85000000-0000-4000-8000-000000000101')$$,'no membership denied: positions'),
 ($$select * from public.get_tenant_position_requirements_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221')$$,'no membership denied: requirements'),
 ($$select * from public.get_tenant_position_competencies_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221')$$,'no membership denied: competencies'),
 ($$select * from public.get_tenant_entity_activity_timeline_v1('85000000-0000-4000-8000-000000000101','team','85000000-0000-4000-8000-000000000211',20)$$,'no membership denied: activity')
) calls(call,description);
select set_config('request.jwt.claims','{"sub":"85000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.get_tenant_people_management_v1('85000000-0000-4000-8000-000000000103')),0::bigint,'empty tenant is empty');
select is((select count(*) from public.get_tenant_people_management_v1('85000000-0000-4000-8000-000000000101')),2::bigint,'terminated People is excluded');
select is((select count(*) from public.get_tenant_departments_management_v1('85000000-0000-4000-8000-000000000101')),2::bigint,'deleted department is excluded');
select is((select count(*) from public.get_tenant_teams_management_v1('85000000-0000-4000-8000-000000000101')),2::bigint,'deleted team is excluded');
select is((select count(*) from public.get_tenant_positions_management_v1('85000000-0000-4000-8000-000000000101')),2::bigint,'deleted position is excluded');
select is((select count(*) from public.get_tenant_position_requirements_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221')),2::bigint,'archived requirement is excluded');
select is((select count(*) from public.get_tenant_position_competencies_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221')),2::bigint,'archived competency is excluded');
select is((select count(*) from public.get_tenant_entity_activity_timeline_v1('85000000-0000-4000-8000-000000000101','team','85000000-0000-4000-8000-000000000211',20)),2::bigint,'restricted activity is excluded');
select results_eq($$select full_name,has_user_access from public.get_tenant_people_management_v1('85000000-0000-4000-8000-000000000101')$$,
 $$values ('Alpha Person',false),('Zulu Person',true)$$,'People ordering and semantic access are deterministic');
select results_eq($$select name from public.get_tenant_departments_management_v1('85000000-0000-4000-8000-000000000101')$$,
 $$values ('Alpha Department'),('Zulu Department')$$,'department ordering is deterministic');
select results_eq($$select name from public.get_tenant_teams_management_v1('85000000-0000-4000-8000-000000000101')$$,
 $$values ('Alpha Team'),('Zulu Team')$$,'team ordering is deterministic');
select results_eq($$select name from public.get_tenant_positions_management_v1('85000000-0000-4000-8000-000000000101')$$,
 $$values ('Alpha Position'),('Zulu Position')$$,'position ordering is deterministic');
select results_eq($$select value from public.get_tenant_position_requirements_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221')$$,
 $$values ('First'),('Second')$$,'requirement ordering is deterministic');
select results_eq($$select competency_name from public.get_tenant_position_competencies_v1('85000000-0000-4000-8000-000000000101','85000000-0000-4000-8000-000000000221')$$,
 $$values ('Alpha Competency'),('Zulu Competency')$$,'position competency ordering is deterministic');
select results_eq($$select title from public.get_tenant_entity_activity_timeline_v1('85000000-0000-4000-8000-000000000101','team','85000000-0000-4000-8000-000000000211',20)$$,
 $$values ('New'),('Old')$$,'entity activity ordering is deterministic and restricted rows stay hidden');
select is((select count(*) from public.get_tenant_entity_activity_timeline_v1('85000000-0000-4000-8000-000000000101','team','85000000-0000-4000-8000-000000000299',20)),0::bigint,'foreign entity selector returns no rows');
select ok(array_position((select proargnames from pg_proc where oid='public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)'::regprocedure),'actor_id') is null
  and array_position((select proargnames from pg_proc where oid='public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)'::regprocedure),'metadata') is null,'activity contract excludes actor_id and raw metadata');
select ok(array_position((select proargnames from pg_proc where oid='public.get_tenant_people_management_v1(uuid)'::regprocedure),'has_user_access') is not null
  and array_position((select proargnames from pg_proc where oid='public.get_tenant_people_management_v1(uuid)'::regprocedure),'user_id') is null,'semantic access flag replaces Auth identity');
select throws_ok($$select * from public.get_tenant_entity_activity_timeline_v1('85000000-0000-4000-8000-000000000101','invalid','85000000-0000-4000-8000-000000000211',20)$$,'22023','ACTIVITY_ENTITY_TYPE_INVALID','entity type is closed');
select throws_ok($$select * from public.get_tenant_entity_activity_timeline_v1('85000000-0000-4000-8000-000000000101','team','85000000-0000-4000-8000-000000000211',101)$$,'22023','ACTIVITY_LIMIT_OUT_OF_RANGE','limit is bounded');
reset role;
select * from finish();
rollback;
