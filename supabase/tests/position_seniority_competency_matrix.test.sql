begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- The active contract after physical retirement is the canonical profile matrix.
select has_table('public','position_seniority_competencies','canonical matrix exists');
select has_column('public','position_seniority_competencies','company_id','company_id column');
select has_column('public','position_seniority_competencies','position_seniority_profile_id','profile column');
select has_column('public','position_seniority_competencies','competency_id','competency_id column');
select has_column('public','position_seniority_competencies','expected_level','expected_level column');
select has_column('public','position_seniority_competencies','weight','weight column');
select has_column('public','position_seniority_competencies','required','required column');
select has_column('public','position_seniority_competencies','type','type column');
select has_column('public','position_seniority_competencies','notes','notes column');
select has_column('public','position_seniority_competencies','archived_at','archived_at column');

select ok(exists(select 1 from pg_constraint
  where conname='position_seniority_competencies_id_company_id_key'),
  'composite tenant-safe key exists');
select ok(exists(select 1 from pg_constraint
  where conname='position_seniority_competencies_profile_company_fkey'),
  'tenant-safe profile FK exists');
select ok(exists(select 1 from pg_constraint
  where conname='position_seniority_competencies_competency_company_fkey'),
  'tenant-safe competency FK exists');
select has_index('public','position_seniority_competencies',
  'position_seniority_competencies_active_unique',
  'active profile/competency uniqueness remains');

select ok((select relrowsecurity from pg_class
  where oid='public.position_seniority_competencies'::regclass),'RLS remains enabled');
select is((select count(*) from pg_policy
  where polrelid='public.position_seniority_competencies'::regclass),2::bigint,
  'canonical RLS policies remain');

select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','insert'),
  'authenticated direct insert stays closed');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','update'),
  'authenticated direct update stays closed');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','delete'),
  'authenticated direct delete stays closed');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','select'),
  'authenticated direct select stays closed');

select throws_ok(
  $$insert into public.position_seniority_competencies
      (company_id,position_seniority_profile_id,competency_id,expected_level)
    values (gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),0)$$,
  '23514',null,'expected level remains bounded');
select throws_ok(
  $$insert into public.position_seniority_competencies
      (company_id,position_seniority_profile_id,competency_id,weight)
    values (gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),6)$$,
  '23514',null,'weight remains bounded');
select throws_ok(
  $$insert into public.position_seniority_competencies
      (company_id,position_seniority_profile_id,competency_id,type)
    values (gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'invalid')$$,
  '23514',null,'competency type remains closed');

select hasnt_table('public','position_competencies','legacy source table stays retired');

select * from finish();
rollback;
