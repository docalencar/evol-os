#!/usr/bin/env bash
# Read-only POST verifier for the D-R2 Review promotion (migration 0133).
#
# It proves that 0133 is applied EXACTLY: the function exists once, with the
# canonical signature, security properties, owner, grants and return columns —
# and that nothing else moved. Properties are read from the catalog rather than
# matched in text wherever the catalog can answer.
#
# Two defects from earlier promotions are pinned by construction here:
#   * `provolatile` is "char" and has no unambiguous `||` with text, so every
#     concatenation of it is cast explicitly;
#   * an overload probe that aggregates every function of the name reports the
#     approved signature back as an unexpected overload, so the canonical one is
#     excluded from that probe.
set -uo pipefail
: "${DB_HOST:?DB_HOST is required}"; : "${DB_PORT:?DB_PORT is required}"
: "${DB_USER:?DB_USER is required}"; : "${DB_NAME:?DB_NAME is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
export PGPASSWORD PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}"

OUT=$(mktemp -t dr2post.XXXXXX); ERR=$(mktemp -t dr2posterr.XXXXXX)
trap 'rm -f "$OUT" "$ERR"' EXIT
psql_cmd=(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --no-psqlrc -At)

# A query that did not run is never a pass: the guard below declares FAIL rather
# than falling through into assertions over an empty output file.
if ! "${psql_cmd[@]}" >"$OUT" 2>"$ERR" <<'SQL'
set default_transaction_read_only = on;

select 'MIGRATION_0133_COUNT=' || count(*) from supabase_migrations.schema_migrations where version like '0133%';
select 'MIGRATIONS_AFTER_0133=' || count(*) from supabase_migrations.schema_migrations where version > '0133';

-- Exactly one function of this name, and it is the canonical signature.
select 'ORIGIN_NAMECOUNT=' || count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='get_authorized_development_plan_origins_v1';
select 'ORIGIN_SIGNATURE_PRESENT=' || (to_regprocedure('public.get_authorized_development_plan_origins_v1(uuid,uuid)') is not null)::text;
-- Overload probe, excluding the signature it approves.
select 'ORIGIN_ALTERNATE_SIGNATURES=' || count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='get_authorized_development_plan_origins_v1'
 and p.oid is distinct from to_regprocedure('public.get_authorized_development_plan_origins_v1(uuid,uuid)');

-- Security properties, read from the catalog. provolatile is "char": cast it.
select 'ORIGIN_SECURITY_DEFINER=' || p.prosecdef::text from pg_proc p
 where p.oid='public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure;
select 'ORIGIN_VOLATILITY=' || p.provolatile::text from pg_proc p
 where p.oid='public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure;
select 'ORIGIN_SEARCH_PATH_FIXED=' || (p.proconfig @> array['search_path=public, pg_temp'])::text from pg_proc p
 where p.oid='public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure;
select 'ORIGIN_OWNER_IS_CURRENT=' || (pg_get_userbyid(p.proowner) = current_user)::text from pg_proc p
 where p.oid='public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure;

-- Exact return shape. The projection IS the privacy boundary: an extra column
-- would widen it silently, so the whole TABLE(...) text is compared.
select 'ORIGIN_RESULT=' || pg_get_function_result('public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure);
select 'ORIGIN_ARGUMENTS=' || pg_get_function_arguments('public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure);

-- Grants: authenticated only. PUBLIC (grantee 0), anon and service_role must hold nothing.
select 'ORIGIN_AUTHENTICATED_EXECUTE=' || has_function_privilege('authenticated','public.get_authorized_development_plan_origins_v1(uuid,uuid)','execute')::text;
select 'ORIGIN_FORBIDDEN_EXECUTE_GRANTS=' || count(*) from pg_proc p
 cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
 where p.oid='public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure
 and a.privilege_type='EXECUTE' and (a.grantee=0 or a.grantee in ('anon'::regrole,'service_role'::regrole));

-- The function must not have acquired a dependency on a template table. 0133
-- reads plans, lineage and snapshots only.
select 'ORIGIN_TEMPLATE_TABLE_REFERENCES=' || (
 (pg_get_functiondef('public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure) like '%development_template_versions%')::int+
 (pg_get_functiondef('public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure) like '%development_templates%')::int);

-- D-DB1 remains healthy and is what this function authorizes through.
select 'PLAN_READ_PREDICATE_PRESENT=' || (to_regprocedure('public.can_read_development_plan_v1(uuid)') is not null)::text;
select 'PLANS_READER_PRESENT=' || (to_regprocedure('public.get_authorized_development_plans_v1(uuid,uuid)') is not null)::text;
select 'CORE_TABLE_CLIENT_PRIVILEGES=' || count(*) from unnest(array['anon','authenticated']) r,
 unnest(array['development_plans','development_goals','development_actions']) t,
 unnest(array['select','insert','update','delete','truncate','references','trigger','maintain']) p
 where has_table_privilege(r,'public.'||t,p);
select 'TEMPLATE_TABLE_CLIENT_PRIVILEGES=' || count(*) from unnest(array['anon','authenticated']) r,
 unnest(array['development_templates','development_template_goals','development_template_actions','development_template_versions','development_template_version_goals','development_template_version_actions']) t,
 unnest(array['select','insert','update','delete','truncate','references','trigger','maintain']) p
 where has_table_privilege(r,'public.'||t,p);

-- Fingerprints, compared against PRE by the runner. 0133 changes no table ACL,
-- no RLS and no policy, so every one of these must be byte-identical.
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

select 'RETENTION_BODY_FINGERPRINT=' || md5(pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure));
select 'RETENTION_FOUR_RELATIONS=' || (
 (pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_applications%')::int+
 (pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_application_attempts%')::int+
 (pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_application_snapshots%')::int+
 (pg_get_functiondef('public.get_company_retention_pressure_v1(uuid)'::regprocedure) like '%development_template_application_lineage%')::int);
SQL
then
  printf 'FAIL POST state query did not run\n'
  printf 'D_R2_POST=FAIL\n'
  exit 1
fi
cat "$OUT"

val(){ grep -m1 "^$1=" "$OUT" | cut -d= -f2-; }
FAIL=0
expect(){ if [ "$(val "$1")" != "$2" ]; then printf 'FAIL %s expected=%s actual=%s\n' "$1" "$2" "$(val "$1")"; FAIL=1; fi; }

expect MIGRATION_0133_COUNT 1
expect MIGRATIONS_AFTER_0133 0
expect ORIGIN_NAMECOUNT 1
expect ORIGIN_SIGNATURE_PRESENT true
expect ORIGIN_ALTERNATE_SIGNATURES 0
expect ORIGIN_SECURITY_DEFINER true
expect ORIGIN_VOLATILITY s
expect ORIGIN_SEARCH_PATH_FIXED true
expect ORIGIN_OWNER_IS_CURRENT true
expect ORIGIN_RESULT 'TABLE(plan_id uuid, template_id uuid, template_version_id uuid, template_name text, template_version_number integer)'
expect ORIGIN_ARGUMENTS 'p_company_id uuid, p_plan_id uuid DEFAULT NULL::uuid'
expect ORIGIN_AUTHENTICATED_EXECUTE true
expect ORIGIN_FORBIDDEN_EXECUTE_GRANTS 0
expect ORIGIN_TEMPLATE_TABLE_REFERENCES 0
expect PLAN_READ_PREDICATE_PRESENT true
expect PLANS_READER_PRESENT true
expect CORE_TABLE_CLIENT_PRIVILEGES 0
expect TEMPLATE_TABLE_CLIENT_PRIVILEGES 0
expect RETENTION_FOUR_RELATIONS 4

# Nothing outside the function may have moved. The pre-existing tenant-wide
# ledger visibility is deliberately included: D-R2 must leave it exactly as found,
# neither widened nor repaired. Repair belongs to its own adjudicated slice.
fingerprint_unchanged(){
  local key=$1 pre=$2
  if [ -n "$pre" ] && [ "$(val "$key")" != "$pre" ]; then
    printf 'FAIL %s changed across the promotion\n' "$key"; FAIL=1
  fi
}
fingerprint_unchanged LEDGER_ACL_FINGERPRINT         "${PRE_LEDGER_ACL_FINGERPRINT:-}"
fingerprint_unchanged LEDGER_RLS_FINGERPRINT         "${PRE_LEDGER_RLS_FINGERPRINT:-}"
fingerprint_unchanged DEVELOPMENT_POLICY_FINGERPRINT "${PRE_POLICY_FINGERPRINT:-}"
fingerprint_unchanged DEVELOPMENT_RLS_FINGERPRINT    "${PRE_RLS_FINGERPRINT:-}"
fingerprint_unchanged DEVELOPMENT_ACL_FINGERPRINT    "${PRE_ACL_FINGERPRINT:-}"
fingerprint_unchanged RETENTION_BODY_FINGERPRINT     "${PRE_RETENTION_FINGERPRINT:-}"

# Behavioral probes. No business row is read and nothing is written: the function
# is called with a null tenant, which the boundary refuses before it reads anything.
if "${psql_cmd[@]}" -c "set default_transaction_read_only=on; set role anon; select * from public.get_authorized_development_plan_origins_v1(null,null)" >/dev/null 2>"$ERR"; then
  printf 'FAIL anon origin RPC unexpectedly callable\n'; FAIL=1
elif ! grep -Fq 'permission denied for function get_authorized_development_plan_origins_v1' "$ERR"; then
  printf 'FAIL anon denial was not the expected function privilege boundary\n'; FAIL=1
else
  printf 'ANON_ORIGIN_RPC=DENIED\n'
fi

# authenticated MAY execute, and with no session identity the boundary refuses on
# its own terms rather than leaking rows: AUTHENTICATION_REQUIRED, not a privilege error.
if "${psql_cmd[@]}" -c "set default_transaction_read_only=on; set role authenticated; select * from public.get_authorized_development_plan_origins_v1(null,null)" >/dev/null 2>"$ERR"; then
  printf 'FAIL identityless authenticated call unexpectedly returned\n'; FAIL=1
elif ! grep -Fq 'AUTHENTICATION_REQUIRED' "$ERR"; then
  printf 'FAIL authenticated refusal was not the boundary contract\n'; FAIL=1
else
  printf 'AUTHENTICATED_ORIGIN_RPC=AUTHENTICATION_REQUIRED\n'
fi

[ "$FAIL" -eq 0 ] || { printf 'D_R2_POST=FAIL\n'; exit 1; }
printf 'D_R2_POST=PASS\n'
