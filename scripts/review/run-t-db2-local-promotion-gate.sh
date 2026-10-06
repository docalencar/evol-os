#!/usr/bin/env bash
# Local real-PostgreSQL gate for T-DB2 promotion tooling. Never accesses Review.
set -uo pipefail
say(){ printf '%s\n' "$*"; }
ROOT=$(cd "$(dirname "$0")/../.." && pwd) || exit 1; cd "$ROOT" || exit 1
MIGRATION=supabase/migrations/0142_create_company_turnover_boundary.sql
PRE=scripts/review/verify-t-db2-turnover-pre.sh; POST=scripts/review/verify-t-db2-turnover-post.sh; PARSER=scripts/review/parse-t-db2-pending-set.sh
EXPECTED_SHA=17a8d02f8fdf915122d68666ca8714ba5ba2ea62ebebd759b9a81e32b558a4c9
for tool in supabase psql shasum git tar; do command -v "$tool">/dev/null || { say "STOP: $tool unavailable"; exit 1; }; done
[ "$(shasum -a 256 "$MIGRATION"|cut -d' ' -f1)" = "$EXPECTED_SHA" ] || { say 'T_DB2_LOCAL_PROMOTION_GATE=FAIL'; exit 1; }
DB_HOST=${DB_HOST:-127.0.0.1}; DB_PORT=${DB_PORT:-54322}; DB_USER=${DB_USER:-postgres}; DB_NAME=${DB_NAME:-postgres}; export DB_HOST DB_PORT DB_USER DB_NAME PGPASSWORD=${PGPASSWORD:-postgres} PGCONNECT_TIMEOUT=15
case "$DB_HOST" in 127.0.0.1|localhost|::1|'[::1]') :;; *) say 'STOP: this gate runs against the LOCAL database only'; exit 1;; esac
RESET=$(mktemp -t tdb2reset.XXXXXX); PREOUT=$(mktemp -t tdb2pre.XXXXXX); POSTOUT=$(mktemp -t tdb2post.XXXXXX); APPLY=$(mktemp -t tdb2apply.XXXXXX); DRYOUT=$(mktemp -t tdb2dryout.XXXXXX); DRYERR=$(mktemp -t tdb2dryerr.XXXXXX); SNAPSHOT=$(mktemp -d -t tdb2repo.XXXXXX)
git archive HEAD | tar -x -C "$SNAPSHOT" || { say CANONICAL_SNAPSHOT=FAIL; exit 1; }
rm "$SNAPSHOT/$MIGRATION" || { say PRE_CONSTRUCTION=FAIL; exit 1; }
say '[gate-t-db2] 1/5 reset local database to canonical pre-0142 state'
supabase db reset --workdir "$SNAPSHOT" >"$RESET" 2>&1 || { say DB_RESET=FAIL; say "LOG=$RESET"; exit 1; }; say DB_RESET=PASS
psql_local(){ psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --no-psqlrc -At </dev/null "$@"; }
say '[gate-t-db2] 2/5 verify exact PRE contract'
bash "$PRE">"$PREOUT" 2>&1 || { say PRE_SNAPSHOT=FAIL; tail -30 "$PREOUT"; exit 1; }
val(){ grep -m1 "^$1=" "$PREOUT"|cut -d= -f2-; }
for pair in MIGRATION_0141_COUNT=1 MIGRATION_0142_COUNT=0 MIGRATIONS_AFTER_0141=0 TURNOVER_TABLE_COUNT=0 TURNOVER_NAME_COUNT=0 TURNOVER_TRIGGER_COUNT=0 PEOPLE_RLS=true; do key=${pair%%=*}; expected=${pair#*=}; [ "$(val "$key")" = "$expected" ] || { say "PRE_CONTRACT=FAIL [$key]"; exit 1; }; done
say PRE_SNAPSHOT=PASS; say PRE_CONTRACT=PASS
say '[gate-t-db2] 3/5 prove real CLI dry-run contract'
cp "$MIGRATION" "$SNAPSHOT/$MIGRATION" || { say LOCAL_DRY_RUN=FAIL; exit 1; }
set +e
supabase db push --workdir "$SNAPSHOT" --local --dry-run >"$DRYOUT" 2>"$DRYERR"
DRY_EXIT=$?
set -e
bash "$PARSER" 0142_create_company_turnover_boundary.sql "$DRY_EXIT" "$DRYOUT" "$DRYERR" >/dev/null || { say LOCAL_DRY_RUN=FAIL; exit 1; }
say LOCAL_DRY_RUN=PASS
say '[gate-t-db2] 4/5 apply canonical payload verbatim'
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --no-psqlrc -f "$MIGRATION">>"$APPLY" 2>&1 && psql_local -c "insert into supabase_migrations.schema_migrations(version,name) values ('0142','create_company_turnover_boundary');">>"$APPLY" 2>&1 || { say MIGRATION_APPLIES=FAIL; tail -30 "$APPLY"; exit 1; }
say MIGRATION_APPLIES=PASS
say '[gate-t-db2] 5/5 execute canonical POST verifier'
export PRE_PEOPLE_POLICY_FINGERPRINT="$(val PEOPLE_POLICY_FINGERPRINT)" PRE_PEOPLE_ACL_FINGERPRINT="$(val PEOPLE_ACL_FINGERPRINT)" PRE_PEOPLE_CLIENT_DML_COUNT="$(val PEOPLE_CLIENT_DML_COUNT)" PRE_ADMIN_AUDIT_FINGERPRINT="$(val ADMIN_AUDIT_FINGERPRINT)"
bash "$POST">"$POSTOUT" 2>&1 || { say POST_SNAPSHOT=FAIL; cat "$POSTOUT"; exit 1; }
cat "$POSTOUT"; say POST_SNAPSHOT=PASS; say T_DB2_LOCAL_PROMOTION_GATE=PASS; say MIGRATION_0142_SHA256="$EXPECTED_SHA"; say REVIEW_ACCESSED=NO
