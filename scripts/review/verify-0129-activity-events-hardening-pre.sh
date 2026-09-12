#!/usr/bin/env bash
# Read-only structural inventory for the 0129 activity_events privilege boundary.
set -uo pipefail
: "${DB_HOST:=127.0.0.1}"
: "${DB_PORT:=54322}"
: "${DB_USER:=postgres}"
: "${DB_NAME:=postgres}"
: "${PGPASSWORD:=postgres}"
export PGPASSWORD
Q=$(mktemp -t evol0129pre.XXXXXX)
trap 'rm -f "$Q"' EXIT
cat >"$Q" <<'SQL'
set default_transaction_read_only = on;
select 'MIGRATION_0128_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0128%';
select 'MIGRATION_0129_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0129%';
select 'ACTIVITY_RELACL=' || coalesce(relacl::text,'<null>') from pg_class where oid='public.activity_events'::regclass;
select 'ACTIVITY_ACL_FINGERPRINT=' || md5(coalesce(relacl::text,'<null>')) from pg_class where oid='public.activity_events'::regclass;
select 'ACTIVITY_SELECT_PUBLIC=' || exists(select 1 from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where c.oid='public.activity_events'::regclass and a.grantee=0 and a.privilege_type='SELECT');
select 'ACTIVITY_SELECT_ANON=' || has_table_privilege('anon','public.activity_events','select');
select 'ACTIVITY_SELECT_AUTHENTICATED=' || has_table_privilege('authenticated','public.activity_events','select');
select 'ACTIVITY_CLIENT_PRIVILEGES=' || count(*) from unnest(array['anon','authenticated']) r,unnest(array['select','insert','update','delete','truncate','references','trigger','maintain']) p where has_table_privilege(r,'public.activity_events',p);
select 'ACTIVITY_SERVICE_PRIVILEGES=' || count(*) from unnest(array['select','insert','update','delete','truncate','references','trigger','maintain']) p where has_table_privilege('service_role','public.activity_events',p);
select 'ACTIVITY_POLICY_COUNT=' || count(*) from pg_policies where schemaname='public' and tablename='activity_events';
select 'ACTIVITY_POLICY_FINGERPRINT=' || md5(coalesce(string_agg(policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,''),';' order by policyname),'')) from pg_policies where schemaname='public' and tablename='activity_events';
select 'ACTIVITY_RLS_ENABLED=' || relrowsecurity from pg_class where oid='public.activity_events'::regclass;
select 'TIMELINE_FILTERS_COMPANY=' || (pg_get_functiondef('public.get_tenant_activity_timeline_v1(uuid,integer)'::regprocedure) like '%visibility=''company''%');
select 'TIMELINE_SECURITY_DEFINER=' || prosecdef from pg_proc where oid='public.get_tenant_activity_timeline_v1(uuid,integer)'::regprocedure;
select 'TIMELINE_EXECUTE_AUTHENTICATED=' || has_function_privilege('authenticated','public.get_tenant_activity_timeline_v1(uuid,integer)','execute');
select 'ENTITY_TIMELINE_STILL_PRESENT=' || (to_regprocedure('public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)') is not null);
select 'BRIDGE_PRESENT=' || exists(select 1 from pg_attribute where attrelid='public.feedback_threads'::regclass and attname='assessment_response_id' and not attisdropped);
select 'COMPOSITE_FKS_VALIDATED=' || count(*) from pg_constraint where connamespace='public'::regnamespace and contype='f' and convalidated and conname in ('feedback_threads_assessment_response_company_fkey','feedback_threads_sender_company_fkey','feedback_threads_receiver_company_fkey','feedback_messages_thread_company_fkey','feedback_messages_author_company_fkey','feedback_acknowledgements_thread_company_fkey','feedback_acknowledgements_employee_company_fkey');
select 'RPC_EXACT_SIGNATURES=' || ((to_regprocedure('public.create_assessment_feedback_v1(uuid,text)') is not null)::int+(to_regprocedure('public.reply_feedback_v1(uuid,text)') is not null)::int+(to_regprocedure('public.acknowledge_feedback_v1(uuid)') is not null)::int+(to_regprocedure('public.close_feedback_v1(uuid)') is not null)::int+(to_regprocedure('public.archive_feedback_v1(uuid)') is not null)::int);
select 'FEEDBACK_WRITE_PRIVILEGES=' || count(*) from unnest(array['anon','authenticated']) r,unnest(array['feedback_threads','feedback_messages','feedback_acknowledgements','feedback_attachments','feedback_mentions']) t,unnest(array['insert','update','delete']) p where has_table_privilege(r,'public.'||t,p);
select 'FEEDBACK_WRITE_POLICIES=' || count(*) from pg_policies where schemaname='public' and tablename in ('feedback_threads','feedback_messages','feedback_acknowledgements','feedback_attachments','feedback_mentions') and cmd in ('INSERT','UPDATE','DELETE','ALL');
SQL
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 --no-psqlrc -At </dev/null -f "$Q"
