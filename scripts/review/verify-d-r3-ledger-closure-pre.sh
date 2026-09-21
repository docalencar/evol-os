#!/usr/bin/env bash
# Read-only PRE inventory for D-R3 Review promotion (migration 0134).
set -uo pipefail
: "${DB_HOST:?}" "${DB_PORT:?}" "${DB_USER:?}" "${DB_NAME:?}" "${PGPASSWORD:?}"
export PGPASSWORD PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 --no-psqlrc -At <<'SQL'
set default_transaction_read_only = on;
select 'DB_NAME='||current_database();
select 'CONNECTED_ROLE='||current_user;
select 'IS_LOOPBACK='||coalesce((inet_server_addr()<<inet '127.0.0.0/8' or inet_server_addr()=inet '::1')::text,'false');
select 'HAS_MIGRATION_LEDGER='||(to_regclass('supabase_migrations.schema_migrations') is not null)::text;
select 'SUPABASE_ROLES='||count(*) from pg_roles where rolname in ('anon','authenticated','service_role','supabase_admin');
select 'MIGRATION_HISTORY='||coalesce(string_agg(version,',' order by version),'') from supabase_migrations.schema_migrations;
select 'MIGRATION_0132_COUNT='||count(*) from supabase_migrations.schema_migrations where version like '0132%';
select 'MIGRATION_0133_COUNT='||count(*) from supabase_migrations.schema_migrations where version like '0133%';
select 'MIGRATION_0134_COUNT='||count(*) from supabase_migrations.schema_migrations where version like '0134%';
select 'MIGRATIONS_AFTER_0133='||count(*) from supabase_migrations.schema_migrations where version>'0133';
select 'LEDGER_TABLE_COUNT='||count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname in ('development_template_applications','development_template_application_attempts','development_template_application_snapshots','development_template_application_lineage');
select 'AUTH_SELECT_COUNT='||count(*) from unnest(array['development_template_applications','development_template_application_attempts','development_template_application_snapshots','development_template_application_lineage']) t where has_table_privilege('authenticated','public.'||t,'select');
select 'OTHER_CLIENT_PRIV_COUNT='||count(*) from unnest(array['public','anon','service_role']) r, unnest(array['development_template_applications','development_template_application_attempts','development_template_application_snapshots','development_template_application_lineage']) t, unnest(array['select','insert','update','delete','truncate','references','trigger','maintain']) p where has_table_privilege(r,'public.'||t,p);
select 'AUTH_NONSELECT_PRIV_COUNT='||count(*) from unnest(array['development_template_applications','development_template_application_attempts','development_template_application_snapshots','development_template_application_lineage']) t, unnest(array['insert','update','delete','truncate','references','trigger','maintain']) p where has_table_privilege('authenticated','public.'||t,p);
select 'LEDGER_RLS_FINGERPRINT='||md5(string_agg(c.relname||'='||c.relrowsecurity::text||'/'||c.relforcerowsecurity::text,';' order by c.relname)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('development_template_applications','development_template_application_attempts','development_template_application_snapshots','development_template_application_lineage');
select 'LEDGER_POLICY_FINGERPRINT='||md5(string_agg(tablename||':'||policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,''),';' order by tablename,policyname)) from pg_policies where schemaname='public' and tablename in ('development_template_applications','development_template_application_attempts','development_template_application_snapshots','development_template_application_lineage');
select 'SELECT_POLICY_COUNT='||count(*) from pg_policies where schemaname='public' and cmd='SELECT' and tablename in ('development_template_applications','development_template_application_attempts','development_template_application_snapshots','development_template_application_lineage');
select 'TRUSTED_BOUNDARY_FINGERPRINT='||md5(string_agg(p.oid::regprocedure::text||':'||p.prosecdef::text||':'||p.provolatile::text||':'||coalesce(p.proconfig::text,'')||':'||coalesce(p.proacl::text,''),';' order by p.oid::regprocedure::text)) from pg_proc p where p.oid in (to_regprocedure('public.reserve_development_template_application_v1(jsonb)'),to_regprocedure('public.complete_development_template_application_v1(jsonb,uuid)'),to_regprocedure('public.get_company_retention_pressure_v1(uuid)'),to_regprocedure('public.get_authorized_development_plan_origins_v1(uuid,uuid)'));
select 'TRUSTED_BOUNDARY_COUNT='||count(*) from pg_proc p where p.oid in (to_regprocedure('public.reserve_development_template_application_v1(jsonb)'),to_regprocedure('public.complete_development_template_application_v1(jsonb,uuid)'),to_regprocedure('public.get_company_retention_pressure_v1(uuid)'),to_regprocedure('public.get_authorized_development_plan_origins_v1(uuid,uuid)')) and p.prosecdef and p.proconfig is not null;
select 'ORIGIN_FINGERPRINT='||md5(pg_get_functiondef('public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure)||coalesce((select proacl::text from pg_proc where oid='public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure),''));
select 'ORIGIN_RESULT='||pg_get_function_result('public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure);
select 'RETENTION_FINGERPRINT='||md5(pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure)||coalesce((select proacl::text from pg_proc where oid='public.get_company_retention_pressure_v1(uuid)'::regprocedure),''));
select 'RETENTION_RELATIONS='||coalesce(string_agg(relation_name,',' order by relation_name),'') from public.get_company_retention_pressure_v1('00000000-0000-4000-8000-000000000000');
SQL
