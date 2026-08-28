begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Schema (Slice 4A — position_seniority_competencies).
-- ---------------------------------------------------------------------------
select has_table('public','position_seniority_competencies','table exists');
select has_column('public','position_seniority_competencies','company_id','company_id column');
select has_column('public','position_seniority_competencies','position_seniority_profile_id','profile column');
select has_column('public','position_seniority_competencies','competency_id','competency_id column');
select has_column('public','position_seniority_competencies','expected_level','expected_level column');
select has_column('public','position_seniority_competencies','weight','weight column');
select has_column('public','position_seniority_competencies','required','required column');
select has_column('public','position_seniority_competencies','type','type column');
select has_column('public','position_seniority_competencies','notes','notes column');
select has_column('public','position_seniority_competencies','archived_at','archived_at column');
select ok(exists(select 1 from pg_constraint where conname='position_seniority_competencies_id_company_id_key'),
  'composite tenant-safe key (id, company_id) exists');
select ok(exists(select 1 from pg_constraint where conname='position_seniority_competencies_profile_company_fkey'),
  'tenant-safe FK to position_seniority_profiles(id, company_id) exists');
select ok(exists(select 1 from pg_constraint where conname='position_seniority_competencies_competency_company_fkey'),
  'tenant-safe FK to competencies(id, company_id) exists');
select has_index('public','position_seniority_competencies','position_seniority_competencies_active_unique',
  'active (profile, competency) partial unique exists');
select ok((select relrowsecurity from pg_class where oid='public.position_seniority_competencies'::regclass),
  'RLS is enabled');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','insert'),'insert stays closed');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','update'),'update stays closed');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','delete'),'delete stays closed');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','select'),'select stays closed (reads via boundary/compat)');
-- CHECK constraints preserved from the source semantics.
select ok((select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
  where t.relname='position_seniority_competencies' and c.contype='c') >= 3,
  'expected_level/weight/type CHECK constraints exist');

-- ---------------------------------------------------------------------------
-- Fixtures.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a4000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('a4000000-0000-4000-8000-000000000005','employee-a@example.com'),
  ('a4000000-0000-4000-8000-000000000008','owner-b@example.com');
insert into public.companies (id, name, slug) values
  ('a4000000-0000-4000-8000-000000000101','PSC Alpha','psc-alpha'),
  ('a4000000-0000-4000-8000-000000000102','PSC Beta','psc-beta');
insert into public.company_members (id, company_id, user_id, role, status) values
  ('a4000000-0000-4000-8000-000000000111','a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000001','owner','active'),
  ('a4000000-0000-4000-8000-000000000115','a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000005','employee','active'),
  ('a4000000-0000-4000-8000-000000000118','a4000000-0000-4000-8000-000000000102','a4000000-0000-4000-8000-000000000008','owner','active');
insert into public.positions (id, company_id, name, deleted_at) values
  ('a4000000-0000-4000-8000-000000000301','a4000000-0000-4000-8000-000000000101','Analista',null),
  ('a4000000-0000-4000-8000-000000000302','a4000000-0000-4000-8000-000000000101','Extinto',now()),
  ('a4000000-0000-4000-8000-000000000303','a4000000-0000-4000-8000-000000000102','Beta Cargo',null);
insert into public.competencies (id, company_id, name, category) values
  ('a4000000-0000-4000-8000-000000000401','a4000000-0000-4000-8000-000000000101','Comunicação','behavioral'),
  ('a4000000-0000-4000-8000-000000000402','a4000000-0000-4000-8000-000000000101','Liderança','leadership'),
  ('a4000000-0000-4000-8000-000000000409','a4000000-0000-4000-8000-000000000102','Beta Comp','technical');

-- Base profiles for non-deleted positions (re-run the 0102 backfill statement).
insert into public.position_seniority_profiles (company_id, position_id, seniority_level_id, active)
select p.company_id, p.id, null, true
from public.positions p
where p.deleted_at is null
  and not exists (select 1 from public.position_seniority_profiles pr
    where pr.position_id = p.id and pr.seniority_level_id is null and pr.active);

-- Source rows for Alpha: one ACTIVE (with notes) + one ARCHIVED (with notes).
insert into public.position_competencies
  (id, company_id, position_id, competency_id, expected_level, weight, required, type, notes, archived_at) values
  ('a4000000-0000-4000-8000-000000000501','a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000301','a4000000-0000-4000-8000-000000000401',4,2,true,'core','nota-ativa',null),
  ('a4000000-0000-4000-8000-000000000502','a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000301','a4000000-0000-4000-8000-000000000402',3,1,false,'optional','nota-arquivada','2026-01-01T00:00:00Z');

-- base profile id of the active Alpha position
create temporary table t_ids(name text, id uuid) on commit drop;
insert into t_ids values ('base_301',
  (select id from public.position_seniority_profiles
   where position_id='a4000000-0000-4000-8000-000000000301' and seniority_level_id is null and active));

-- ---------------------------------------------------------------------------
-- Backfill (re-run the 0120 migration statement) — deterministic & idempotent.
-- ---------------------------------------------------------------------------
insert into public.position_seniority_competencies (
  company_id, position_seniority_profile_id, competency_id,
  expected_level, weight, required, type, notes, created_at, updated_at, archived_at)
select pc.company_id, bp.id, pc.competency_id,
       pc.expected_level, pc.weight, pc.required, pc.type, pc.notes, pc.created_at, pc.updated_at, pc.archived_at
from public.position_competencies pc
join public.position_seniority_profiles bp
  on bp.company_id=pc.company_id and bp.position_id=pc.position_id
 and bp.seniority_level_id is null and bp.active
where pc.company_id='a4000000-0000-4000-8000-000000000101'
  and not exists (select 1 from public.position_seniority_competencies t
    where t.company_id=pc.company_id and t.position_seniority_profile_id=bp.id
      and t.competency_id=pc.competency_id and t.archived_at is not distinct from pc.archived_at
      and t.expected_level=pc.expected_level and t.weight=pc.weight and t.required=pc.required and t.type=pc.type);

-- zero-loss: target count == source count (scoped to Alpha)
select is(
  (select count(*)::int from public.position_seniority_competencies where company_id='a4000000-0000-4000-8000-000000000101'),
  (select count(*)::int from public.position_competencies where company_id='a4000000-0000-4000-8000-000000000101'),
  'backfill maps every Alpha source row 1:1 (zero-loss)');

-- active source -> base profile, values preserved exactly
select is(
  (select row(position_seniority_profile_id, competency_id, expected_level, weight, required, type, notes, archived_at)::text
     from public.position_seniority_competencies
     where company_id='a4000000-0000-4000-8000-000000000101' and competency_id='a4000000-0000-4000-8000-000000000401'),
  (select row((select id from t_ids where name='base_301'),'a4000000-0000-4000-8000-000000000401'::uuid,4,2,true,'core','nota-ativa',null::timestamptz)::text),
  'active requirement relocated to the base profile with all values preserved');

-- archived source -> base profile, archived_at + values preserved
select is(
  (select row(position_seniority_profile_id, expected_level, weight, required, type, notes, archived_at)::text
     from public.position_seniority_competencies
     where company_id='a4000000-0000-4000-8000-000000000101' and competency_id='a4000000-0000-4000-8000-000000000402'),
  (select row((select id from t_ids where name='base_301'),3,1,false,'optional','nota-arquivada','2026-01-01T00:00:00+00'::timestamptz)::text),
  'archived requirement relocated with archived_at + values preserved (never dropped)');

-- created_at / updated_at preserved from source
select is(
  (select c.created_at = pc.created_at and c.updated_at = pc.updated_at
     from public.position_seniority_competencies c
     join public.position_competencies pc on pc.id='a4000000-0000-4000-8000-000000000501'
     where c.company_id='a4000000-0000-4000-8000-000000000101' and c.competency_id='a4000000-0000-4000-8000-000000000401'),
  true,'created_at/updated_at preserved from source');

-- idempotency: re-running the same backfill inserts nothing new
insert into public.position_seniority_competencies (
  company_id, position_seniority_profile_id, competency_id,
  expected_level, weight, required, type, notes, created_at, updated_at, archived_at)
select pc.company_id, bp.id, pc.competency_id,
       pc.expected_level, pc.weight, pc.required, pc.type, pc.notes, pc.created_at, pc.updated_at, pc.archived_at
from public.position_competencies pc
join public.position_seniority_profiles bp
  on bp.company_id=pc.company_id and bp.position_id=pc.position_id
 and bp.seniority_level_id is null and bp.active
where pc.company_id='a4000000-0000-4000-8000-000000000101'
  and not exists (select 1 from public.position_seniority_competencies t
    where t.company_id=pc.company_id and t.position_seniority_profile_id=bp.id
      and t.competency_id=pc.competency_id and t.archived_at is not distinct from pc.archived_at
      and t.expected_level=pc.expected_level and t.weight=pc.weight and t.required=pc.required and t.type=pc.type);
select is(
  (select count(*)::int from public.position_seniority_competencies where company_id='a4000000-0000-4000-8000-000000000101'),
  2,'backfill is idempotent (no duplicates on re-run)');

-- active target uniqueness: a second ACTIVE row for the same (profile, competency) is rejected
select throws_ok(format($$insert into public.position_seniority_competencies
   (company_id, position_seniority_profile_id, competency_id) values
   ('a4000000-0000-4000-8000-000000000101','%s','a4000000-0000-4000-8000-000000000401')$$,
   (select id from t_ids where name='base_301')),
  '23505',null,'a duplicate active (profile, competency) is rejected by the partial unique index');

-- tenant-safe FK: a profile from another company cannot be paired with this company
select throws_ok($$insert into public.position_seniority_competencies
   (company_id, position_seniority_profile_id, competency_id) values
   ('a4000000-0000-4000-8000-000000000102', 'a4000000-0000-4000-8000-000000000501','a4000000-0000-4000-8000-000000000409')$$,
  '23503',null,'a cross-tenant (profile, company) pair is rejected by the composite FK');

-- ---------------------------------------------------------------------------
-- FAIL-CLOSED: a source row with no active base profile must abort the backfill.
-- ---------------------------------------------------------------------------
insert into public.position_competencies
  (id, company_id, position_id, competency_id, expected_level, weight, required, type) values
  ('a4000000-0000-4000-8000-000000000503','a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000302','a4000000-0000-4000-8000-000000000401',3,1,true,'core');
-- (position 302 is soft-deleted -> has no base profile -> this source row is UNMAPPABLE.)
select throws_ok($$
  do $inner$
  declare v_source bigint; v_target bigint;
  begin
    select count(*) into v_source from public.position_competencies where company_id='a4000000-0000-4000-8000-000000000101';
    select count(*) into v_target from public.position_competencies pc
      join public.position_seniority_profiles bp on bp.company_id=pc.company_id and bp.position_id=pc.position_id
        and bp.seniority_level_id is null and bp.active
      where pc.company_id='a4000000-0000-4000-8000-000000000101';
    if (v_source - v_target) <> 0 then
      raise exception 'SLICE_4A_UNMAPPABLE: % rows', v_source - v_target;
    end if;
  end $inner$;$$,
  'SLICE_4A_UNMAPPABLE: 1 rows','the fail-closed guard aborts when a source row has no active base profile');

-- ---------------------------------------------------------------------------
-- Regression: source table and profiles are untouched by the relocation.
-- ---------------------------------------------------------------------------
select has_table('public','position_competencies','source table still exists');
select is((select count(*)::int from public.position_competencies where id in
   ('a4000000-0000-4000-8000-000000000501','a4000000-0000-4000-8000-000000000502')),
  2,'the original active + archived source rows are intact (not mutated/removed)');
select is((select expected_level from public.position_competencies where id='a4000000-0000-4000-8000-000000000501'),
  4,'source values are unchanged by the backfill');
select is((select count(*)::int from public.position_seniority_profiles
   where position_id='a4000000-0000-4000-8000-000000000301' and seniority_level_id is null and active),
  1,'the base profile remains coherent (exactly one active)');

select * from finish();
rollback;
