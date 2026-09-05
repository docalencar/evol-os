begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

select hasnt_table('public', 'position_competencies',
  'legacy Position competency table is physically retired');

select hasnt_function('public', 'archive_tenant_position_competency_v1', array['uuid', 'uuid']);
select hasnt_function('public', 'create_tenant_position_competency_v1',
  array['uuid', 'uuid', 'uuid', 'integer', 'integer', 'boolean', 'text', 'text']);
select hasnt_function('public', 'update_tenant_position_competency_v1',
  array['uuid', 'uuid', 'uuid', 'uuid', 'integer', 'integer', 'boolean', 'text', 'text']);
select hasnt_function('public', 'get_tenant_competency_directory_v1', array['uuid']);
select hasnt_function('public', 'get_tenant_position_competencies_v1', array['uuid', 'uuid']);

select is((
  select count(*)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'archive_tenant_position_competency_v1',
      'create_tenant_position_competency_v1',
      'update_tenant_position_competency_v1',
      'get_tenant_competency_directory_v1',
      'get_tenant_position_competencies_v1'
    )
), 0::bigint, 'legacy Position competency RPC namecounts are zero');

select has_table('public', 'position_seniority_competencies',
  'canonical Position-seniority competency table remains');
select has_function('public', 'get_tenant_position_seniority_competency_matrix_v1',
  array['uuid', 'uuid', 'boolean']);
select has_function('public', 'set_tenant_position_seniority_competency_v1',
  array['uuid', 'uuid', 'uuid', 'integer', 'integer', 'boolean', 'text', 'text']);
select has_function('public', 'clear_tenant_position_seniority_competency_v1',
  array['uuid', 'uuid', 'uuid']);
select has_function('public', 'get_tenant_person_competency_expectations_v1',
  array['uuid', 'uuid']);
select has_function('public', 'get_tenant_company_person_competency_expectations_v1',
  array['uuid']);

select is((
  select count(*)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'get_tenant_position_seniority_competency_matrix_v1',
      'set_tenant_position_seniority_competency_v1',
      'clear_tenant_position_seniority_competency_v1',
      'get_tenant_person_competency_expectations_v1',
      'get_tenant_company_person_competency_expectations_v1'
    )
    and p.prosecdef
    and p.proconfig = array['search_path=public, pg_temp']
), 5::bigint, 'canonical RPC security properties remain hardened');

select * from finish();
rollback;
