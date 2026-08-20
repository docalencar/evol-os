begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Schema / security (unchanged surface).
-- ---------------------------------------------------------------------------
select has_function('public','update_tenant_person_v2',
  array['uuid','uuid','text','text','text','date','date','text','uuid','uuid','uuid','text','uuid'],
  'update_tenant_person_v2 keeps its signature');
select ok(has_function_privilege('authenticated',
  'public.update_tenant_person_v2(uuid,uuid,text,text,text,date,date,text,uuid,uuid,uuid,text,uuid)','execute'),
  'authenticated may execute update v2');
select ok(not has_table_privilege('authenticated','public.people','update'),'people update stays closed (no new grant)');
select ok(exists(select 1 from pg_trigger where tgname='people_position_seniority_coherence_trigger'),
  'coherence trigger still present');

-- ---------------------------------------------------------------------------
-- Fixtures.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a5000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('a5000000-0000-4000-8000-000000000005','employee-a@example.com');
insert into public.companies (id, name, slug) values
  ('a5000000-0000-4000-8000-000000000101','HR Alpha','hr-alpha');
insert into public.company_members (id, company_id, user_id, role, status) values
  ('a5000000-0000-4000-8000-000000000111','a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000001','owner','active'),
  ('a5000000-0000-4000-8000-000000000115','a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000005','employee','active');
insert into public.positions (id, company_id, name) values
  ('a5000000-0000-4000-8000-000000000301','a5000000-0000-4000-8000-000000000101','Analista'),
  ('a5000000-0000-4000-8000-000000000304','a5000000-0000-4000-8000-000000000101','Gerente');
insert into public.seniority_levels (id, company_id, code, label, rank, active) values
  ('a5000000-0000-4000-8000-000000000201','a5000000-0000-4000-8000-000000000101','PL','Pleno',20,true),
  ('a5000000-0000-4000-8000-000000000202','a5000000-0000-4000-8000-000000000101','OB','Obsoleta',5,true),
  ('a5000000-0000-4000-8000-000000000203','a5000000-0000-4000-8000-000000000101','SR','Senior',30,true);
insert into public.position_seniority_profiles (id, company_id, position_id, seniority_level_id, active) values
  ('a5000000-0000-4000-8000-000000000401','a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000301',null,true),
  ('a5000000-0000-4000-8000-000000000404','a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000304',null,true),
  ('a5000000-0000-4000-8000-000000000411','a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000301','a5000000-0000-4000-8000-000000000201',true),
  ('a5000000-0000-4000-8000-000000000412','a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000301','a5000000-0000-4000-8000-000000000202',true),
  ('a5000000-0000-4000-8000-000000000413','a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000301','a5000000-0000-4000-8000-000000000203',true);
insert into public.people (id, company_id, full_name, status, position_id, position_seniority_profile_id) values
  ('a5000000-0000-4000-8000-000000000601','a5000000-0000-4000-8000-000000000101','P Um','active','a5000000-0000-4000-8000-000000000301','a5000000-0000-4000-8000-000000000411'),
  ('a5000000-0000-4000-8000-000000000602','a5000000-0000-4000-8000-000000000101','P Dois','active','a5000000-0000-4000-8000-000000000301','a5000000-0000-4000-8000-000000000412'),
  ('a5000000-0000-4000-8000-000000000603','a5000000-0000-4000-8000-000000000101','P Tres','active','a5000000-0000-4000-8000-000000000301','a5000000-0000-4000-8000-000000000401'),
  ('a5000000-0000-4000-8000-000000000604','a5000000-0000-4000-8000-000000000101','P Quatro','active','a5000000-0000-4000-8000-000000000301','a5000000-0000-4000-8000-000000000411'),
  ('a5000000-0000-4000-8000-000000000605','a5000000-0000-4000-8000-000000000101','P Cinco','active','a5000000-0000-4000-8000-000000000301','a5000000-0000-4000-8000-000000000411'),
  ('a5000000-0000-4000-8000-000000000606','a5000000-0000-4000-8000-000000000101','P Seis','active','a5000000-0000-4000-8000-000000000301','a5000000-0000-4000-8000-000000000411'),
  ('a5000000-0000-4000-8000-000000000611','a5000000-0000-4000-8000-000000000101','P Onze','active','a5000000-0000-4000-8000-000000000301','a5000000-0000-4000-8000-000000000401');

-- Archive profile 411 (its people become historical) and seniority 202.
update public.position_seniority_profiles set active = false
  where id = 'a5000000-0000-4000-8000-000000000411';
update public.seniority_levels set active = false
  where id = 'a5000000-0000-4000-8000-000000000202';

-- Trigger (K): a direct incoherent update is still rejected. Runs in the setup
-- role: it is direct DML on people (which authenticated has no privilege for) and
-- must reach the coherence trigger.
select throws_ok($$update public.people set position_seniority_profile_id='a5000000-0000-4000-8000-000000000404'
   where id='a5000000-0000-4000-8000-000000000601'$$,
  '23514','POSITION_SENIORITY_PROFILE_INCOHERENT','the coherence trigger still rejects an incoherent relationship');

-- ---------------------------------------------------------------------------
-- Authenticated Alpha owner (an active company member) for the gated v3 reads
-- and the boundary mutations.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a5000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- Read v3 (J): historical labels resolve after archive.
select is((select seniority_label from public.get_tenant_person_profile_v3(
    'a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000601') limit 1),
  'Pleno','v3 resolves a historical archived-profile label');
select is((select seniority_label from public.get_tenant_person_profile_v3(
    'a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000602') limit 1),
  'Obsoleta','v3 resolves a label whose seniority level is archived');

-- B. Unrelated field change preserves the historical archived profile.
select is((public.update_tenant_person_v2('a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000601',
    'Nome Alterado',null,null,null,null,'active',null,'a5000000-0000-4000-8000-000000000301',null,null,
    'a5000000-0000-4000-8000-000000000411')) ->> 'status',
  'succeeded','an unrelated edit succeeds while preserving the archived profile');

-- C. Same, where the seniority level (not the profile) is archived.
select is((public.update_tenant_person_v2('a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000602',
    'Dois Alterado',null,null,null,null,'active',null,'a5000000-0000-4000-8000-000000000301',null,null,
    'a5000000-0000-4000-8000-000000000412')) ->> 'status',
  'succeeded','an unrelated edit preserves a profile whose seniority is archived');

-- D. NEW assignment to an archived profile is still rejected.
select throws_ok($$select public.update_tenant_person_v2('a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000603',
    'Tres',null,null,null,null,'active',null,'a5000000-0000-4000-8000-000000000301',null,null,'a5000000-0000-4000-8000-000000000411')$$,
  '22023','POSITION_SENIORITY_PROFILE_ARCHIVED','a new assignment to an archived profile still fails');

-- E. NEW assignment to a profile with an archived seniority is still rejected.
select throws_ok($$select public.update_tenant_person_v2('a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000603',
    'Tres',null,null,null,null,'active',null,'a5000000-0000-4000-8000-000000000301',null,null,'a5000000-0000-4000-8000-000000000412')$$,
  '22023','SENIORITY_LEVEL_ARCHIVED','a new assignment to an archived seniority still fails');

-- F. Preserved profile cannot follow the person to a different Position.
select throws_ok($$select public.update_tenant_person_v2('a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000604',
    'Quatro',null,null,null,null,'active',null,'a5000000-0000-4000-8000-000000000304',null,null,'a5000000-0000-4000-8000-000000000411')$$,
  '23514','POSITION_SENIORITY_PROFILE_POSITION_MISMATCH','the archived profile cannot move to another position');

-- G. Position change with NULL profile resolves the new Position base (no carry).
select is((public.update_tenant_person_v2('a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000605',
    'Cinco',null,null,null,null,'active',null,'a5000000-0000-4000-8000-000000000304',null,null,null)) ->> 'status',
  'succeeded','a position change to base succeeds for a historically-assigned person');

-- H. Explicit change from archived historical to an active specific profile.
select is((public.update_tenant_person_v2('a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000606',
    'Seis',null,null,null,null,'active',null,'a5000000-0000-4000-8000-000000000301',null,null,
    'a5000000-0000-4000-8000-000000000413')) ->> 'status',
  'succeeded','a deliberate change to an active specific profile succeeds');

-- L. Regressions: create v2 to an archived profile is still rejected; a normal
-- active update still works.
select throws_ok($$select public.create_tenant_person_v2('a5000000-0000-4000-8000-000000000101','Arch Create',null,null,null,null,'active',
    null,'a5000000-0000-4000-8000-000000000301',null,null,'k-arch','a5000000-0000-4000-8000-000000000411')$$,
  '22023','POSITION_SENIORITY_PROFILE_ARCHIVED','create v2 still rejects an archived profile (no historical tolerance on create)');
select is((public.update_tenant_person_v2('a5000000-0000-4000-8000-000000000101','a5000000-0000-4000-8000-000000000611',
    'Onze',null,null,null,null,'active',null,'a5000000-0000-4000-8000-000000000301',null,null,
    'a5000000-0000-4000-8000-000000000413')) ->> 'status',
  'succeeded','a normal update to an active specific profile still works');
reset role;

-- ---------------------------------------------------------------------------
-- Coherence / preservation / activity assertions (setup role).
-- ---------------------------------------------------------------------------
-- B preserved: archived profile kept, position kept, name changed, no base conversion.
select is((select position_seniority_profile_id from public.people where id='a5000000-0000-4000-8000-000000000601'),
  'a5000000-0000-4000-8000-000000000411','B: the archived profile is preserved (not converted to base)');
select is((select position_id from public.people where id='a5000000-0000-4000-8000-000000000601'),
  'a5000000-0000-4000-8000-000000000301','B: the position is preserved');
select is((select full_name from public.people where id='a5000000-0000-4000-8000-000000000601'),
  'Nome Alterado','B: the unrelated field change was applied');
-- C preserved.
select is((select position_seniority_profile_id from public.people where id='a5000000-0000-4000-8000-000000000602'),
  'a5000000-0000-4000-8000-000000000412','C: the archived-seniority profile is preserved');
-- D/E left the row unchanged (still base).
select is((select position_seniority_profile_id from public.people where id='a5000000-0000-4000-8000-000000000603'),
  'a5000000-0000-4000-8000-000000000401','D/E: the rejected new assignments left the row unchanged');
-- F left the row unchanged (still archived 411, position 301).
select is((select position_seniority_profile_id from public.people where id='a5000000-0000-4000-8000-000000000604'),
  'a5000000-0000-4000-8000-000000000411','F: the mismatch left the profile unchanged');
select is((select position_id from public.people where id='a5000000-0000-4000-8000-000000000604'),
  'a5000000-0000-4000-8000-000000000301','F: the mismatch left the position unchanged');
-- G resolved the new position base; archived profile not carried.
select is((select position_id from public.people where id='a5000000-0000-4000-8000-000000000605'),
  'a5000000-0000-4000-8000-000000000304','G: the position moved');
select is((select position_seniority_profile_id from public.people where id='a5000000-0000-4000-8000-000000000605'),
  'a5000000-0000-4000-8000-000000000404','G: the new position base was resolved (archived profile not carried)');
-- H changed to the active specific profile.
select is((select position_seniority_profile_id from public.people where id='a5000000-0000-4000-8000-000000000606'),
  'a5000000-0000-4000-8000-000000000413','H: the deliberate change persisted the active specific profile');

-- I. Activity: one employee.updated per successful update; the preserving edit
-- records equal previous/new profile; failed updates and create emit none.
select is((select count(*)::int from public.activity_events
   where company_id='a5000000-0000-4000-8000-000000000101' and activity_type='employee.updated'),
  5,'exactly five successful updates recorded (B, C, G, H, L-update)');
select is((select count(*)::int from public.activity_events
   where company_id='a5000000-0000-4000-8000-000000000101' and activity_type='employee.created'),
  0,'no create succeeded (the archived create was rejected)');
select is((select (metadata->>'positionSeniorityProfileId' = metadata->>'previousPositionSeniorityProfileId')
   from public.activity_events
   where company_id='a5000000-0000-4000-8000-000000000101' and activity_type='employee.updated'
     and metadata->>'employeeId'='a5000000-0000-4000-8000-000000000601' limit 1),
  true,'B: the preserving update records equal previous/new profile metadata');

-- Global invariant: every assigned profile is coherent with its person position.
select is((select count(*)::int from public.people p
   join public.position_seniority_profiles pr on pr.id=p.position_seniority_profile_id
   where p.company_id='a5000000-0000-4000-8000-000000000101'
     and (pr.position_id <> p.position_id or pr.company_id <> p.company_id)),
  0,'no person references a profile incoherent with its position/tenant');

select * from finish();
rollback;
