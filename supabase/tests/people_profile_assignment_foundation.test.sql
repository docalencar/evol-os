begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Schema.
-- ---------------------------------------------------------------------------
select has_column('public','people','position_seniority_profile_id','column exists');
select col_type_is('public','people','position_seniority_profile_id','uuid','column is uuid');
select col_is_null('public','people','position_seniority_profile_id','column is nullable');
select ok(exists(select 1 from pg_constraint where conname='people_position_seniority_profile_company_fkey'),
  'tenant-safe composite FK to position_seniority_profiles(id, company_id) exists');
select has_index('public','people','people_position_seniority_profile_id_idx','index exists');
select ok(not has_table_privilege('authenticated','public.people','insert'),'people insert stays closed');
select ok(not has_table_privilege('authenticated','public.people','update'),'people update stays closed');

-- ---------------------------------------------------------------------------
-- Fixtures: Alpha (owner/employee), Beta. Positions with base profiles; pA3 has
-- NO base profile. People pre-created directly for the backfill test.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a3000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('a3000000-0000-4000-8000-000000000005','employee-a@example.com'),
  ('a3000000-0000-4000-8000-000000000008','owner-b@example.com');
insert into public.companies (id, name, slug) values
  ('a3000000-0000-4000-8000-000000000101','PA Alpha','pa-alpha'),
  ('a3000000-0000-4000-8000-000000000102','PA Beta','pa-beta');
insert into public.company_members (id, company_id, user_id, role, status) values
  ('a3000000-0000-4000-8000-000000000111','a3000000-0000-4000-8000-000000000101','a3000000-0000-4000-8000-000000000001','owner','active'),
  ('a3000000-0000-4000-8000-000000000115','a3000000-0000-4000-8000-000000000101','a3000000-0000-4000-8000-000000000005','employee','active'),
  ('a3000000-0000-4000-8000-000000000118','a3000000-0000-4000-8000-000000000102','a3000000-0000-4000-8000-000000000008','owner','active');
insert into public.positions (id, company_id, name) values
  ('a3000000-0000-4000-8000-000000000301','a3000000-0000-4000-8000-000000000101','Analista'),
  ('a3000000-0000-4000-8000-000000000304','a3000000-0000-4000-8000-000000000101','Especialista'),
  ('a3000000-0000-4000-8000-000000000303','a3000000-0000-4000-8000-000000000101','Sem Base'),
  ('a3000000-0000-4000-8000-000000000302','a3000000-0000-4000-8000-000000000102','Beta Cargo');
-- Base profiles (as 0102 would have backfilled). pA3 (303) intentionally has none.
insert into public.position_seniority_profiles (id, company_id, position_id, seniority_level_id, active) values
  ('a3000000-0000-4000-8000-000000000401','a3000000-0000-4000-8000-000000000101','a3000000-0000-4000-8000-000000000301',null,true),
  ('a3000000-0000-4000-8000-000000000404','a3000000-0000-4000-8000-000000000101','a3000000-0000-4000-8000-000000000304',null,true),
  ('a3000000-0000-4000-8000-000000000402','a3000000-0000-4000-8000-000000000102','a3000000-0000-4000-8000-000000000302',null,true);
insert into public.people (id, company_id, full_name, status, position_id) values
  ('a3000000-0000-4000-8000-000000000501','a3000000-0000-4000-8000-000000000101','Pessoa Com Cargo','active','a3000000-0000-4000-8000-000000000301'),
  ('a3000000-0000-4000-8000-000000000502','a3000000-0000-4000-8000-000000000101','Pessoa Sem Cargo','active',null),
  ('a3000000-0000-4000-8000-000000000503','a3000000-0000-4000-8000-000000000101','Pessoa Cargo Sem Base','active','a3000000-0000-4000-8000-000000000303'),
  ('a3000000-0000-4000-8000-000000000508','a3000000-0000-4000-8000-000000000102','Pessoa Beta','active','a3000000-0000-4000-8000-000000000302');

-- ---------------------------------------------------------------------------
-- Backfill (re-run the 0103 statement) — deterministic, idempotent, zero-loss.
-- ---------------------------------------------------------------------------
update public.people p
  set position_seniority_profile_id = pr.id
from public.position_seniority_profiles pr
where p.position_id is not null
  and p.position_seniority_profile_id is null
  and pr.company_id = p.company_id
  and pr.position_id = p.position_id
  and pr.seniority_level_id is null
  and pr.active;

select is((select position_seniority_profile_id from public.people where id='a3000000-0000-4000-8000-000000000501'),
  'a3000000-0000-4000-8000-000000000401','a person on a position is backfilled to that position base profile');
select is((select position_seniority_profile_id from public.people where id='a3000000-0000-4000-8000-000000000502'),
  null,'a person with no position stays NULL');
select is((select position_seniority_profile_id from public.people where id='a3000000-0000-4000-8000-000000000503'),
  null,'a person whose position has no base profile stays NULL (no data invented)');
select is((select position_seniority_profile_id from public.people where id='a3000000-0000-4000-8000-000000000508'),
  'a3000000-0000-4000-8000-000000000402','a Beta person maps to its own tenant base profile');
select is((select position_id from public.people where id='a3000000-0000-4000-8000-000000000501'),
  'a3000000-0000-4000-8000-000000000301','position_id is preserved by the backfill');
select is((select count(*)::int from public.people where company_id='a3000000-0000-4000-8000-000000000101'),
  3,'people rows are unchanged');

-- Idempotent re-run changes nothing.
update public.people p set position_seniority_profile_id = pr.id
from public.position_seniority_profiles pr
where p.position_id is not null and p.position_seniority_profile_id is null
  and pr.company_id = p.company_id and pr.position_id = p.position_id
  and pr.seniority_level_id is null and pr.active;
select is((select position_seniority_profile_id from public.people where id='a3000000-0000-4000-8000-000000000501'),
  'a3000000-0000-4000-8000-000000000401','backfill is idempotent');

create temporary table t_ids(name text, id uuid) on commit drop;
grant select, insert on t_ids to authenticated;

-- ---------------------------------------------------------------------------
-- create_tenant_person_v1 evolution, as the active Alpha owner.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- Create with a position → base profile derived and coherent.
insert into t_ids values ('c1',
  ((public.create_tenant_person_v1('a3000000-0000-4000-8000-000000000101','Nova Pessoa',null,null,null,null,'active',
    null,'a3000000-0000-4000-8000-000000000301',null,null,'crt-1')) ->> 'personId')::uuid);
-- Create with no position → profile NULL.
insert into t_ids values ('c2',
  ((public.create_tenant_person_v1('a3000000-0000-4000-8000-000000000101','Sem Cargo',null,null,null,null,'active',
    null,null,null,null,'crt-2')) ->> 'personId')::uuid);

-- Idempotent retry still works (same key + intent).
select is((public.create_tenant_person_v1('a3000000-0000-4000-8000-000000000101','Nova Pessoa',null,null,null,null,'active',
    null,'a3000000-0000-4000-8000-000000000301',null,null,'crt-1')) ->> 'status',
  'idempotent_retry','create idempotency still works after the evolution');

-- Cross-tenant position rejected (existing contract preserved). Name >= 2 chars
-- so input validation passes and the tenant check is what fires.
select throws_ok($$select public.create_tenant_person_v1('a3000000-0000-4000-8000-000000000101','Cross Tenant Person',null,null,null,null,'active',
    null,'a3000000-0000-4000-8000-000000000302',null,null,'crt-x')$$,
  '23514','TENANT_REFERENCE_INVALID','a cross-tenant position is rejected on create');
-- A position without an active base profile fails closed. Name >= 2 chars so the
-- base-profile derivation is what fires (position 303 has no base profile).
select throws_ok($$select public.create_tenant_person_v1('a3000000-0000-4000-8000-000000000101','Missing Base Person',null,null,null,null,'active',
    null,'a3000000-0000-4000-8000-000000000303',null,null,'crt-y')$$,
  'P0002','POSITION_SENIORITY_PROFILE_NOT_FOUND','a position without an active base profile fails closed');
-- Employee cannot create.
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select public.create_tenant_person_v1('a3000000-0000-4000-8000-000000000101','Denied Person',null,null,null,null,'active',
    null,'a3000000-0000-4000-8000-000000000301',null,null,'crt-z')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','an employee cannot create a person');

-- ---------------------------------------------------------------------------
-- update_tenant_person_v1 evolution.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- Change position 301 -> 304: position_id and base profile move together.
select is((public.update_tenant_person_v1('a3000000-0000-4000-8000-000000000101','a3000000-0000-4000-8000-000000000501',
    'Pessoa Com Cargo',null,null,null,null,'active',null,'a3000000-0000-4000-8000-000000000304',null,null)) ->> 'status',
  'succeeded','owner moves a person to another position');
-- Remove position: both go NULL.
select is((public.update_tenant_person_v1('a3000000-0000-4000-8000-000000000101','a3000000-0000-4000-8000-000000000501',
    'Pessoa Com Cargo',null,null,null,null,'active',null,null,null,null)) ->> 'status',
  'succeeded','owner removes a person from a position');
-- Re-assign position 301: profile returns to base of 301.
select is((public.update_tenant_person_v1('a3000000-0000-4000-8000-000000000101','a3000000-0000-4000-8000-000000000501',
    'Pessoa Com Cargo',null,null,null,null,'active',null,'a3000000-0000-4000-8000-000000000301',null,null)) ->> 'status',
  'succeeded','owner reassigns a position');
-- Cross-tenant position rejected; nonexistent person fails closed.
select throws_ok($$select public.update_tenant_person_v1('a3000000-0000-4000-8000-000000000101','a3000000-0000-4000-8000-000000000501',
    'Cross Tenant Update',null,null,null,null,'active',null,'a3000000-0000-4000-8000-000000000302',null,null)$$,
  '23514','TENANT_REFERENCE_INVALID','a cross-tenant position is rejected on update');
select throws_ok($$select public.update_tenant_person_v1('a3000000-0000-4000-8000-000000000101','a3000000-0000-4000-8000-0000000005ff',
    'Missing Person',null,null,null,null,'active',null,null,null,null)$$,
  'P0002','PERSON_NOT_FOUND','a nonexistent person fails closed');

-- Position creation OWNS the base profile: a boundary-created position is
-- immediately person-assignable, with no separate profile setup.
insert into t_ids values ('pos1',
  ((public.create_tenant_position_v1('a3000000-0000-4000-8000-000000000101','Novo Cargo',null,null,
    'analyst','active',40,'on_site','clt','none','pos-crt-1')) ->> 'positionId')::uuid);
insert into t_ids values ('c3',
  ((public.create_tenant_person_v1('a3000000-0000-4000-8000-000000000101','Pessoa Novo Cargo',null,null,null,null,'active',
    null,(select id from t_ids where name='pos1'),null,null,'crt-3')) ->> 'personId')::uuid);
-- Idempotent retry of position create must not create a second base profile.
select is((public.create_tenant_position_v1('a3000000-0000-4000-8000-000000000101','Novo Cargo',null,null,
    'analyst','active',40,'on_site','clt','none','pos-crt-1')) ->> 'status',
  'idempotent_retry','position create retry is idempotent');
reset role;

-- ---------------------------------------------------------------------------
-- Coherence, invariants, activity, data-safety (setup role).
-- ---------------------------------------------------------------------------
-- Create coherence.
select is((select position_seniority_profile_id from public.people where id=(select id from t_ids where name='c1')),
  'a3000000-0000-4000-8000-000000000401','create derived the base profile');
select is((select position_id from public.people where id=(select id from t_ids where name='c1')),
  'a3000000-0000-4000-8000-000000000301','create kept position_id coherent');
select is((select position_seniority_profile_id from public.people where id=(select id from t_ids where name='c2')),
  null,'create without a position leaves the profile NULL');

-- Update coherence (final state after 301 reassign).
select is((select position_id from public.people where id='a3000000-0000-4000-8000-000000000501'),
  'a3000000-0000-4000-8000-000000000301','update kept position_id coherent');
select is((select position_seniority_profile_id from public.people where id='a3000000-0000-4000-8000-000000000501'),
  'a3000000-0000-4000-8000-000000000401','update kept the base profile coherent with the position');

-- Position creation owns the base profile (structural invariant).
select is((select count(*)::int from public.position_seniority_profiles
   where position_id=(select id from t_ids where name='pos1')
     and seniority_level_id is null and active),
  1,'position creation creates exactly one active base profile');
select is((select count(*)::int from public.position_seniority_profiles
   where position_id=(select id from t_ids where name='pos1')
     and seniority_level_id is not null),
  0,'position creation creates no specific seniority profile');
select is((select position_seniority_profile_id from public.people where id=(select id from t_ids where name='c3')),
  (select id from public.position_seniority_profiles
     where position_id=(select id from t_ids where name='pos1') and seniority_level_id is null and active),
  'a person assigned to a boundary-created position derives its base profile');

-- Base profile creation is structural infrastructure: no seniority-profile
-- Activity is emitted, and the position Activity semantics are unchanged.
select is((select count(*)::int from public.activity_events
   where company_id='a3000000-0000-4000-8000-000000000101'
     and activity_type like 'position_seniority_profile%'),
  0,'base profile creation emits no seniority-profile Activity');
select is((select count(*)::int from public.activity_events
   where company_id='a3000000-0000-4000-8000-000000000101' and activity_type='position.created'),
  1,'position.created Activity emitted exactly once (idempotent retry emitted none)');

-- Profile↔Position invariant: every assigned profile is that position base.
select is((select count(*)::int from public.people p
   join public.position_seniority_profiles pr on pr.id = p.position_seniority_profile_id
   where p.company_id='a3000000-0000-4000-8000-000000000101'
     and (pr.position_id <> p.position_id or pr.company_id <> p.company_id or pr.seniority_level_id is not null)),
  0,'no person references a profile that is not its own position active base');

-- Activity: creates and updates, backfill emitted none.
select is((select count(*)::int from public.activity_events
   where company_id='a3000000-0000-4000-8000-000000000101' and activity_type='employee.created'),
  3,'three create activities (backfill emitted none)');
select is((select count(*)::int from public.activity_events
   where company_id='a3000000-0000-4000-8000-000000000101' and activity_type='employee.updated'),
  3,'three update activities, one per successful update');

-- Data safety: no person lost its position_id; counts stable.
select is((select count(*)::int from public.people where company_id='a3000000-0000-4000-8000-000000000101'),
  6,'people count reflects the three created persons plus fixtures');

-- ---------------------------------------------------------------------------
-- Defensive backfill (0103): a live position with no active base profile gets
-- exactly one; rerun converges; no duplicate; the position row is unchanged.
-- Simulates a position created between the 0102 and 0103 deploys.
-- ---------------------------------------------------------------------------
insert into public.positions (id, company_id, name) values
  ('a3000000-0000-4000-8000-000000000305','a3000000-0000-4000-8000-000000000101','Cargo Sem Base Defensivo');
insert into public.position_seniority_profiles (company_id, position_id, seniority_level_id, active)
select p.company_id, p.id, null, true
from public.positions p
where p.deleted_at is null
  and not exists (select 1 from public.position_seniority_profiles pr
    where pr.position_id = p.id and pr.seniority_level_id is null and pr.active);
select is((select count(*)::int from public.position_seniority_profiles
   where position_id='a3000000-0000-4000-8000-000000000305' and seniority_level_id is null and active),
  1,'defensive backfill gives a live position exactly one active base profile');
-- Rerun converges (idempotent, no duplicate).
insert into public.position_seniority_profiles (company_id, position_id, seniority_level_id, active)
select p.company_id, p.id, null, true
from public.positions p
where p.deleted_at is null
  and not exists (select 1 from public.position_seniority_profiles pr
    where pr.position_id = p.id and pr.seniority_level_id is null and pr.active);
select is((select count(*)::int from public.position_seniority_profiles
   where position_id='a3000000-0000-4000-8000-000000000305' and seniority_level_id is null and active),
  1,'defensive backfill rerun does not duplicate');
select is((select name from public.positions where id='a3000000-0000-4000-8000-000000000305'),
  'Cargo Sem Base Defensivo','defensive backfill leaves the position row unchanged');

select * from finish();
rollback;
