#!/usr/bin/env bash
# Local real-PostgreSQL gate for D-R3 promotion tooling. Never accesses Review.
set -uo pipefail
say(){ printf '%s\n' "$*"; }
ROOT=$(cd "$(dirname "$0")/../.." && pwd) || exit 1; cd "$ROOT" || exit 1
MIGRATION=supabase/migrations/0134_close_development_ledger_direct_read.sql
PRE=scripts/review/verify-d-r3-ledger-closure-pre.sh; POST=scripts/review/verify-d-r3-ledger-closure-post.sh
EXPECTED_SHA=2f55002c1e58843b7acc706b2e9cc5e72f37b888630fb847fff5a09c1d4363d3
for tool in supabase psql shasum; do command -v "$tool">/dev/null || { say "STOP: $tool unavailable"; exit 1; }; done
[ "$(shasum -a 256 "$MIGRATION"|cut -d' ' -f1)" = "$EXPECTED_SHA" ] || { say 'D_R3_LOCAL_GATE=FAIL'; exit 1; }
DB_HOST=${DB_HOST:-127.0.0.1}; DB_PORT=${DB_PORT:-54322}; DB_USER=${DB_USER:-postgres}; DB_NAME=${DB_NAME:-postgres}; export DB_HOST DB_PORT DB_USER DB_NAME PGPASSWORD=${PGPASSWORD:-postgres} PGCONNECT_TIMEOUT=15
case "$DB_HOST" in 127.0.0.1|localhost|::1|'[::1]') :;; *) say 'STOP: this gate runs against the LOCAL database only'; exit 1;; esac
RESET=$(mktemp -t dr3reset.XXXXXX); PREOUT=$(mktemp -t dr3pre.XXXXXX); POSTOUT=$(mktemp -t dr3post.XXXXXX); APPLY=$(mktemp -t dr3apply.XXXXXX)
say '[gate-d-r3] 1/4 reset canonical local database'
supabase db reset >"$RESET" 2>&1 || { say DB_RESET=FAIL; say "LOG=$RESET"; exit 1; }; say DB_RESET=PASS
psql_local(){ psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --no-psqlrc -At </dev/null "$@"; }
say '[gate-d-r3] 2/4 construct exact pre-0134 state'
psql_local -c "grant select on public.development_template_applications,public.development_template_application_attempts,public.development_template_application_snapshots,public.development_template_application_lineage to authenticated; delete from supabase_migrations.schema_migrations where version like '0134%';" >"$APPLY" 2>&1 || { say PRE_CONSTRUCTION=FAIL; exit 1; }
bash "$PRE">"$PREOUT" 2>&1 || { say PRE_SNAPSHOT=FAIL; tail -20 "$PREOUT"; exit 1; }
val(){ grep -m1 "^$1=" "$PREOUT"|cut -d= -f2-; }
for pair in MIGRATION_0134_COUNT=0 MIGRATIONS_AFTER_0133=0 AUTH_SELECT_COUNT=4 OTHER_CLIENT_PRIV_COUNT=0 AUTH_NONSELECT_PRIV_COUNT=0 LEDGER_TABLE_COUNT=4 SELECT_POLICY_COUNT=4 TRUSTED_BOUNDARY_COUNT=4; do key=${pair%%=*}; expected=${pair#*=}; [ "$(val "$key")" = "$expected" ] || { say "PRE_CONTRACT=FAIL [$key]"; exit 1; }; done
say PRE_SNAPSHOT=PASS; say PRE_CONTRACT=PASS
say '[gate-d-r3] 3/4 apply canonical payload verbatim'
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --no-psqlrc -f "$MIGRATION">>"$APPLY" 2>&1 && psql_local -c "insert into supabase_migrations.schema_migrations(version,name) values ('0134','close_development_ledger_direct_read');">>"$APPLY" 2>&1 || { say MIGRATION_APPLIES=FAIL; exit 1; }
say MIGRATION_APPLIES=PASS
say '[gate-d-r3] 4/4 execute canonical POST verifier'
export PRE_LEDGER_RLS_FINGERPRINT="$(val LEDGER_RLS_FINGERPRINT)" PRE_LEDGER_POLICY_FINGERPRINT="$(val LEDGER_POLICY_FINGERPRINT)" PRE_TRUSTED_BOUNDARY_FINGERPRINT="$(val TRUSTED_BOUNDARY_FINGERPRINT)" PRE_ORIGIN_FINGERPRINT="$(val ORIGIN_FINGERPRINT)" PRE_RETENTION_FINGERPRINT="$(val RETENTION_FINGERPRINT)"
bash "$POST">"$POSTOUT" 2>&1 || { say POST_SNAPSHOT=FAIL; cat "$POSTOUT"; exit 1; }
cat "$POSTOUT"; say POST_SNAPSHOT=PASS; say D_R3_LOCAL_GATE=PASS; say MIGRATION_0134_SHA256="$EXPECTED_SHA"; say REVIEW_ACCESSED=NO
