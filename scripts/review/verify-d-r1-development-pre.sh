#!/usr/bin/env bash
# Read-only PRE inventory for the D-R1 Review promotion (0130-0132).
set -uo pipefail
: "${DB_HOST:?DB_HOST is required}"
: "${DB_PORT:?DB_PORT is required}"
: "${DB_USER:?DB_USER is required}"
: "${DB_NAME:?DB_NAME is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
export PGPASSWORD PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 --no-psqlrc -At <<'SQL'
set default_transaction_read_only = on;
select 'DB_NAME=' || current_database();
select 'CONNECTED_ROLE=' || current_user;
select 'IS_LOOPBACK=' || coalesce((inet_server_addr() << inet '127.0.0.0/8' or inet_server_addr() = inet '::1')::text,'false');
select 'HAS_MIGRATION_LEDGER=' || (to_regclass('supabase_migrations.schema_migrations') is not null)::text;
select 'SUPABASE_ROLES=' || count(*) from pg_roles where rolname in ('anon','authenticated','service_role','supabase_admin');
select 'MIGRATION_HISTORY=' || coalesce(string_agg(version,',' order by version),'') from supabase_migrations.schema_migrations;
select 'MIGRATION_0126_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0126%';
select 'MIGRATION_0129_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0129%';
select 'MIGRATION_0130_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0130%';
select 'MIGRATION_0131_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0131%';
select 'MIGRATION_0132_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0132%';
select 'MIGRATIONS_AFTER_0132=' || count(*) from supabase_migrations.schema_migrations where version > '0132';

select 'NEW_TABLE_COUNT=' || count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('development_reviews','development_private_audit');
select 'LIFECYCLE_BOUNDARY_NAMECOUNT=' || count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in (
 'get_authorized_development_plans_v1','get_authorized_development_goals_v1','get_authorized_development_actions_v1','get_authorized_development_reviews_v1',
 'create_development_plan_v1','update_development_plan_v1','reassign_development_plan_owner_v1','activate_development_plan_v1','cancel_development_plan_v1',
 'complete_development_plan_v1','start_development_action_v1','complete_development_action_v1','skip_development_action_v1','record_development_review_v1');
select 'TEMPLATE_AUTHORING_NAMECOUNT=' || count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in (
 'get_published_development_template_catalog_v1','get_development_template_authoring_v1','create_development_template_draft_v1',
 'add_development_template_goal_v1','add_development_template_action_v1','publish_development_template_version_v1','obsolete_development_template_version_v1');
select 'APPLICATION_NEW_NAMECOUNT=' || count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('can_apply_development_template_v1','can_read_development_template_version_v1',
 'get_development_template_version_v1','get_development_template_version_goals_v1','get_development_template_version_actions_v1');
select 'PLAN_VERSION_COLUMN=' || (exists(select 1 from pg_attribute where attrelid='public.development_plans'::regclass and attname='version' and not attisdropped))::text;
select 'TEMPLATE_REVISION_COLUMN=' || (exists(select 1 from pg_attribute where attrelid='public.development_template_versions'::regclass and attname='revision' and not attisdropped))::text;

select 'REPLACED_FUNCTIONS_PRESENT=' || count(*) from unnest(array[
 'public.reserve_development_template_application_v1(jsonb)',
 'public.complete_development_template_application_v1(jsonb,uuid)',
 'public.fail_development_template_application_v1(uuid,uuid,uuid,text,text)']) s(sig) where to_regprocedure(sig) is not null;
select 'REPLACED_FUNCTIONS_FINGERPRINT=' || md5(string_agg(pg_get_functiondef(to_regprocedure(sig)),';' order by sig)) from unnest(array[
 'public.reserve_development_template_application_v1(jsonb)',
 'public.complete_development_template_application_v1(jsonb,uuid)',
 'public.fail_development_template_application_v1(uuid,uuid,uuid,text,text)']) s(sig);

select 'DEVELOPMENT_RLS_FINGERPRINT=' || md5(coalesce(string_agg(c.relname||'='||c.relrowsecurity::text||'/'||c.relforcerowsecurity::text,';' order by c.relname),''))
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in
 ('development_plans','development_goals','development_actions','development_templates','development_template_goals','development_template_actions',
  'development_template_versions','development_template_version_goals','development_template_version_actions');
select 'DEVELOPMENT_POLICY_FINGERPRINT=' || md5(coalesce(string_agg(tablename||':'||policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,''),';' order by tablename,policyname),''))
 from pg_policies where schemaname='public' and tablename like 'development_%';
select 'DEVELOPMENT_ACL_FINGERPRINT=' || md5(coalesce(string_agg(c.relname||'='||coalesce(c.relacl::text,'<default>'),';' order by c.relname),''))
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'development_%' and c.relkind in ('r','p');

select 'RETENTION_PRESENT=' || (to_regprocedure('public.get_company_retention_pressure_v1(uuid)') is not null)::text;
select 'RETENTION_BODY_FINGERPRINT=' || md5(pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure));
select 'RETENTION_FOUR_RELATIONS=' || (
 (pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_applications%')::int+
 (pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_application_attempts%')::int+
 (pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_application_snapshots%')::int+
 (pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_application_lineage%')::int);
SQL
