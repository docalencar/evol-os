#!/usr/bin/env bash
# Read-only POST verifier for the D-R1 Review promotion (0130-0132).
set -uo pipefail
: "${DB_HOST:?DB_HOST is required}"; : "${DB_PORT:?DB_PORT is required}"
: "${DB_USER:?DB_USER is required}"; : "${DB_NAME:?DB_NAME is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
export PGPASSWORD PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}"

OUT=$(mktemp -t dr1post.XXXXXX); SQL=$(mktemp -t dr1postsql.XXXXXX)
trap 'rm -f "$OUT" "$SQL"' EXIT
psql_cmd=(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --no-psqlrc -At)
"${psql_cmd[@]}" >"$OUT" <<'SQL'
set default_transaction_read_only = on;
select 'MIGRATION_0130_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0130%';
select 'MIGRATION_0131_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0131%';
select 'MIGRATION_0132_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0132%';
select 'MIGRATIONS_AFTER_0132=' || count(*) from supabase_migrations.schema_migrations where version > '0132';
select 'NEW_TABLE_COUNT=' || count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('development_reviews','development_private_audit');
select 'NEW_TABLE_RLS_COUNT=' || count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('development_reviews','development_private_audit') and c.relrowsecurity;
select 'NEW_TABLE_CLIENT_PRIVILEGES=' || count(*) from unnest(array['anon','authenticated']) r, unnest(array['development_reviews','development_private_audit']) t, unnest(array['select','insert','update','delete','truncate','references','trigger','maintain']) p where has_table_privilege(r,'public.'||t,p);
select 'CORE_TABLE_CLIENT_PRIVILEGES=' || count(*) from unnest(array['anon','authenticated']) r, unnest(array['development_plans','development_goals','development_actions']) t, unnest(array['select','insert','update','delete','truncate','references','trigger','maintain']) p where has_table_privilege(r,'public.'||t,p);
select 'TEMPLATE_TABLE_CLIENT_PRIVILEGES=' || count(*) from unnest(array['anon','authenticated']) r, unnest(array['development_templates','development_template_goals','development_template_actions','development_template_versions','development_template_version_goals','development_template_version_actions']) t, unnest(array['select','insert','update','delete','truncate','references','trigger','maintain']) p where has_table_privilege(r,'public.'||t,p);
select 'EXPECTED_SIGNATURES=' || count(*) from unnest(array[
 'public.get_authorized_development_plans_v1(uuid,uuid)','public.get_authorized_development_goals_v1(uuid,uuid)','public.get_authorized_development_actions_v1(uuid,uuid)','public.get_authorized_development_reviews_v1(uuid,uuid)',
 'public.create_development_plan_v1(uuid,uuid,text,text,text,date,date,uuid)','public.update_development_plan_v1(uuid,bigint,text,text,text,date,date)','public.add_development_plan_goal_v1(uuid,uuid,text,text,integer,integer,integer)','public.add_development_goal_action_v1(uuid,text,text,text,date)',
 'public.reassign_development_plan_owner_v1(uuid,uuid,bigint)','public.activate_development_plan_v1(uuid,bigint)','public.cancel_development_plan_v1(uuid,bigint,text)','public.complete_development_plan_v1(uuid,bigint)','public.start_development_action_v1(uuid)','public.complete_development_action_v1(uuid)','public.skip_development_action_v1(uuid,text)','public.record_development_review_v1(uuid,text,text,text,uuid)',
 'public.get_published_development_template_catalog_v1(uuid)','public.get_development_template_authoring_v1(uuid)','public.create_development_template_draft_v1(uuid,text,text,integer,uuid)','public.add_development_template_goal_v1(uuid,uuid,text,integer,integer)','public.add_development_template_action_v1(uuid,text,text,text,integer,integer)','public.publish_development_template_version_v1(uuid,bigint)','public.obsolete_development_template_version_v1(uuid)',
 'public.can_apply_development_template_v1(uuid,uuid,uuid,uuid)','public.can_read_development_template_version_v1(uuid,uuid)','public.get_development_template_version_v1(uuid,uuid)','public.get_development_template_version_goals_v1(uuid,uuid)','public.get_development_template_version_actions_v1(uuid,uuid)',
 'public.reserve_development_template_application_v1(jsonb)','public.complete_development_template_application_v1(jsonb,uuid)','public.fail_development_template_application_v1(uuid,uuid,uuid,text,text)']) s(sig) where to_regprocedure(sig) is not null;
select 'SECURITY_DEFINER_COUNT=' || count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
 'get_authorized_development_plans_v1','get_authorized_development_goals_v1','get_authorized_development_actions_v1','get_authorized_development_reviews_v1','create_development_plan_v1','update_development_plan_v1','add_development_plan_goal_v1','add_development_goal_action_v1','reassign_development_plan_owner_v1','activate_development_plan_v1','cancel_development_plan_v1','complete_development_plan_v1','start_development_action_v1','complete_development_action_v1','skip_development_action_v1','record_development_review_v1',
 'get_published_development_template_catalog_v1','get_development_template_authoring_v1','create_development_template_draft_v1','add_development_template_goal_v1','add_development_template_action_v1','publish_development_template_version_v1','obsolete_development_template_version_v1','can_apply_development_template_v1','can_read_development_template_version_v1','get_development_template_version_v1','get_development_template_version_goals_v1','get_development_template_version_actions_v1','reserve_development_template_application_v1','complete_development_template_application_v1','fail_development_template_application_v1') and p.prosecdef;
select 'FIXED_SEARCH_PATH_COUNT=' || count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
 'get_authorized_development_plans_v1','get_authorized_development_goals_v1','get_authorized_development_actions_v1','get_authorized_development_reviews_v1','create_development_plan_v1','update_development_plan_v1','add_development_plan_goal_v1','add_development_goal_action_v1','reassign_development_plan_owner_v1','activate_development_plan_v1','cancel_development_plan_v1','complete_development_plan_v1','start_development_action_v1','complete_development_action_v1','skip_development_action_v1','record_development_review_v1',
 'get_published_development_template_catalog_v1','get_development_template_authoring_v1','create_development_template_draft_v1','add_development_template_goal_v1','add_development_template_action_v1','publish_development_template_version_v1','obsolete_development_template_version_v1','can_apply_development_template_v1','can_read_development_template_version_v1','get_development_template_version_v1','get_development_template_version_goals_v1','get_development_template_version_actions_v1','reserve_development_template_application_v1','complete_development_template_application_v1','fail_development_template_application_v1') and p.proconfig @> array['search_path=public, pg_temp'];
select 'EXPECTED_FUNCTION_OWNER_COUNT=' || count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
 'get_authorized_development_plans_v1','get_authorized_development_goals_v1','get_authorized_development_actions_v1','get_authorized_development_reviews_v1','create_development_plan_v1','update_development_plan_v1','add_development_plan_goal_v1','add_development_goal_action_v1','reassign_development_plan_owner_v1','activate_development_plan_v1','cancel_development_plan_v1','complete_development_plan_v1','start_development_action_v1','complete_development_action_v1','skip_development_action_v1','record_development_review_v1',
 'get_published_development_template_catalog_v1','get_development_template_authoring_v1','create_development_template_draft_v1','add_development_template_goal_v1','add_development_template_action_v1','publish_development_template_version_v1','obsolete_development_template_version_v1','can_apply_development_template_v1','can_read_development_template_version_v1','get_development_template_version_v1','get_development_template_version_goals_v1','get_development_template_version_actions_v1','reserve_development_template_application_v1','complete_development_template_application_v1','fail_development_template_application_v1') and pg_get_userbyid(p.proowner)=current_user;
select 'INTERNAL_READER_GRANTS=' || count(*) from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where p.oid='public.can_read_development_template_version_v1(uuid,uuid)'::regprocedure and a.privilege_type='EXECUTE' and (a.grantee=0 or a.grantee in ('anon'::regrole,'authenticated'::regrole,'service_role'::regrole));
select 'EXTERNAL_READER_AUTH_GRANTS=' || count(*) from unnest(array['public.get_development_template_version_v1(uuid,uuid)','public.get_development_template_version_goals_v1(uuid,uuid)','public.get_development_template_version_actions_v1(uuid,uuid)']) s(sig) where has_function_privilege('authenticated',sig,'execute');
select 'EXTERNAL_READER_OTHER_GRANTS=' || count(*) from unnest(array['public.get_development_template_version_v1(uuid,uuid)','public.get_development_template_version_goals_v1(uuid,uuid)','public.get_development_template_version_actions_v1(uuid,uuid)']) s(sig) join pg_proc p on p.oid=to_regprocedure(sig) cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.privilege_type='EXECUTE' and (a.grantee=0 or a.grantee in ('anon'::regrole,'service_role'::regrole));
select 'POLICY_FINGERPRINT=' || md5(coalesce(string_agg(tablename||':'||policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,''),';' order by tablename,policyname),'')) from pg_policies where schemaname='public' and tablename like 'development_%';
select 'RLS_FINGERPRINT=' || md5(coalesce(string_agg(c.relname||'='||c.relrowsecurity::text||'/'||c.relforcerowsecurity::text,';' order by c.relname),'')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('development_plans','development_goals','development_actions','development_templates','development_template_goals','development_template_actions','development_template_versions','development_template_version_goals','development_template_version_actions');
select 'RETENTION_BODY_FINGERPRINT=' || md5(pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure));
select 'RETENTION_FOUR_RELATIONS=' || ((pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_applications%')::int+(pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_application_attempts%')::int+(pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_application_snapshots%')::int+(pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_application_lineage%')::int);
select 'RETAINED_EVIDENCE_TRIGGERS=' || count(*) from pg_trigger where not tgisinternal and tgrelid in ('public.development_reviews'::regclass,'public.development_private_audit'::regclass) and tgname in ('protect_development_reviews_append_only','protect_development_private_audit_append_only');
SQL
cat "$OUT"
val(){ grep -m1 "^$1=" "$OUT" | cut -d= -f2-; }
FAIL=0
expect(){ if [ "$(val "$1")" != "$2" ]; then printf 'FAIL %s expected=%s actual=%s\n' "$1" "$2" "$(val "$1")"; FAIL=1; fi; }
expect MIGRATION_0130_COUNT 1; expect MIGRATION_0131_COUNT 1; expect MIGRATION_0132_COUNT 1; expect MIGRATIONS_AFTER_0132 0
expect NEW_TABLE_COUNT 2; expect NEW_TABLE_RLS_COUNT 2; expect NEW_TABLE_CLIENT_PRIVILEGES 0
expect CORE_TABLE_CLIENT_PRIVILEGES 0; expect TEMPLATE_TABLE_CLIENT_PRIVILEGES 0
expect EXPECTED_SIGNATURES 31; expect SECURITY_DEFINER_COUNT 31; expect FIXED_SEARCH_PATH_COUNT 31; expect EXPECTED_FUNCTION_OWNER_COUNT 31
expect INTERNAL_READER_GRANTS 0; expect EXTERNAL_READER_AUTH_GRANTS 3; expect EXTERNAL_READER_OTHER_GRANTS 0
expect RETENTION_FOUR_RELATIONS 4; expect RETAINED_EVIDENCE_TRIGGERS 2
if [ -n "${PRE_POLICY_FINGERPRINT:-}" ] && [ "$(val POLICY_FINGERPRINT)" != "$PRE_POLICY_FINGERPRINT" ]; then printf 'FAIL policy fingerprint changed\n'; FAIL=1; fi
if [ -n "${PRE_RLS_FINGERPRINT:-}" ] && [ "$(val RLS_FINGERPRINT)" != "$PRE_RLS_FINGERPRINT" ]; then printf 'FAIL RLS fingerprint changed\n'; FAIL=1; fi
if [ -n "${PRE_RETENTION_FINGERPRINT:-}" ] && [ "$(val RETENTION_BODY_FINGERPRINT)" != "$PRE_RETENTION_FINGERPRINT" ]; then printf 'FAIL retention function changed\n'; FAIL=1; fi

# Behavioral privilege probes. No business rows are read and no write occurs.
for role in anon authenticated; do
  if "${psql_cmd[@]}" -c "set default_transaction_read_only=on; set role $role; select * from public.development_plans limit 0" >/dev/null 2>"$SQL"; then
    printf 'FAIL %s direct protected-table read unexpectedly succeeded\n' "$role"; FAIL=1
  elif ! grep -Fq 'permission denied for table development_plans' "$SQL"; then
    printf 'FAIL %s denial was not the expected table privilege boundary\n' "$role"; FAIL=1
  else upper_role=$(printf '%s' "$role" | tr '[:lower:]' '[:upper:]'); printf '%s_DIRECT_DEVELOPMENT_PLANS=DENIED\n' "$upper_role"; fi
done
if "${psql_cmd[@]}" -c "set default_transaction_read_only=on; set role anon; select * from public.get_development_template_version_v1(null,null)" >/dev/null 2>"$SQL"; then
  printf 'FAIL anon protected RPC unexpectedly callable\n'; FAIL=1
elif ! grep -Fq 'permission denied for function get_development_template_version_v1' "$SQL"; then printf 'FAIL anon RPC denial was not the expected function privilege boundary\n'; FAIL=1
else printf 'ANON_PROTECTED_RPC=DENIED\n'; fi
[ "$FAIL" -eq 0 ] || { printf 'D_R1_POST=FAIL\n'; exit 1; }
printf 'D_R1_POST=PASS\n'
