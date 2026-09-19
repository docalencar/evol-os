#!/usr/bin/env bash
# Read-only PRE inventory for the D-R2 Review promotion (migration 0133).
#
# It answers one question: is the target exactly canonical Review, in exactly the
# state that makes applying 0133 a well-defined, single-step operation?
#
# Every value is emitted as KEY=VALUE for the promotion runner to compare. This
# script asserts nothing itself — it reports, and the runner decides — which is
# what lets the same snapshot be taken twice and compared byte for byte for TOCTOU.
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

-- Target identity.
select 'DB_NAME=' || current_database();
select 'CONNECTED_ROLE=' || current_user;
select 'IS_LOOPBACK=' || coalesce((inet_server_addr() << inet '127.0.0.0/8' or inet_server_addr() = inet '::1')::text,'false');
select 'HAS_MIGRATION_LEDGER=' || (to_regclass('supabase_migrations.schema_migrations') is not null)::text;
select 'SUPABASE_ROLES=' || count(*) from pg_roles where rolname in ('anon','authenticated','service_role','supabase_admin');

-- Migration history. 0133 must be absent and nothing may sit beyond 0132, or
-- "apply 0133" is not a single well-defined step.
select 'MIGRATION_HISTORY=' || coalesce(string_agg(version,',' order by version),'') from supabase_migrations.schema_migrations;
select 'MIGRATION_0130_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0130%';
select 'MIGRATION_0131_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0131%';
select 'MIGRATION_0132_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0132%';
select 'MIGRATION_0133_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0133%';
select 'MIGRATIONS_AFTER_0132=' || count(*) from supabase_migrations.schema_migrations where version > '0132';

-- The target function must be absent, proven by NAME and not by one signature:
-- an unexpected overload would make the migration history alone misleading.
select 'ORIGIN_NAMECOUNT=' || count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='get_authorized_development_plan_origins_v1';
select 'ORIGIN_SIGNATURE_PRESENT=' || (to_regprocedure('public.get_authorized_development_plan_origins_v1(uuid,uuid)') is not null)::text;

-- Partial-artifact probe. 0133 creates one function and grants it; nothing else.
-- If a comment or an ACL for that name somehow exists while the function does
-- not, the remote is not in a clean pre-migration state.
select 'ORIGIN_ACL_ROWS=' || count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='get_authorized_development_plan_origins_v1' and p.proacl is not null;

-- D-DB1 must already be in place: 0133 authorizes through can_read_development_plan_v1
-- and reads the application ledger, so both must exist before it is applied.
select 'PLAN_READ_PREDICATE_PRESENT=' || (to_regprocedure('public.can_read_development_plan_v1(uuid)') is not null)::text;
select 'PLANS_READER_PRESENT=' || (to_regprocedure('public.get_authorized_development_plans_v1(uuid,uuid)') is not null)::text;
select 'IS_COMPANY_MEMBER_PRESENT=' || (to_regprocedure('public.is_company_member(uuid)') is not null)::text;
select 'LEDGER_TABLE_COUNT=' || count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' and c.relname in
 ('development_plans','development_template_application_lineage','development_template_application_snapshots');

-- Ledger ACL, RLS and policy fingerprints. 0133 must not move ANY of these, and
-- the pre-existing tenant-wide visibility finding is recorded here as state to be
-- preserved, not repaired: D-R2 promotes 0133 and nothing else.
select 'LEDGER_ACL_FINGERPRINT=' || md5(coalesce(string_agg(c.relname||'='||coalesce(c.relacl::text,'<default>'),';' order by c.relname),''))
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'
 and c.relname in ('development_template_applications','development_template_application_attempts',
                   'development_template_application_snapshots','development_template_application_lineage');
select 'LEDGER_RLS_FINGERPRINT=' || md5(coalesce(string_agg(c.relname||'='||c.relrowsecurity::text||'/'||c.relforcerowsecurity::text,';' order by c.relname),''))
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
 and c.relname in ('development_template_applications','development_template_application_attempts',
                   'development_template_application_snapshots','development_template_application_lineage');
select 'DEVELOPMENT_POLICY_FINGERPRINT=' || md5(coalesce(string_agg(tablename||':'||policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,''),';' order by tablename,policyname),''))
 from pg_policies where schemaname='public' and tablename like 'development_%';
select 'DEVELOPMENT_RLS_FINGERPRINT=' || md5(coalesce(string_agg(c.relname||'='||c.relrowsecurity::text||'/'||c.relforcerowsecurity::text,';' order by c.relname),''))
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in
 ('development_plans','development_goals','development_actions','development_templates','development_template_goals','development_template_actions',
  'development_template_versions','development_template_version_goals','development_template_version_actions');
select 'DEVELOPMENT_ACL_FINGERPRINT=' || md5(coalesce(string_agg(c.relname||'='||coalesce(c.relacl::text,'<default>'),';' order by c.relname),''))
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'development_%' and c.relkind in ('r','p');

-- Retention: 0126's four-ledger contract is frozen and 0133 is function-only.
select 'RETENTION_PRESENT=' || (to_regprocedure('public.get_company_retention_pressure_v1(uuid)') is not null)::text;
select 'RETENTION_BODY_FINGERPRINT=' || md5(pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure));
select 'RETENTION_FOUR_RELATIONS=' || (
 (pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_applications%')::int+
 (pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_application_attempts%')::int+
 (pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_application_snapshots%')::int+
 (pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_application_lineage%')::int);
SQL
