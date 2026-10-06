#!/usr/bin/env bash
# Review-only, single-attempt governed promotion of migration 0142.
set -uo pipefail
umask 077
REVIEW_REF="rwfvxvbzaosgcyfxdjpt"
PRODUCTION_REF="gzrrwyiqfbnyprkdeqvm"
LEGACY_REF="oudngmrdtgengilpqqnz"
SOURCE_COMMIT="67843339d292e659a791d7efcc6a62f7ced61612"
MIGRATION="supabase/migrations/0142_create_company_turnover_boundary.sql"
MIGRATION_SHA="17a8d02f8fdf915122d68666ca8714ba5ba2ea62ebebd759b9a81e32b558a4c9"
EXPECTED_PENDING="0142_create_company_turnover_boundary.sql"
PRE_RUNNER="scripts/review/verify-t-db2-turnover-pre.sh"; POST_RUNNER="scripts/review/verify-t-db2-turnover-post.sh"; RUNNER="scripts/review/promote-t-db2-turnover.sh"
URL_KEYCHAIN_SERVICE="evol-os-review-pooler-url"; POOLER_HOST_SUFFIX=".pooler.supabase.com"
LOG=$(mktemp -t tdb2log.XXXXXX); PRE=$(mktemp -t tdb2pre.XXXXXX); TOCTOU=$(mktemp -t tdb2toctou.XXXXXX); POST=$(mktemp -t tdb2post.XXXXXX); DRY=$(mktemp -t tdb2dry.XXXXXX); PUSH=$(mktemp -t tdb2push.XXXXXX); CANONICAL_WORKDIR=$(mktemp -d -t tdb2repo.XXXXXX)
say(){ printf '%s\n' "$*"; }; evidence(){ say "EVIDENCE LOG=$LOG PRE=$PRE TOCTOU=$TOCTOU POST=$POST DRY=$DRY PUSH=$PUSH"; }
ROOT=$(cd "$(dirname "$0")/../.." && pwd) || exit 1; cd "$ROOT" || exit 1
for tool in git shasum psql supabase security tar; do command -v "$tool" >/dev/null || { say "STOP: $tool unavailable"; exit 1; }; done
git fetch --no-tags origin main >>"$LOG" 2>&1 || { say 'STOP: fetch failed'; exit 1; }
[ "$(git branch --show-current)" = main ] && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { say 'STOP: canonical synchronized main required'; exit 1; }
[ -z "$(git status --porcelain --untracked-files=no)" ] || { say 'STOP: tracked worktree dirty'; exit 1; }
git merge-base --is-ancestor "$SOURCE_COMMIT" HEAD || { say 'STOP: source commit absent'; exit 1; }
[ "$(shasum -a 256 "$MIGRATION"|cut -d' ' -f1)" = "$MIGRATION_SHA" ] || { say 'STOP: migration hash mismatch'; exit 1; }
for file in "$RUNNER" "$PRE_RUNNER" "$POST_RUNNER"; do local_sha=$(shasum -a 256 "$file"|cut -d' ' -f1); main_sha=$(git show "origin/main:$file" 2>/dev/null|shasum -a 256|cut -d' ' -f1); [ "$local_sha" = "$main_sha" ] || { say "STOP: tooling is not canonical origin/main: $file"; exit 1; }; done
[ -f supabase/.temp/project-ref ] && [ "$(tr -d '[:space:]'<supabase/.temp/project-ref)" = "$REVIEW_REF" ] || { say 'STOP: linked target is not canonical Review'; exit 1; }
URL="${T_DB2_REVIEW_DB_URL:-}"; [ -n "$URL" ] || URL=$(security find-generic-password -s "$URL_KEYCHAIN_SERVICE" -a "$USER" -w 2>>"$LOG")
if [[ ! "$URL" =~ ^postgres(ql)?://([^:/@]+):([^@]*)@([^:/@]+):([0-9]+)/([^?]+)(\?.*)?$ ]]; then say 'SECRET_PRESENT=false'; say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_ENVIRONMENTAL'; exit 1; fi
urldecode(){ local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }
P_USER=$(urldecode "${BASH_REMATCH[2]}"); P_PASS=$(urldecode "${BASH_REMATCH[3]}"); P_HOST=${BASH_REMATCH[4]}; P_PORT=${BASH_REMATCH[5]}; P_DB=${BASH_REMATCH[6]}; P_QUERY=${BASH_REMATCH[7]}
case "$P_USER" in "postgres.$PRODUCTION_REF"|"postgres.$LEGACY_REF") say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_FORBIDDEN_TARGET'; exit 1;; esac
say 'SECRET_PRESENT=true'; [[ "$P_HOST" = *"$POOLER_HOST_SUFFIX" && "$P_HOST" != "$POOLER_HOST_SUFFIX" && "$P_PORT" = 5432 && "$P_DB" = postgres && "$P_USER" = "postgres.$REVIEW_REF" && -n "$P_PASS" && "$P_QUERY" != *sslmode=disable* ]] || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TARGET_INVALID'; exit 1; }; say 'PROJECT_REF_MATCH=true'
export PGPASSWORD="$P_PASS" PGCONNECT_TIMEOUT=15 DB_HOST="$P_HOST" DB_PORT="$P_PORT" DB_USER="$P_USER" DB_NAME="$P_DB"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --no-psqlrc -At -c 'select 1' >/dev/null 2>"$LOG" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_ENVIRONMENTAL'; evidence; exit 1; }
snapshot(){ bash "$PRE_RUNNER">"$1" 2>>"$LOG"; }; val(){ grep -m1 "^$1=" "$PRE"|cut -d= -f2-; }
snapshot "$PRE" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_PRE_QUERY_FAILED'; evidence; exit 1; }; cat "$PRE"
for pair in DB_NAME=postgres IS_LOOPBACK=false HAS_MIGRATION_LEDGER=true SUPABASE_ROLES=4 MIGRATION_0140_COUNT=1 MIGRATION_0141_COUNT=1 MIGRATION_0142_COUNT=0 MIGRATIONS_AFTER_0141=0 TURNOVER_TABLE_COUNT=0 TURNOVER_NAME_COUNT=0 TURNOVER_EXACT_FUNCTION_COUNT=0 TURNOVER_TRIGGER_COUNT=0 PEOPLE_RLS=true; do key=${pair%%=*}; expected=${pair#*=}; [ "$(val "$key")" = "$expected" ] || { say "PROMOTION_OUTCOME=NOT_ATTEMPTED_PRE_DRIFT [$key]"; evidence; exit 1; }; done
LOCAL_HISTORY=$(find supabase/migrations -maxdepth 1 -type f -name '0*.sql' -print|sed -E 's#^.*/([0-9]+)_.*#\1#'|awk '$1<=141'|sort -u|paste -sd, -); REMOTE_HISTORY=$(printf '%s' "$(val MIGRATION_HISTORY)"|tr ',' '\n'|awk '$1<=141'|sort -u|paste -sd, -); [ "$LOCAL_HISTORY" = "$REMOTE_HISTORY" ] || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_MIGRATION_HISTORY_DRIFT'; evidence; exit 1; }
snapshot "$TOCTOU" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TOCTOU_QUERY_FAILED'; evidence; exit 1; }; cmp -s "$PRE" "$TOCTOU" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TOCTOU_DRIFT'; evidence; exit 1; }
[ "$(shasum -a 256 "$MIGRATION"|cut -d' ' -f1)" = "$MIGRATION_SHA" ] && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TOCTOU_SOURCE_DRIFT'; evidence; exit 1; }
git archive HEAD | tar -x -C "$CANONICAL_WORKDIR" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_CANONICAL_SNAPSHOT_FAILED'; exit 1; }
pending(){ grep -oE '0[0-9]{3}_[a-z0-9_]+\.sql' "$1"|sort -u|paste -sd, -; }
if ! SUPABASE_DB_URL="$URL" supabase db push --workdir "$CANONICAL_WORKDIR" --dry-run </dev/null>"$DRY" 2>&1 || [ "$(pending "$DRY")" != "$EXPECTED_PENDING" ]; then DRY_PENDING=$(pending "$DRY"); : >"$DRY"; say "PROMOTION_OUTCOME=NOT_ATTEMPTED_DRY_RUN_FAILED [pending=$DRY_PENDING]"; evidence; exit 1; fi
: >"$DRY"; say PRE_GATE=PASS; say PROMOTION_ATTEMPT=BEGIN
if ! SUPABASE_DB_URL="$URL" supabase db push --workdir "$CANONICAL_WORKDIR" --yes </dev/null>"$PUSH" 2>&1; then : >"$PUSH"; say PROMOTION_OUTCOME=UNKNOWN_REMOTE_OUTCOME_INSPECT_BEFORE_RETRY; evidence; exit 2; fi
: >"$PUSH"
export PRE_PEOPLE_POLICY_FINGERPRINT="$(val PEOPLE_POLICY_FINGERPRINT)" PRE_PEOPLE_ACL_FINGERPRINT="$(val PEOPLE_ACL_FINGERPRINT)" PRE_PEOPLE_CLIENT_DML_COUNT="$(val PEOPLE_CLIENT_DML_COUNT)" PRE_ADMIN_AUDIT_FINGERPRINT="$(val ADMIN_AUDIT_FINGERPRINT)"
if ! bash "$POST_RUNNER">"$POST" 2>>"$LOG"; then cat "$POST"; say PROMOTION_OUTCOME=POST_VERIFICATION_FAILED_DO_NOT_RETRY; evidence; exit 1; fi
cat "$POST"; say PROMOTION_OUTCOME=APPLIED_AND_VERIFIED; evidence
