#!/usr/bin/env bash
# Read-only PRE/POST inventory for T-DB2 Review promotion (migration 0142).
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
select 'MIGRATION_0140_COUNT='||count(*) from supabase_migrations.schema_migrations where version like '0140%';
select 'MIGRATION_0141_COUNT='||count(*) from supabase_migrations.schema_migrations where version like '0141%';
select 'MIGRATION_0142_COUNT='||count(*) from supabase_migrations.schema_migrations where version like '0142%';
select 'MIGRATIONS_AFTER_0141='||count(*) from supabase_migrations.schema_migrations where version>'0141';
select 'MIGRATIONS_AFTER_0142='||count(*) from supabase_migrations.schema_migrations where version>'0142';
select 'TURNOVER_TABLE_COUNT='||(to_regclass('public.company_turnover_monthly_facts') is not null)::integer;
select 'TURNOVER_NAME_COUNT='||count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('ensure_company_turnover_period_v1','capture_company_turnover_people_delta_v1','get_company_turnover_v1');
select 'TURNOVER_EXACT_FUNCTION_COUNT='||count(*) from pg_proc where oid in (to_regprocedure('public.ensure_company_turnover_period_v1(uuid,timestamp with time zone)'),to_regprocedure('public.capture_company_turnover_people_delta_v1()'),to_regprocedure('public.get_company_turnover_v1(uuid,text)'));
select 'TURNOVER_TRIGGER_COUNT='||count(*) from pg_trigger where tgrelid='public.people'::regclass and tgname='capture_company_turnover_people_delta_v1' and not tgisinternal;
select 'PEOPLE_RLS='||c.relrowsecurity::text from pg_class c where c.oid='public.people'::regclass;
select 'PEOPLE_POLICY_FINGERPRINT='||coalesce(md5(string_agg(policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,''),';' order by policyname)),'EMPTY') from pg_policies where schemaname='public' and tablename='people';
select 'PEOPLE_ACL_FINGERPRINT='||md5(coalesce(c.relacl::text,'')) from pg_class c where c.oid='public.people'::regclass;
select 'PEOPLE_CLIENT_DML_COUNT='||count(*) from unnest(array['public','anon','authenticated']) r, unnest(array['select','insert','update','delete','truncate','references','trigger','maintain']) p where has_table_privilege(r,'public.people',p);
select 'ADMIN_AUDIT_FINGERPRINT='||md5(pg_get_functiondef('public.audit_secure_administrative_read(uuid,text,text,uuid,text,text)'::regprocedure)||coalesce((select proacl::text from pg_proc where oid='public.audit_secure_administrative_read(uuid,text,text,uuid,text,text)'::regprocedure),''));
select 'TURNOVER_TABLE_RLS='||coalesce((select relrowsecurity::text from pg_class where oid=to_regclass('public.company_turnover_monthly_facts')),'absent');
select 'TURNOVER_TABLE_ROWS='||case when to_regclass('public.company_turnover_monthly_facts') is null then '-1' else coalesce((xpath('/row/count/text()',query_to_xml('select count(*) as count from public.company_turnover_monthly_facts',false,true,'')))[1]::text,'-1') end;
select 'TURNOVER_CLIENT_TABLE_PRIV_COUNT='||case when to_regclass('public.company_turnover_monthly_facts') is null then '-1' else (select count(*)::text from unnest(array['public','anon','authenticated','service_role']) r, unnest(array['select','insert','update','delete','truncate','references','trigger','maintain']) p where has_table_privilege(r,'public.company_turnover_monthly_facts',p)) end;
select 'TURNOVER_CONSTRAINTS='||coalesce((select string_agg(conname,',' order by conname) from pg_constraint where conrelid=to_regclass('public.company_turnover_monthly_facts')),'');
select 'TURNOVER_SECURITY_DEFINER_COUNT='||count(*) from pg_proc where oid in (to_regprocedure('public.ensure_company_turnover_period_v1(uuid,timestamp with time zone)'),to_regprocedure('public.capture_company_turnover_people_delta_v1()'),to_regprocedure('public.get_company_turnover_v1(uuid,text)')) and prosecdef;
select 'TURNOVER_FIXED_SEARCH_PATH_COUNT='||count(*) from pg_proc where oid in (to_regprocedure('public.ensure_company_turnover_period_v1(uuid,timestamp with time zone)'),to_regprocedure('public.capture_company_turnover_people_delta_v1()'),to_regprocedure('public.get_company_turnover_v1(uuid,text)')) and proconfig @> array['search_path=public, pg_temp'];
select 'TURNOVER_AUTH_EXECUTE='||case when to_regprocedure('public.get_company_turnover_v1(uuid,text)') is null then '-1' else has_function_privilege('authenticated','public.get_company_turnover_v1(uuid,text)','execute')::integer::text end;
select 'TURNOVER_FORBIDDEN_EXECUTE_COUNT='||case when to_regprocedure('public.get_company_turnover_v1(uuid,text)') is null then '-1' else (select count(*)::text from unnest(array['public','anon','service_role']) r where has_function_privilege(r,'public.get_company_turnover_v1(uuid,text)','execute')) end;
select 'TURNOVER_HELPER_CLIENT_EXECUTE_COUNT='||case when to_regprocedure('public.ensure_company_turnover_period_v1(uuid,timestamp with time zone)') is null then '-1' else (select count(*)::text from unnest(array['public','anon','authenticated','service_role']) r, unnest(array['public.ensure_company_turnover_period_v1(uuid,timestamp with time zone)','public.capture_company_turnover_people_delta_v1()']) f where has_function_privilege(r,f,'execute')) end;
select 'TURNOVER_RPC_RESULT='||coalesce(pg_get_function_result(to_regprocedure('public.get_company_turnover_v1(uuid,text)')),'absent');
select 'TURNOVER_RPC_SOURCE_FINGERPRINT='||coalesce(md5(pg_get_functiondef(to_regprocedure('public.get_company_turnover_v1(uuid,text)'))),'absent');
select 'TURNOVER_TRIGGER_SOURCE_FINGERPRINT='||coalesce(md5(pg_get_functiondef(to_regprocedure('public.capture_company_turnover_people_delta_v1()'))),'absent');
SQL
