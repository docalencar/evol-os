begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Schema.
-- ---------------------------------------------------------------------------
select has_table('public','position_seniority_profiles','table exists');
select has_column('public','position_seniority_profiles','company_id','company_id column');
select has_column('public','position_seniority_profiles','position_id','position_id column');
select has_column('public','position_seniority_profiles','seniority_level_id','seniority_level_id column');
select has_column('public','position_seniority_profiles','active','active column');
select ok(exists(select 1 from pg_constraint where conname='position_seniority_profiles_id_company_id_key'),
  'composite tenant-safe key (id, company_id) exists');
select ok(exists(select 1 from pg_constraint where conname='position_seniority_profiles_position_company_fkey'),
  'tenant-safe FK to positions(id, company_id) exists');
select ok(exists(select 1 from pg_constraint where conname='position_seniority_profiles_seniority_company_fkey'),
  'tenant-safe FK to seniority_levels(id, company_id) exists');
select has_index('public','position_seniority_profiles','position_seniority_profiles_base_active_unique',
  'active base-profile partial unique exists');
select has_index('public','position_seniority_profiles','position_seniority_profiles_specific_active_unique',
  'active specific-profile partial unique exists');
select ok((select relrowsecurity from pg_class where oid='public.position_seniority_profiles'::regclass),
  'RLS is enabled');
select ok(not has_table_privilege('authenticated','public.position_seniority_profiles','insert'),'insert stays closed');
select ok(not has_table_privilege('authenticated','public.position_seniority_profiles','update'),'update stays closed');
select ok(not has_table_privilege('authenticated','public.position_seniority_profiles','delete'),'delete stays closed');
select ok(not has_table_privilege('authenticated','public.position_seniority_profiles','select'),'select stays closed');

select has_function('public','get_tenant_position_seniority_profiles_v1',array['uuid','uuid','boolean']);
select has_function('public','add_tenant_position_seniority_profile_v1',array['uuid','uuid','uuid']);
select has_function('public','archive_tenant_position_seniority_profile_v1',array['uuid','uuid']);
select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('get_tenant_position_seniority_profiles_v1','add_tenant_position_seniority_profile_v1','archive_tenant_position_seniority_profile_v1')
    and p.prosecdef and p.proconfig=array['search_path=public, pg_temp']
),3::bigint,'all three boundaries are SECURITY DEFINER with hardened search_path');
select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('get_tenant_position_seniority_profiles_v1','add_tenant_position_seniority_profile_v1','archive_tenant_position_seniority_profile_v1')
    and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute'))
),0::bigint,'anon and service_role cannot execute any boundary');

-- ---------------------------------------------------------------------------
-- Fixtures.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a2000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('a2000000-0000-4000-8000-000000000005','employee-a@example.com'),
  ('a2000000-0000-4000-8000-000000000008','owner-b@example.com');
insert into public.companies (id, name, slug) values
  ('a2000000-0000-4000-8000-000000000101','PSP Alpha','psp-alpha'),
  ('a2000000-0000-4000-8000-000000000102','PSP Beta','psp-beta');
insert into public.company_members (id, company_id, user_id, role, status) values
  ('a2000000-0000-4000-8000-000000000111','a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000001','owner','active'),
  ('a2000000-0000-4000-8000-000000000115','a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000005','employee','active'),
  ('a2000000-0000-4000-8000-000000000118','a2000000-0000-4000-8000-000000000102','a2000000-0000-4000-8000-000000000008','owner','active');
insert into public.positions (id, company_id, name, deleted_at) values
  ('a2000000-0000-4000-8000-000000000301','a2000000-0000-4000-8000-000000000101','Analista',null),
  ('a2000000-0000-4000-8000-000000000302','a2000000-0000-4000-8000-000000000101','Extinto',now()),
  ('a2000000-0000-4000-8000-000000000303','a2000000-0000-4000-8000-000000000102','Beta Cargo',null);
insert into public.seniority_levels (id, company_id, code, label, rank, active) values
  ('a2000000-0000-4000-8000-000000000401','a2000000-0000-4000-8000-000000000101','JR','Júnior',10,true),
  ('a2000000-0000-4000-8000-000000000402','a2000000-0000-4000-8000-000000000101','PL','Pleno',20,true),
  ('a2000000-0000-4000-8000-000000000403','a2000000-0000-4000-8000-000000000101','OLD','Arquivado',5,false),
  ('a2000000-0000-4000-8000-000000000409','a2000000-0000-4000-8000-000000000102','BSR','Beta Sr',10,true);

select is((select count(*)::int from public.position_seniority_profiles
   where company_id='a2000000-0000-4000-8000-000000000101'),
  0,'fixture positions start with no profiles');

-- ---------------------------------------------------------------------------
-- Backfill (re-run the migration statement) — deterministic & idempotent.
-- ---------------------------------------------------------------------------
insert into public.position_seniority_profiles (company_id, position_id, seniority_level_id, active)
select p.company_id, p.id, null, true
from public.positions p
where p.deleted_at is null
  and not exists (select 1 from public.position_seniority_profiles pr
    where pr.position_id = p.id and pr.seniority_level_id is null and pr.active);

select is((select count(*)::int from public.position_seniority_profiles
   where position_id='a2000000-0000-4000-8000-000000000301' and seniority_level_id is null and active),
  1,'an active position gets exactly one active base profile');
select is((select count(*)::int from public.position_seniority_profiles
   where position_id='a2000000-0000-4000-8000-000000000302'),
  0,'a soft-deleted position gets no base profile');

insert into public.position_seniority_profiles (company_id, position_id, seniority_level_id, active)
select p.company_id, p.id, null, true
from public.positions p
where p.deleted_at is null
  and not exists (select 1 from public.position_seniority_profiles pr
    where pr.position_id = p.id and pr.seniority_level_id is null and pr.active);
select is((select count(*)::int from public.position_seniority_profiles
   where position_id='a2000000-0000-4000-8000-000000000301'),
  1,'backfill is idempotent');

select throws_ok(
  $$insert into public.position_seniority_profiles (company_id, position_id, seniority_level_id, active)
    values ('a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000301','a2000000-0000-4000-8000-000000000409',true)$$,
  '23503',null,'a cross-tenant (position, seniority) pair is rejected by the composite FK');

-- Capture ids for the boundary behavioral tests.
create temporary table t_ids(name text, id uuid) on commit drop;
grant select, insert on t_ids to authenticated;
insert into t_ids values ('p1_base',
  (select id from public.position_seniority_profiles
   where position_id='a2000000-0000-4000-8000-000000000301' and seniority_level_id is null and active));

-- ---------------------------------------------------------------------------
-- add / archive boundaries, as the active Alpha owner.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a2000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- add validations / denials.
select throws_ok($$select public.add_tenant_position_seniority_profile_v1(
   'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000301',null)$$,
  '22023','BASE_PROFILE_NOT_ADDABLE','a base profile cannot be added via the add boundary');
select throws_ok($$select public.add_tenant_position_seniority_profile_v1(
   'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000301','a2000000-0000-4000-8000-000000000403')$$,
  'P0002','SENIORITY_LEVEL_NOT_FOUND','an archived seniority cannot be applied');
select throws_ok($$select public.add_tenant_position_seniority_profile_v1(
   'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000301','a2000000-0000-4000-8000-000000000409')$$,
  'P0002','SENIORITY_LEVEL_NOT_FOUND','a foreign-tenant seniority cannot be applied');
select throws_ok($$select public.add_tenant_position_seniority_profile_v1(
   'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000302','a2000000-0000-4000-8000-000000000401')$$,
  'P0002','POSITION_NOT_FOUND','a seniority cannot be applied to a deleted position');
select throws_ok($$select public.add_tenant_position_seniority_profile_v1(
   'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000303','a2000000-0000-4000-8000-000000000401')$$,
  'P0002','POSITION_NOT_FOUND','a seniority cannot be applied to a foreign-tenant position');

-- add s1 (capture the profile id), then idempotent re-add returns already_applicable.
insert into t_ids values ('p1_s1_v1',
  ((public.add_tenant_position_seniority_profile_v1(
     'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000301','a2000000-0000-4000-8000-000000000401')) ->> 'profileId')::uuid);
select is((public.add_tenant_position_seniority_profile_v1(
   'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000301','a2000000-0000-4000-8000-000000000401')) ->> 'status',
  'already_applicable','re-adding an active seniority is idempotent');

-- The base profile cannot be archived.
select throws_ok(format($$select public.archive_tenant_position_seniority_profile_v1(
   'a2000000-0000-4000-8000-000000000101','%s')$$,(select id from t_ids where name='p1_base')),
  '22023','BASE_PROFILE_NOT_ARCHIVABLE','the base profile cannot be archived');

-- A specific profile can be archived (soft), idempotently.
select is((public.archive_tenant_position_seniority_profile_v1(
   'a2000000-0000-4000-8000-000000000101',(select id from t_ids where name='p1_s1_v1'))) ->> 'status',
  'succeeded','a specific profile can be archived');
select is((public.archive_tenant_position_seniority_profile_v1(
   'a2000000-0000-4000-8000-000000000101',(select id from t_ids where name='p1_s1_v1'))) ->> 'status',
  'already_archived','double archive is idempotent');
select throws_ok($$select public.archive_tenant_position_seniority_profile_v1(
   'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-0000000003ff')$$,
  'P0002','POSITION_SENIORITY_PROFILE_NOT_FOUND','a nonexistent profile cannot be archived');

-- Re-adding the same seniority after archive creates a NEW active profile.
insert into t_ids values ('p1_s1_v2',
  ((public.add_tenant_position_seniority_profile_v1(
     'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000301','a2000000-0000-4000-8000-000000000401')) ->> 'profileId')::uuid);
select isnt((select id from t_ids where name='p1_s1_v2'),(select id from t_ids where name='p1_s1_v1'),
  're-add after archive produces a new profile row');

-- Seniority-level archive interaction: apply s2, archive the seniority (0100),
-- the profile stays; re-adding the now-inactive seniority fails.
insert into t_ids values ('p1_s2',
  ((public.add_tenant_position_seniority_profile_v1(
     'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000301','a2000000-0000-4000-8000-000000000402')) ->> 'profileId')::uuid);
select is((public.archive_tenant_seniority_level_v1(
   'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000402')) ->> 'status',
  'succeeded','the seniority level itself is archived via the 0100 boundary');
select throws_ok($$select public.add_tenant_position_seniority_profile_v1(
   'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000301','a2000000-0000-4000-8000-000000000402')$$,
  'P0002','SENIORITY_LEVEL_NOT_FOUND','a seniority archived after use can no longer be applied');
reset role;

-- Employee (non-mutator) denied for add and archive.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a2000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok(format($$select public.archive_tenant_position_seniority_profile_v1(
   'a2000000-0000-4000-8000-000000000101','%s')$$,(select id from t_ids where name='p1_s1_v2')),
  '42501','TENANT_AUTHORIZATION_DENIED','an employee cannot archive a profile');

-- Read boundary, as a member.
select is((select count(*)::int from public.get_tenant_position_seniority_profiles_v1(
   'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000301')),
  3,'active read returns base + s1(v2) + s2 (archived s1 v1 excluded)');
select ok((select seniority_level_id is null from public.get_tenant_position_seniority_profiles_v1(
   'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000301') limit 1),
  'the base profile is ordered first');
select is((select count(*)::int from public.get_tenant_position_seniority_profiles_v1(
   'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000301', true)),
  4,'include_inactive also returns the archived profile');
select throws_ok($$select * from public.get_tenant_position_seniority_profiles_v1(
   'a2000000-0000-4000-8000-000000000102','a2000000-0000-4000-8000-000000000303')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','a non-member cannot read a foreign tenant');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_position_seniority_profiles_v1(
   'a2000000-0000-4000-8000-000000000101','a2000000-0000-4000-8000-000000000301')$$,
  '42501','AUTHENTICATION_REQUIRED','unauthenticated read denied');
reset role;

-- ---------------------------------------------------------------------------
-- Invariants, seniority interaction, activity & data-safety (setup role).
-- ---------------------------------------------------------------------------
-- Base profile stayed active (archive attempt failed).
select is((select active from public.position_seniority_profiles where id=(select id from t_ids where name='p1_base')),
  true,'the base profile remains active');
-- Every non-deleted position keeps an active base profile (structural invariant).
select is((select count(*)::int from public.position_seniority_profiles
   where position_id='a2000000-0000-4000-8000-000000000301' and seniority_level_id is null and active),
  1,'the position still has exactly one active base profile after specific archive');
-- (p1, s1): one active (v2), two rows total (v1 archived + v2).
select is((select count(*)::int from public.position_seniority_profiles
   where position_id='a2000000-0000-4000-8000-000000000301' and seniority_level_id='a2000000-0000-4000-8000-000000000401' and active),
  1,'exactly one active profile for the re-added (position, seniority)');
select is((select count(*)::int from public.position_seniority_profiles
   where position_id='a2000000-0000-4000-8000-000000000301' and seniority_level_id='a2000000-0000-4000-8000-000000000401'),
  2,'the archived history row is preserved alongside the new active one');
-- Seniority-archive interaction: the s2 profile still exists, active, referencing s2.
select is((select active from public.position_seniority_profiles where id=(select id from t_ids where name='p1_s2')),
  true,'archiving the seniority level did NOT archive the profile that references it');
select is((select seniority_level_id from public.position_seniority_profiles where id=(select id from t_ids where name='p1_s2')),
  'a2000000-0000-4000-8000-000000000402','the profile still references the (now archived) seniority row');
-- Activity counts.
select is((select count(*)::int from public.activity_events
   where company_id='a2000000-0000-4000-8000-000000000101' and activity_type='position_seniority_profile.created'),
  3,'three add activities (s1, s1 re-add, s2); backfill emitted none');
select is((select count(*)::int from public.activity_events
   where company_id='a2000000-0000-4000-8000-000000000101' and activity_type='position_seniority_profile.archived'),
  1,'one archive activity (double archive added none)');
-- Data safety: untouched neighbours.
select is((select count(*)::int from public.positions where company_id='a2000000-0000-4000-8000-000000000101'),
  2,'positions rows are unchanged');
select is((select count(*)::int from public.people where company_id='a2000000-0000-4000-8000-000000000101'),
  0,'people rows are unchanged');

select * from finish();
rollback;
