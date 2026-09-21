#!/usr/bin/env bash
# Review-only, single-attempt governed promotion of migration 0134.
set -uo pipefail
umask 077
REVIEW_REF="rwfvxvbzaosgcyfxdjpt"
SOURCE_COMMIT="31d4ac91c1d417953eeaaf3b806644b1cbf09355"
MIGRATION="supabase/migrations/0134_close_development_ledger_direct_read.sql"
MIGRATION_SHA="2f55002c1e58843b7acc706b2e9cc5e72f37b888630fb847fff5a09c1d4363d3"
EXPECTED_PENDING="0134_close_development_ledger_direct_read.sql"
PRE_RUNNER="scripts/review/verify-d-r3-ledger-closure-pre.sh"; POST_RUNNER="scripts/review/verify-d-r3-ledger-closure-post.sh"; RUNNER="scripts/review/promote-d-r3-ledger-closure.sh"
URL_KEYCHAIN_SERVICE="evol-os-review-pooler-url"; POOLER_HOST_SUFFIX=".pooler.supabase.com"
LOG=$(mktemp -t dr3log.XXXXXX); PRE=$(mktemp -t dr3pre.XXXXXX); TOCTOU=$(mktemp -t dr3toctou.XXXXXX); POST=$(mktemp -t dr3post.XXXXXX); DRY=$(mktemp -t dr3dry.XXXXXX); PUSH=$(mktemp -t dr3push.XXXXXX)
say(){ printf '%s\n' "$*"; }; evidence(){ say "EVIDENCE LOG=$LOG PRE=$PRE TOCTOU=$TOCTOU POST=$POST DRY=$DRY PUSH=$PUSH"; }
ROOT=$(cd "$(dirname "$0")/../.." && pwd) || exit 1; cd "$ROOT" || exit 1
for tool in git shasum psql supabase security; do command -v "$tool" >/dev/null || { say "STOP: $tool unavailable"; exit 1; }; done
git fetch --no-tags origin main >>"$LOG" 2>&1 || { say 'STOP: fetch failed'; exit 1; }
[ "$(git branch --show-current)" = main ] && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { say 'STOP: canonical synchronized main required'; exit 1; }
[ -z "$(git status --porcelain --untracked-files=no)" ] || { say 'STOP: tracked worktree dirty'; exit 1; }
git merge-base --is-ancestor "$SOURCE_COMMIT" HEAD || { say 'STOP: source commit absent'; exit 1; }
[ "$(shasum -a 256 "$MIGRATION"|cut -d' ' -f1)" = "$MIGRATION_SHA" ] || { say 'STOP: migration hash mismatch'; exit 1; }
for file in "$RUNNER" "$PRE_RUNNER" "$POST_RUNNER"; do local_sha=$(shasum -a 256 "$file"|cut -d' ' -f1); main_sha=$(git show "origin/main:$file" 2>/dev/null|shasum -a 256|cut -d' ' -f1); [ "$local_sha" = "$main_sha" ] || { say "STOP: tooling is not canonical origin/main: $file"; exit 1; }; done
[ -f supabase/.temp/project-ref ] && [ "$(tr -d '[:space:]'<supabase/.temp/project-ref)" = "$REVIEW_REF" ] || { say 'STOP: linked target is not canonical Review'; exit 1; }
URL="${D_R3_REVIEW_DB_URL:-}"; [ -n "$URL" ] || URL=$(security find-generic-password -s "$URL_KEYCHAIN_SERVICE" -a "$USER" -w 2>>"$LOG")
if [[ ! "$URL" =~ ^postgres(ql)?://([^:/@]+):([^@]*)@([^:/@]+):([0-9]+)/([^?]+)(\?.*)?$ ]]; then say 'SECRET_PRESENT=false'; say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_ENVIRONMENTAL'; exit 1; fi
urldecode(){ local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }
P_USER=$(urldecode "${BASH_REMATCH[2]}"); P_PASS=$(urldecode "${BASH_REMATCH[3]}"); P_HOST=${BASH_REMATCH[4]}; P_PORT=${BASH_REMATCH[5]}; P_DB=${BASH_REMATCH[6]}; P_QUERY=${BASH_REMATCH[7]}
say 'SECRET_PRESENT=true'; [[ "$P_HOST" = *"$POOLER_HOST_SUFFIX" && "$P_HOST" != "$POOLER_HOST_SUFFIX" && "$P_PORT" = 5432 && "$P_DB" = postgres && "$P_USER" = "postgres.$REVIEW_REF" && -n "$P_PASS" && "$P_QUERY" != *sslmode=disable* ]] || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TARGET_INVALID'; exit 1; }; say 'PROJECT_REF_MATCH=true'
export PGPASSWORD="$P_PASS" PGCONNECT_TIMEOUT=15 DB_HOST="$P_HOST" DB_PORT="$P_PORT" DB_USER="$P_USER" DB_NAME="$P_DB"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --no-psqlrc -At -c 'select 1' >/dev/null 2>"$LOG" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_ENVIRONMENTAL'; evidence; exit 1; }
snapshot(){ bash "$PRE_RUNNER">"$1" 2>>"$LOG"; }; val(){ grep -m1 "^$1=" "$PRE"|cut -d= -f2-; }
snapshot "$PRE" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_PRE_QUERY_FAILED'; evidence; exit 1; }; cat "$PRE"
for pair in DB_NAME=postgres IS_LOOPBACK=false HAS_MIGRATION_LEDGER=true SUPABASE_ROLES=4 MIGRATION_0132_COUNT=1 MIGRATION_0133_COUNT=1 MIGRATION_0134_COUNT=0 MIGRATIONS_AFTER_0133=0 LEDGER_TABLE_COUNT=4 AUTH_SELECT_COUNT=4 OTHER_CLIENT_PRIV_COUNT=0 AUTH_NONSELECT_PRIV_COUNT=0 SELECT_POLICY_COUNT=4 TRUSTED_BOUNDARY_COUNT=4; do key=${pair%%=*}; expected=${pair#*=}; [ "$(val "$key")" = "$expected" ] || { say "PROMOTION_OUTCOME=NOT_ATTEMPTED_PRE_DRIFT [$key]"; evidence; exit 1; }; done
[ "$(val ORIGIN_RESULT)" = 'TABLE(plan_id uuid, template_id uuid, template_version_id uuid, template_name text, template_version_number integer)' ] || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_PRE_DRIFT [ORIGIN_RESULT]'; evidence; exit 1; }
[ "$(val RETENTION_RELATIONS)" = 'development_template_application_attempts,development_template_application_lineage,development_template_application_snapshots,development_template_applications' ] || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_PRE_DRIFT [RETENTION_RELATIONS]'; evidence; exit 1; }
LOCAL_HISTORY=$(find supabase/migrations -maxdepth 1 -type f -name '0*.sql' -print|sed -E 's#^.*/([0-9]+)_.*#\1#'|awk '$1<=133'|sort -u|paste -sd, -); REMOTE_HISTORY=$(printf '%s' "$(val MIGRATION_HISTORY)"|tr ',' '\n'|awk '$1<=133'|sort -u|paste -sd, -); [ "$LOCAL_HISTORY" = "$REMOTE_HISTORY" ] || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_MIGRATION_HISTORY_DRIFT'; evidence; exit 1; }
snapshot "$TOCTOU" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TOCTOU_QUERY_FAILED'; evidence; exit 1; }; cmp -s "$PRE" "$TOCTOU" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TOCTOU_DRIFT'; evidence; exit 1; }
[ "$(shasum -a 256 "$MIGRATION"|cut -d' ' -f1)" = "$MIGRATION_SHA" ] && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TOCTOU_SOURCE_DRIFT'; evidence; exit 1; }
pending(){ grep -oE '0[0-9]{3}_[a-z0-9_]+\.sql' "$1"|sort -u|paste -sd, -; }; TRANSPORT=none
if SUPABASE_DB_URL="$URL" supabase db push --dry-run </dev/null>"$DRY" 2>&1 && [ "$(pending "$DRY")" = "$EXPECTED_PENDING" ]; then TRANSPORT=environment; elif supabase db push --db-url "$URL" --dry-run </dev/null>"$DRY" 2>&1 && [ "$(pending "$DRY")" = "$EXPECTED_PENDING" ]; then TRANSPORT=argv; fi
DRY_PENDING=$(pending "$DRY"); : >"$DRY"; [ "$TRANSPORT" != none ] || { say "PROMOTION_OUTCOME=NOT_ATTEMPTED_DRY_RUN_FAILED [pending=$DRY_PENDING]"; evidence; exit 1; }
say PRE_GATE=PASS; say PROMOTION_ATTEMPT=BEGIN
run_mutating_push(){ if [ "$TRANSPORT" = environment ]; then SUPABASE_DB_URL="$URL" supabase db push --yes; else supabase db push --db-url "$URL" --yes; fi; }
if ! run_mutating_push </dev/null>"$PUSH" 2>&1; then : >"$PUSH"; say PROMOTION_OUTCOME=UNKNOWN_REMOTE_OUTCOME_INSPECT_BEFORE_RETRY; evidence; exit 2; fi
: >"$PUSH"
export PRE_LEDGER_RLS_FINGERPRINT="$(val LEDGER_RLS_FINGERPRINT)" PRE_LEDGER_POLICY_FINGERPRINT="$(val LEDGER_POLICY_FINGERPRINT)" PRE_TRUSTED_BOUNDARY_FINGERPRINT="$(val TRUSTED_BOUNDARY_FINGERPRINT)" PRE_ORIGIN_FINGERPRINT="$(val ORIGIN_FINGERPRINT)" PRE_RETENTION_FINGERPRINT="$(val RETENTION_FINGERPRINT)"
if ! bash "$POST_RUNNER">"$POST" 2>>"$LOG"; then cat "$POST"; say PROMOTION_OUTCOME=POST_VERIFICATION_FAILED_DO_NOT_RETRY; evidence; exit 1; fi
cat "$POST"; say PROMOTION_OUTCOME=APPLIED_AND_VERIFIED; evidence
