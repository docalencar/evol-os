#!/usr/bin/env bash
#
# READ-ONLY post-promotion verification for migration 0127 — Assessment snapshot
# counts-only retention boundary.
#
#   bash scripts/review/verify-0127-assessment-snapshot-pressure-post.sh
#
# WHY THIS IS A SEPARATE FILE
#
# 0127 is already applied to Canonical Review, exactly once. Everything that
# remains is checking. Re-entering the promotion runner to do that would mean
# walking a script whose whole purpose is to reach `supabase db push`, guarded
# only by branching — and the one guarantee worth having here is structural, not
# conditional. This file contains no `supabase` invocation of any kind, no DDL
# and no DML, so there is no code path from it to a mutation, reachable or not.
#
# The database enforces the same thing independently: every SQL file this script
# runs opens with `set default_transaction_read_only = on`, so a write would be
# refused by Postgres even if one were somehow introduced here.
#
# WHY THIS IS A FILE AND NOT A PASTED BLOCK
#
# Pasted multi-line control flow can execute against the operator's own shell —
# two Terminal sessions were lost that way. This runs as its OWN PROCESS. Never
# source it, never `. ` it, never eval it, never paste its body.
#
# WHAT IT PROVES
#
# That the state Review reached is the state that was reviewed: the migration
# recorded exactly once, the function present with exactly the approved
# signature and no overload, SECURITY DEFINER, STABLE, empty search_path, the
# expected owner, EXECUTE granted to service_role alone, and — the point of the
# whole boundary — still no direct SELECT on the three snapshot tables for any
# role. Then it calls the function as service_role to prove it answers for three
# relations and leaks nothing, and checks that the 0126 companion is undisturbed.
#
# The secret is a bare database password in the macOS Keychain. It is read into
# an environment variable, never printed, never persisted, never in argv.

set -uo pipefail   # NOT -e: every failure is handled explicitly and fails closed.

# Content hashes survive a merge, so they are pinned. The commit below does NOT
# contain this file, which is what makes naming it non-circular.
APPROVED_MIGRATION_SHA="d2dabd5e6323c75bf6ac3d1c05fdf0db5a814628b0cef2ca73996e83e8d3e2ce"
APPROVED_PGTAP_SHA="c2ea2263985e410af3f0a61cacbafb49123225aeb3d46fe8cd22bd3ecfafed2e"
APPROVED_IMPLEMENTATION_COMMIT="0a642f2b0e015a25abe33ed4f87fd626ac5bd849"

MIGRATION_FILE="supabase/migrations/0127_create_assessment_snapshot_retention_pressure_boundary.sql"
PGTAP_FILE="supabase/tests/assessment_snapshot_retention_pressure_boundary.test.sql"

# Security baseline as MEASURED on Review immediately after the promotion. These
# are facts, not guesses, and pinning them turns this script into a regression
# detector: a later run that finds a different ACL or RLS shape has found a
# change nobody recorded.
EXPECTED_ACL="5bd4acef00c520a4a1a8328d0da3bf8b"
EXPECTED_RLS="a7d980542be7ff5b036ef94776ac5563"
EXPECTED_POLICY="<none>"

REVIEW_REF="rwfvxvbzaosgcyfxdjpt"
DB_HOST="db.${REVIEW_REF}.supabase.co"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="postgres"

KEYCHAIN_SERVICE="evol-os-review-db"

LOG=$(mktemp -t evol0127vlog.XXXXXX)
Q1=$(mktemp -t evol0127vstate.XXXXXX)
Q2=$(mktemp -t evol0127vcontract.XXXXXX)

FAILURES=0
say() { printf '%s\n' "$*"; }
bad() { say "  FAIL: $*"; FAILURES=$((FAILURES + 1)); }
evidence() { say "Evidence: LOG=$LOG STATE=$Q1 CONTRACT=$Q2"; }

say "[verify-0127] READ-ONLY. This script cannot apply, repair or roll back anything."
say "[verify-0127] evidence log -> $LOG"

# --------------------------------------------------------------------------
# repo identity — the same ancestry proof the promotion used
# --------------------------------------------------------------------------
REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { say "STOP: cannot reach repository root"; exit 1; }
say "[verify-0127] repo: $REPO_ROOT"

if ! git fetch --no-tags origin main >>"$LOG" 2>&1; then
  say "STOP: could not fetch origin/main — refusing to judge canonical state from a stale ref"; exit 1
fi

HEAD_SHA=$(git rev-parse HEAD 2>/dev/null)
ORIGIN_SHA=$(git rev-parse origin/main 2>/dev/null)
MIG_SHA=$(shasum -a 256 "$MIGRATION_FILE" 2>/dev/null | cut -d' ' -f1)
TAP_SHA=$(shasum -a 256 "$PGTAP_FILE" 2>/dev/null | cut -d' ' -f1)
DIRTY=$(git status --porcelain --untracked-files=no | wc -l | tr -d ' ')

if [ "$DIRTY" != "0" ]; then
  say "STOP: tracked worktree is not clean ($DIRTY change(s))"; exit 1
fi
if [ -z "$ORIGIN_SHA" ] || [ "$HEAD_SHA" != "$ORIGIN_SHA" ]; then
  say "STOP: HEAD is $HEAD_SHA but origin/main is ${ORIGIN_SHA:-<unresolved>}."
  say "      Verification runs from canonical main only."
  exit 1
fi
if ! git merge-base --is-ancestor "$APPROVED_IMPLEMENTATION_COMMIT" origin/main 2>/dev/null; then
  say "STOP: $APPROVED_IMPLEMENTATION_COMMIT is not an ancestor of origin/main — 0127 is not merged."
  exit 1
fi
if [ "$MIG_SHA" != "$APPROVED_MIGRATION_SHA" ]; then
  say "STOP: migration sha is $MIG_SHA, approved is $APPROVED_MIGRATION_SHA"; exit 1
fi
if [ "$TAP_SHA" != "$APPROVED_PGTAP_SHA" ]; then
  say "STOP: pgTAP sha is $TAP_SHA, approved is $APPROVED_PGTAP_SHA"; exit 1
fi
say "[verify-0127] identity OK  head=$HEAD_SHA (== origin/main); 0127 is merged; content hashes exact"

# --------------------------------------------------------------------------
# credential
# --------------------------------------------------------------------------
DB_PASSWORD="$(security find-generic-password -s "$KEYCHAIN_SERVICE" -a "$USER" -w 2>/dev/null)"
if [ -z "${DB_PASSWORD:-}" ]; then
  say "STOP: keychain credential not found (service=$KEYCHAIN_SERVICE account=$USER)"; exit 1
fi
export PGPASSWORD="$DB_PASSWORD"
say "[verify-0127] credential loaded (never printed); host=$DB_HOST"

runsql() {   # runsql <output-file> <sql-file>
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
       -v ON_ERROR_STOP=1 --no-psqlrc -At </dev/null -f "$2" >"$1" 2>>"$LOG"
}

# --------------------------------------------------------------------------
# STATE — registration, signature, privileges, security baseline
# --------------------------------------------------------------------------
cat >"$Q1" <<'STATE'
set default_transaction_read_only = on;
select 'DB_IDENTITY=' || current_database();
select 'MIGRATION_0127_PRESENT=' || (exists(select 1 from supabase_migrations.schema_migrations where version like '0127%'))::text;
select 'MIGRATION_0127_COUNT=' || (select count(*)::text from supabase_migrations.schema_migrations where version like '0127%');
select 'MIGRATION_0126_PRESENT=' || (exists(select 1 from supabase_migrations.schema_migrations where version like '0126%'))::text;
select 'MIGRATION_HISTORY_TAIL=' || string_agg(version,',' order by version)
  from (select version from supabase_migrations.schema_migrations order by version desc limit 6) t;
select 'RPC_NAMECOUNT=' || count(*)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='get_company_assessment_snapshot_pressure_v1';
select 'RPC_EXACT_SIGNATURE_PRESENT=' || (to_regprocedure('public.get_company_assessment_snapshot_pressure_v1(uuid)') is not null)::int::text;
-- Overloads ONLY. The canonical signature is excluded by oid, so a healthy
-- boundary reports (none); an earlier revision aggregated every function of that
-- name, so it reported the approved signature back as if it were an overload.
select 'RPC_ALTERNATE_SIGNATURES=' || coalesce(string_agg(pg_get_function_identity_arguments(p.oid),' | ' order by p.oid),'(none)')
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='get_company_assessment_snapshot_pressure_v1'
   and p.oid is distinct from to_regprocedure('public.get_company_assessment_snapshot_pressure_v1(uuid)');
-- `provolatile` is "char", which has no unambiguous || with text. The cast is
-- explicit: without it Postgres raises 'operator is not unique: text || "char"'
-- and the whole POST file aborts under ON_ERROR_STOP.
select 'SECURITY_DEFINER=' || p.prosecdef::text || ' VOLATILITY=' || p.provolatile::text
  from pg_proc p where p.oid='public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure;
select 'SEARCH_PATH_SAFE=' || (select (count(*)=1)::text from unnest(p.proconfig) cfg
   where cfg like 'search_path=%' and btrim(split_part(cfg,'=',2),'"')='')
  from pg_proc p where p.oid='public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure;
-- Owner is reported for the record and asserted RELATIVELY, against the 0126
-- companion that was promoted the same way. Pinning an absolute role name would
-- be asserting something never measured, and would fail on a healthy database
-- if Supabase ever changes which role owns migration-created functions.
select 'OWNER=' || pg_get_userbyid(p.proowner)
  from pg_proc p where p.oid='public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure;
select 'OWNER_MATCHES_COMPANION=' || (
  (select p.proowner from pg_proc p where p.oid='public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure)
  = (select c.proowner from pg_proc c where c.oid='public.get_company_retention_pressure_v1(uuid)'::regprocedure)
)::text;
select 'RETURN_COLUMNS=' || array_to_string(p.proargnames, ',')
  from pg_proc p where p.oid='public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure;
select 'RETURN_TYPES=' || (select string_agg(format_type(t, null), ',' order by o)
   from unnest(p.proallargtypes) with ordinality x(t, o))
  from pg_proc p where p.oid='public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure;
select 'EXECUTE_ANON='          || has_function_privilege('anon','public.get_company_assessment_snapshot_pressure_v1(uuid)','execute')::text;
select 'EXECUTE_AUTHENTICATED=' || has_function_privilege('authenticated','public.get_company_assessment_snapshot_pressure_v1(uuid)','execute')::text;
select 'EXECUTE_PUBLIC='        || has_function_privilege('public','public.get_company_assessment_snapshot_pressure_v1(uuid)','execute')::text;
select 'EXECUTE_SERVICE_ROLE='  || has_function_privilege('service_role','public.get_company_assessment_snapshot_pressure_v1(uuid)','execute')::text;
select 'SERVICE_ROLE_DIRECT_SELECT=' || string_agg(t||'='||has_table_privilege('service_role','public.'||t,'select')::text,' ' order by t)
  from unnest(array['assessment_execution_snapshots','assessment_execution_snapshot_sections',
                    'assessment_execution_snapshot_questions']) t;
select 'OTHER_ROLE_DIRECT_SELECT=' || string_agg(r||':'||t||'='||has_table_privilege(r,'public.'||t,'select')::text,' ' order by r,t)
  from unnest(array['anon','authenticated','public']) r,
       unnest(array['assessment_execution_snapshots','assessment_execution_snapshot_sections',
                    'assessment_execution_snapshot_questions']) t;
select 'ACL_FINGERPRINT=' || md5(string_agg(
         c.relname || '::' || coalesce(
           (select string_agg(x, ',' order by x) from unnest(c.relacl::text[]) x), '<default>'),
         '|' order by c.relname))
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in
   ('assessment_execution_snapshots','assessment_execution_snapshot_sections',
    'assessment_execution_snapshot_questions');
select 'RLS_FINGERPRINT=' || md5(string_agg(
         c.relname || '::' || c.relrowsecurity::text || ':' || c.relforcerowsecurity::text,
         '|' order by c.relname))
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in
   ('assessment_execution_snapshots','assessment_execution_snapshot_sections',
    'assessment_execution_snapshot_questions');
select 'RLS_ENABLED_COUNT=' || count(*)::text
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
   and c.relname in ('assessment_execution_snapshots','assessment_execution_snapshot_sections',
                     'assessment_execution_snapshot_questions') and c.relrowsecurity;
select 'POLICY_FINGERPRINT=' || coalesce(md5(string_agg(
         tablename || '::' || policyname || '::' || permissive || '::' ||
         array_to_string(roles, ',') || '::' || cmd || '::' ||
         coalesce(qual,'') || '::' || coalesce(with_check,''),
         '|' order by tablename, policyname)), '<none>')
  from pg_policies where schemaname='public' and tablename in
   ('assessment_execution_snapshots','assessment_execution_snapshot_sections',
    'assessment_execution_snapshot_questions');
select 'COLUMN_CONTRACT=' || string_agg(table_name||'.'||column_name, ' ' order by table_name)
  from information_schema.columns
 where table_schema='public' and column_name='company_id'
   and table_name in ('assessment_execution_snapshots','assessment_execution_snapshot_sections',
                      'assessment_execution_snapshot_questions');
select 'COMPANION_0126_NAMECOUNT=' || count(*)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='get_company_retention_pressure_v1';
select 'COMPANION_0126_SIGNATURE_PRESENT=' || (to_regprocedure('public.get_company_retention_pressure_v1(uuid)') is not null)::int::text;
select 'COMPANION_0126_EXECUTE=' ||
  'anon=' || has_function_privilege('anon','public.get_company_retention_pressure_v1(uuid)','execute')::text ||
  ' authenticated=' || has_function_privilege('authenticated','public.get_company_retention_pressure_v1(uuid)','execute')::text ||
  ' service_role=' || has_function_privilege('service_role','public.get_company_retention_pressure_v1(uuid)','execute')::text;
STATE

# --------------------------------------------------------------------------
# CONTRACT — the boundary answering as the role that will actually call it
# --------------------------------------------------------------------------
cat >"$Q2" <<'CONTRACT'
set default_transaction_read_only = on;
begin;
set local role service_role;
select 'UNKNOWN_TENANT=' ||
  (select coalesce(sum(row_count),0)::bigint from public.get_company_assessment_snapshot_pressure_v1(gen_random_uuid()))::text ||
  ' rows=' || (select count(*) from public.get_company_assessment_snapshot_pressure_v1(gen_random_uuid()))::text;
select 'NULL_TENANT=' ||
  (select coalesce(sum(row_count),0)::bigint from public.get_company_assessment_snapshot_pressure_v1(null))::text ||
  ' rows=' || (select count(*) from public.get_company_assessment_snapshot_pressure_v1(null))::text;
select 'RELATION_NAMES=' || (select string_agg(relation_name, ',' order by relation_name)
   from public.get_company_assessment_snapshot_pressure_v1(gen_random_uuid()));
select 'COMPANION_0126_ROWS=' || (select count(*)::text
   from public.get_company_retention_pressure_v1(gen_random_uuid()));
rollback;
CONTRACT

say "[verify-0127] reading Review state (read-only)"
if ! runsql "$Q1.out" "$Q1"; then
  say "STOP: state query failed — see $LOG. A query that did not run is NOT a pass."
  say "VERIFY_VERDICT=FAIL"; evidence; exit 1
fi
sed 's/^/    /' "$Q1.out"

say "[verify-0127] exercising the boundary as service_role (read-only, rolled back)"
if ! runsql "$Q2.out" "$Q2"; then
  say "STOP: contract query failed — see $LOG. A query that did not run is NOT a pass."
  say "VERIFY_VERDICT=FAIL"; evidence; exit 1
fi
sed 's/^/    /' "$Q2.out"

# --------------------------------------------------------------------------
# assertions
# --------------------------------------------------------------------------
say "[verify-0127] asserting"
for want in \
  "MIGRATION_0127_PRESENT=true" \
  "MIGRATION_0127_COUNT=1" \
  "MIGRATION_0126_PRESENT=true" \
  "RPC_NAMECOUNT=1" \
  "RPC_EXACT_SIGNATURE_PRESENT=1" \
  "RPC_ALTERNATE_SIGNATURES=(none)" \
  "SECURITY_DEFINER=true VOLATILITY=s" \
  "SEARCH_PATH_SAFE=true" \
  "OWNER_MATCHES_COMPANION=true" \
  "RETURN_COLUMNS=p_company_id,relation_name,row_count" \
  "RETURN_TYPES=uuid,text,bigint" \
  "EXECUTE_ANON=false" \
  "EXECUTE_AUTHENTICATED=false" \
  "EXECUTE_PUBLIC=false" \
  "EXECUTE_SERVICE_ROLE=true" \
  "SERVICE_ROLE_DIRECT_SELECT=assessment_execution_snapshot_questions=false assessment_execution_snapshot_sections=false assessment_execution_snapshots=false" \
  "RLS_ENABLED_COUNT=3" \
  "ACL_FINGERPRINT=$EXPECTED_ACL" \
  "RLS_FINGERPRINT=$EXPECTED_RLS" \
  "POLICY_FINGERPRINT=$EXPECTED_POLICY" \
  "COLUMN_CONTRACT=assessment_execution_snapshot_questions.company_id assessment_execution_snapshot_sections.company_id assessment_execution_snapshots.company_id" \
  "COMPANION_0126_NAMECOUNT=1" \
  "COMPANION_0126_SIGNATURE_PRESENT=1" \
  "COMPANION_0126_EXECUTE=anon=false authenticated=false service_role=true"
do
  grep -Fxq "$want" "$Q1.out" || bad "expected [$want]"
done

# No role may read the tables directly. Asserted as a property rather than as one
# spelling, so a new role appearing in the list cannot slip past a fixed string.
OTHER=$(grep '^OTHER_ROLE_DIRECT_SELECT=' "$Q1.out" | head -1)
if [ -z "$OTHER" ]; then
  bad "OTHER_ROLE_DIRECT_SELECT was not reported"
elif printf '%s' "$OTHER" | grep -q '=true'; then
  bad "a non-service role can SELECT a snapshot table directly [$OTHER]"
fi

for want in \
  "UNKNOWN_TENANT=0 rows=3" \
  "NULL_TENANT=0 rows=3" \
  "RELATION_NAMES=assessment_execution_snapshot_questions,assessment_execution_snapshot_sections,assessment_execution_snapshots" \
  "COMPANION_0126_ROWS=4"
do
  grep -Fxq "$want" "$Q2.out" || bad "expected [$want]"
done

# --------------------------------------------------------------------------
# verdict
# --------------------------------------------------------------------------
if [ "$FAILURES" -eq 0 ]; then
  say "VERIFY_VERDICT=PASS"
  say "0127 is registered exactly once, the boundary matches its reviewed contract,"
  say "and no role gained direct SELECT on the snapshot tables."
  evidence
  exit 0
fi

say "VERIFY_VERDICT=FAIL ($FAILURES assertion(s))"
say "This script changes nothing. Do NOT repair the database from here — inspect,"
say "decide with a human, and if a change is needed it is a new migration."
evidence
exit 1
