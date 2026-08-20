begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Schema / security.
-- ---------------------------------------------------------------------------
select has_function('public','create_tenant_person_v2',
  array['uuid','text','text','text','date','date','text','uuid','uuid','uuid','text','text','uuid'],
  'create_tenant_person_v2 exists with the explicit-profile signature');
select has_function('public','update_tenant_person_v2',
  array['uuid','uuid','text','text','text','date','date','text','uuid','uuid','uuid','text','uuid'],
  'update_tenant_person_v2 exists with the explicit-profile signature');
select has_function('public','get_tenant_people_management_v3',array['uuid'],'people management read v3 exists');
select has_function('public','get_tenant_person_profile_v3',array['uuid','uuid'],'person profile read v3 exists');
select ok(has_function_privilege('authenticated',
  'public.create_tenant_person_v2(uuid,text,text,text,date,date,text,uuid,uuid,uuid,text,text,uuid)','execute'),
  'authenticated may execute create v2');
select ok(has_function_privilege('authenticated',
  'public.update_tenant_person_v2(uuid,uuid,text,text,text,date,date,text,uuid,uuid,uuid,text,uuid)','execute'),
  'authenticated may execute update v2');
select ok(has_function_privilege('authenticated','public.get_tenant_people_management_v3(uuid)','execute'),
  'authenticated may execute read v3');
select ok(not has_table_privilege('authenticated','public.people','insert'),'people insert stays closed (no new grant)');
select ok(not has_table_privilege('authenticated','public.people','update'),'people update stays closed (no new grant)');
select ok(exists(select 1 from pg_trigger where tgname='people_position_seniority_coherence_trigger'),
  'coherence trigger exists on people');

-- ---------------------------------------------------------------------------
-- Fixtures.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a4000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('a4000000-0000-4000-8000-000000000005','employee-a@example.com'),
  ('a4000000-0000-4000-8000-000000000008','owner-b@example.com');
insert into public.companies (id, name, slug) values
  ('a4000000-0000-4000-8000-000000000101','SB Alpha','sb-alpha'),
  ('a4000000-0000-4000-8000-000000000102','SB Beta','sb-beta');
insert into public.company_members (id, company_id, user_id, role, status) values
  ('a4000000-0000-4000-8000-000000000111','a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000001','owner','active'),
  ('a4000000-0000-4000-8000-000000000115','a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000005','employee','active'),
  ('a4000000-0000-4000-8000-000000000118','a4000000-0000-4000-8000-000000000102','a4000000-0000-4000-8000-000000000008','owner','active');
insert into public.positions (id, company_id, name) values
  ('a4000000-0000-4000-8000-000000000301','a4000000-0000-4000-8000-000000000101','Analista'),
  ('a4000000-0000-4000-8000-000000000304','a4000000-0000-4000-8000-000000000101','Especialista'),
  ('a4000000-0000-4000-8000-000000000302','a4000000-0000-4000-8000-000000000102','Beta Cargo');
insert into public.seniority_levels (id, company_id, code, label, rank, active) values
  ('a4000000-0000-4000-8000-000000000201','a4000000-0000-4000-8000-000000000101','PL','Pleno',20,true),
  ('a4000000-0000-4000-8000-000000000202','a4000000-0000-4000-8000-000000000101','OLD','Arquivada',5,false),
  ('a4000000-0000-4000-8000-000000000208','a4000000-0000-4000-8000-000000000102','PL','Pleno',20,true);
insert into public.position_seniority_profiles (id, company_id, position_id, seniority_level_id, active) values
  ('a4000000-0000-4000-8000-000000000401','a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000301',null,true),
  ('a4000000-0000-4000-8000-000000000404','a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000304',null,true),
  ('a4000000-0000-4000-8000-000000000402','a4000000-0000-4000-8000-000000000102','a4000000-0000-4000-8000-000000000302',null,true),
  ('a4000000-0000-4000-8000-000000000411','a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000301','a4000000-0000-4000-8000-000000000201',true),
  ('a4000000-0000-4000-8000-000000000412','a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000301','a4000000-0000-4000-8000-000000000202',true),
  ('a4000000-0000-4000-8000-000000000413','a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000301','a4000000-0000-4000-8000-000000000201',false),
  ('a4000000-0000-4000-8000-000000000421','a4000000-0000-4000-8000-000000000102','a4000000-0000-4000-8000-000000000302','a4000000-0000-4000-8000-000000000208',true);
-- People (direct inserts; coherence trigger must accept these coherent pairs,
-- including a historical archived profile 413).
insert into public.people (id, company_id, full_name, status, position_id, position_seniority_profile_id) values
  ('a4000000-0000-4000-8000-000000000501','a4000000-0000-4000-8000-000000000101','Pessoa Pleno','active','a4000000-0000-4000-8000-000000000301','a4000000-0000-4000-8000-000000000411'),
  ('a4000000-0000-4000-8000-000000000502','a4000000-0000-4000-8000-000000000101','Pessoa Base','active','a4000000-0000-4000-8000-000000000301','a4000000-0000-4000-8000-000000000401'),
  ('a4000000-0000-4000-8000-000000000503','a4000000-0000-4000-8000-000000000101','Pessoa Historica','active','a4000000-0000-4000-8000-000000000301','a4000000-0000-4000-8000-000000000413'),
  ('a4000000-0000-4000-8000-000000000511','a4000000-0000-4000-8000-000000000101','Pessoa Update','active','a4000000-0000-4000-8000-000000000301','a4000000-0000-4000-8000-000000000401');

create temporary table t_ids(name text, id uuid) on commit drop;
grant select, insert on t_ids to authenticated;

-- ---------------------------------------------------------------------------
-- Coherence trigger (structural, direct DML in the setup role).
-- ---------------------------------------------------------------------------
select ok(exists(select 1 from public.people where id='a4000000-0000-4000-8000-000000000503'
   and position_seniority_profile_id='a4000000-0000-4000-8000-000000000413'),
  'a coherent historical archived pair is a valid stored reference');
select throws_ok($$update public.people set position_seniority_profile_id='a4000000-0000-4000-8000-000000000404'
   where id='a4000000-0000-4000-8000-000000000502'$$,
  '23514','POSITION_SENIORITY_PROFILE_INCOHERENT','a direct incoherent profile (other position) is rejected');
select throws_ok($$update public.people set position_id=null
   where id='a4000000-0000-4000-8000-000000000502'$$,
  '23514','POSITION_SENIORITY_PROFILE_INCOHERENT','a direct position clear leaving a profile is rejected');
select is((select position_seniority_profile_id from public.people where id='a4000000-0000-4000-8000-000000000502'),
  'a4000000-0000-4000-8000-000000000401','the row is unchanged after the rejected direct writes');

-- ---------------------------------------------------------------------------
-- create_tenant_person_v2 as the Alpha owner.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a4000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- Base default: position + NULL profile -> active base.
insert into t_ids values ('c1',
  ((public.create_tenant_person_v2('a4000000-0000-4000-8000-000000000101','Base Novo',null,null,null,null,'active',
    null,'a4000000-0000-4000-8000-000000000301',null,null,'cr-1',null)) ->> 'personId')::uuid);
-- Both NULL -> both NULL.
insert into t_ids values ('c2',
  ((public.create_tenant_person_v2('a4000000-0000-4000-8000-000000000101','Sem Cargo',null,null,null,null,'active',
    null,null,null,null,'cr-2',null)) ->> 'personId')::uuid);
-- Explicit specific profile with matching position.
insert into t_ids values ('c3',
  ((public.create_tenant_person_v2('a4000000-0000-4000-8000-000000000101','Pleno Explicito',null,null,null,null,'active',
    null,'a4000000-0000-4000-8000-000000000301',null,null,'cr-3',
    'a4000000-0000-4000-8000-000000000411')) ->> 'personId')::uuid);
-- Explicit profile with NULL position: profile is authoritative, derives position.
insert into t_ids values ('c4',
  ((public.create_tenant_person_v2('a4000000-0000-4000-8000-000000000101','Profile Autoritativo',null,null,null,null,'active',
    null,null,null,null,'cr-4','a4000000-0000-4000-8000-000000000411')) ->> 'personId')::uuid);

-- Idempotent retry (same key + same profile intent) converges.
select is((public.create_tenant_person_v2('a4000000-0000-4000-8000-000000000101','Base Novo',null,null,null,null,'active',
    null,'a4000000-0000-4000-8000-000000000301',null,null,'cr-1',null)) ->> 'status',
  'idempotent_retry','same create intent + key converges');
-- Same key + changed profile intent is NOT absorbed.
select throws_ok($$select public.create_tenant_person_v2('a4000000-0000-4000-8000-000000000101','Base Novo',null,null,null,null,'active',
    null,'a4000000-0000-4000-8000-000000000301',null,null,'cr-1','a4000000-0000-4000-8000-000000000411')$$,
  '23505','IDEMPOTENCY_CONFLICT','a changed profile under the same key is a conflict');

-- Mismatch: position 304 + profile of position 301 -> hard error.
select throws_ok($$select public.create_tenant_person_v2('a4000000-0000-4000-8000-000000000101','Mismatch',null,null,null,null,'active',
    null,'a4000000-0000-4000-8000-000000000304',null,null,'cr-m','a4000000-0000-4000-8000-000000000411')$$,
  '23514','POSITION_SENIORITY_PROFILE_POSITION_MISMATCH','position must agree with the explicit profile');
-- Cross-tenant profile -> not found (no tenant leak).
select throws_ok($$select public.create_tenant_person_v2('a4000000-0000-4000-8000-000000000101','Foreign',null,null,null,null,'active',
    null,null,null,null,'cr-f','a4000000-0000-4000-8000-000000000421')$$,
  'P0002','POSITION_SENIORITY_PROFILE_NOT_FOUND','a cross-tenant profile is not found');
-- Archived profile -> rejected for NEW assignment.
select throws_ok($$select public.create_tenant_person_v2('a4000000-0000-4000-8000-000000000101','Arquivado',null,null,null,null,'active',
    null,'a4000000-0000-4000-8000-000000000301',null,null,'cr-a','a4000000-0000-4000-8000-000000000413')$$,
  '22023','POSITION_SENIORITY_PROFILE_ARCHIVED','an archived profile is not newly assignable');
-- Specific profile whose seniority is globally archived -> rejected.
select throws_ok($$select public.create_tenant_person_v2('a4000000-0000-4000-8000-000000000101','Sen Arquivada',null,null,null,null,'active',
    null,'a4000000-0000-4000-8000-000000000301',null,null,'cr-s','a4000000-0000-4000-8000-000000000412')$$,
  '22023','SENIORITY_LEVEL_ARCHIVED','a profile whose seniority is archived is not newly assignable');

-- v1 still works (compatibility): position -> base.
insert into t_ids values ('c5',
  ((public.create_tenant_person_v1('a4000000-0000-4000-8000-000000000101','V1 Base',null,null,null,null,'active',
    null,'a4000000-0000-4000-8000-000000000301',null,null,'cr-5')) ->> 'personId')::uuid);

-- Employee cannot mutate.
select set_config('request.jwt.claims','{"sub":"a4000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select public.create_tenant_person_v2('a4000000-0000-4000-8000-000000000101','Denied',null,null,null,null,'active',
    null,'a4000000-0000-4000-8000-000000000301',null,null,'cr-d',null)$$,
  '42501','TENANT_AUTHORIZATION_DENIED','an employee cannot create via v2');

-- ---------------------------------------------------------------------------
-- update_tenant_person_v2 as the Alpha owner (target person 511).
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims','{"sub":"a4000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
-- Move position 301 -> 304 with NULL profile -> new base 404.
select is((public.update_tenant_person_v2('a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000511',
    'Pessoa Update',null,null,null,null,'active',null,'a4000000-0000-4000-8000-000000000304',null,null,null)) ->> 'status',
  'succeeded','update moves position and resolves the new base');
-- Assign explicit specific 411 (needs matching position 301).
select is((public.update_tenant_person_v2('a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000511',
    'Pessoa Update',null,null,null,null,'active',null,'a4000000-0000-4000-8000-000000000301',null,null,
    'a4000000-0000-4000-8000-000000000411')) ->> 'status',
  'succeeded','update assigns an explicit specific profile');
-- Clear position -> profile NULL.
select is((public.update_tenant_person_v2('a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000511',
    'Pessoa Update',null,null,null,null,'active',null,null,null,null,null)) ->> 'status',
  'succeeded','update clears position and profile together');
-- Mismatch on update -> error; row unchanged.
select throws_ok($$select public.update_tenant_person_v2('a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000511',
    'Pessoa Update',null,null,null,null,'active',null,'a4000000-0000-4000-8000-000000000304',null,null,
    'a4000000-0000-4000-8000-000000000411')$$,
  '23514','POSITION_SENIORITY_PROFILE_POSITION_MISMATCH','update rejects an incoherent pair');
-- Cross-tenant profile on update -> not found.
select throws_ok($$select public.update_tenant_person_v2('a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000511',
    'Pessoa Update',null,null,null,null,'active',null,null,null,null,'a4000000-0000-4000-8000-000000000421')$$,
  'P0002','POSITION_SENIORITY_PROFILE_NOT_FOUND','update rejects a cross-tenant profile');

-- ---------------------------------------------------------------------------
-- Read v3 (still authenticated Alpha owner is a member).
-- ---------------------------------------------------------------------------
select is((select seniority_label from public.get_tenant_person_profile_v3(
    'a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000501') limit 1),
  'Pleno','v3 resolves the current specific seniority label');
select is((select seniority_level_id from public.get_tenant_person_profile_v3(
    'a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000502') limit 1),
  null,'v3 leaves seniority NULL for a base assignment (no invented seniority)');
select is((select position_name from public.get_tenant_person_profile_v3(
    'a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000502') limit 1),
  'Analista','v3 preserves the v2 position field');
select is((select seniority_label from public.get_tenant_person_profile_v3(
    'a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000503') limit 1),
  'Pleno','v3 resolves a historical archived assignment label');
select is((select count(*)::int from public.get_tenant_people_management_v3('a4000000-0000-4000-8000-000000000101')),
  9,'v3 lists every Alpha person (fixtures + created)');
reset role;

-- ---------------------------------------------------------------------------
-- Coherence, activity, data-safety (setup role).
-- ---------------------------------------------------------------------------
-- create coherence.
select is((select position_seniority_profile_id from public.people where id=(select id from t_ids where name='c1')),
  'a4000000-0000-4000-8000-000000000401','base create persisted the base profile');
select is((select position_seniority_profile_id from public.people where id=(select id from t_ids where name='c2')),
  null,'both-NULL create persisted NULL');
select is((select position_seniority_profile_id from public.people where id=(select id from t_ids where name='c3')),
  'a4000000-0000-4000-8000-000000000411','explicit create persisted the specific profile');
select is((select position_id from public.people where id=(select id from t_ids where name='c4')),
  'a4000000-0000-4000-8000-000000000301','profile-authoritative create derived the position');
select is((select position_seniority_profile_id from public.people where id=(select id from t_ids where name='c4')),
  'a4000000-0000-4000-8000-000000000411','profile-authoritative create persisted the profile');
-- update final state: 511 cleared.
select is((select position_id from public.people where id='a4000000-0000-4000-8000-000000000511'),
  null,'update left the person with no position');
select is((select position_seniority_profile_id from public.people where id='a4000000-0000-4000-8000-000000000511'),
  null,'update left the person with no profile');
-- Global profile<->position invariant across Alpha.
select is((select count(*)::int from public.people p
   join public.position_seniority_profiles pr on pr.id=p.position_seniority_profile_id
   where p.company_id='a4000000-0000-4000-8000-000000000101'
     and (pr.position_id <> p.position_id or pr.company_id <> p.company_id)),
  0,'every assigned profile is coherent with its person position and tenant');

-- Activity: creates and updates emitted exactly once each; failures/trigger none.
select is((select count(*)::int from public.activity_events
   where company_id='a4000000-0000-4000-8000-000000000101' and activity_type='employee.created'),
  5,'five successful creates recorded (four v2 + one v1); failures emitted none');
select is((select count(*)::int from public.activity_events
   where company_id='a4000000-0000-4000-8000-000000000101' and activity_type='employee.updated'),
  3,'three successful updates recorded; failed updates and trigger emitted none');
select is((select metadata->>'positionSeniorityProfileId' from public.activity_events
   where company_id='a4000000-0000-4000-8000-000000000101' and activity_type='employee.updated'
     and metadata->>'previousPositionSeniorityProfileId'='a4000000-0000-4000-8000-000000000401'
   order by created_at limit 1),
  'a4000000-0000-4000-8000-000000000404','update activity records previous and new profile metadata');
select is((select count(*)::int from public.activity_events
   where company_id='a4000000-0000-4000-8000-000000000101'
     and activity_type like 'position_seniority_profile%'),
  0,'no seniority-profile Activity from assignment or trigger');

-- Data safety.
select is((select count(*)::int from public.people where company_id='a4000000-0000-4000-8000-000000000101'),
  9,'people count is fixtures plus only the successful creates');

select * from finish();
rollback;
