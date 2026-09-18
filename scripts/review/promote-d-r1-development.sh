#!/usr/bin/env bash
# Review-only, single-attempt promotion runner for D-R1 migrations 0130-0132.
set -uo pipefail
umask 077
REVIEW_REF="rwfvxvbzaosgcyfxdjpt"; SOURCE_COMMIT="e7e22ee659f14010404e939b9e9f303105e9bf16"
URL_KEYCHAIN_SERVICE="evol-os-review-pooler-url"; POOLER_HOST_SUFFIX=".pooler.supabase.com"
EXPECTED_PORT=5432; EXPECTED_DB=postgres
M130="supabase/migrations/0130_create_development_trusted_lifecycle_boundary.sql"
M131="supabase/migrations/0131_create_development_template_authoring_boundary.sql"
M132="supabase/migrations/0132_extend_development_template_application_authorization.sql"
S130="84db30b865b5f3764381f4c63726b35795c18223585773554beb1a480cb311ba"
S131="216b9aaab76d75ff495f7d4eb4475197cfa918cb140813fa1c58dfc252d8f07c"
S132="29f39e831c32d9d679681f718461d697ed42ae6964fdd5e83c67fcd347a7f073"
RUNNER="scripts/review/promote-d-r1-development.sh"
PRE_RUNNER="scripts/review/verify-d-r1-development-pre.sh"
POST_RUNNER="scripts/review/verify-d-r1-development-post.sh"
LOG=$(mktemp -t dr1log.XXXXXX); PRE=$(mktemp -t dr1pre.XXXXXX); TOCTOU=$(mktemp -t dr1toctou.XXXXXX); POST=$(mktemp -t dr1post.XXXXXX); DRY=$(mktemp -t dr1dry.XXXXXX); PUSH=$(mktemp -t dr1push.XXXXXX)
say(){ printf '%s\n' "$*"; }; evidence(){ say "EVIDENCE LOG=$LOG PRE=$PRE TOCTOU=$TOCTOU POST=$POST DRY=$DRY PUSH=$PUSH"; }
ROOT=$(cd "$(dirname "$0")/../.." && pwd) || exit 1; cd "$ROOT" || exit 1
for tool in git shasum psql supabase security; do command -v "$tool" >/dev/null || { say "STOP: $tool unavailable"; exit 1; }; done
git fetch --no-tags origin main >>"$LOG" 2>&1 || { say 'STOP: fetch failed'; exit 1; }
[ "$(git branch --show-current)" = main ] && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { say 'STOP: canonical synchronized main required'; exit 1; }
[ -z "$(git status --porcelain --untracked-files=no)" ] || { say 'STOP: tracked worktree dirty'; exit 1; }
git merge-base --is-ancestor "$SOURCE_COMMIT" HEAD || { say 'STOP: source commit absent from ancestry'; exit 1; }
for pair in "$M130:$S130" "$M131:$S131" "$M132:$S132"; do file=${pair%%:*}; expected=${pair#*:}; actual=$(shasum -a 256 "$file"|cut -d' ' -f1); [ "$actual" = "$expected" ] || { say "STOP: hash mismatch $file"; exit 1; }; done
for file in "$RUNNER" "$PRE_RUNNER" "$POST_RUNNER"; do local_sha=$(shasum -a 256 "$file"|cut -d' ' -f1); main_sha=$(git show "origin/main:$file" 2>/dev/null|shasum -a 256|cut -d' ' -f1); [ -n "$main_sha" ] && [ "$local_sha" = "$main_sha" ] || { say "STOP: tooling is not canonical origin/main: $file"; exit 1; }; done
[ -f supabase/.temp/project-ref ] && [ "$(tr -d '[:space:]' <supabase/.temp/project-ref)" = "$REVIEW_REF" ] || { say 'STOP: linked target is not canonical Review'; exit 1; }

URL="${D_R1_REVIEW_DB_URL:-}"; [ -n "$URL" ] || URL=$(security find-generic-password -s "$URL_KEYCHAIN_SERVICE" -a "$USER" -w 2>>"$LOG")
if [[ ! "$URL" =~ ^postgres(ql)?://([^:/@]+):([^@]*)@([^:/@]+):([0-9]+)/([^?]+)(\?.*)?$ ]]; then say 'SECRET_PRESENT=false'; say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_ENVIRONMENTAL'; exit 1; fi
P_USER=${BASH_REMATCH[2]}; P_PASS_RAW=${BASH_REMATCH[3]}; P_PASS=$P_PASS_RAW; P_HOST=${BASH_REMATCH[4]}; P_PORT=${BASH_REMATCH[5]}; P_DB=${BASH_REMATCH[6]}; P_QUERY=${BASH_REMATCH[7]}
urldecode(){ local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }
P_USER=$(urldecode "$P_USER"); P_PASS=$(urldecode "$P_PASS")
say 'SECRET_PRESENT=true'; say 'SCHEME_OK=true'; [ -n "$P_HOST" ] && say 'HOST_PRESENT=true'
[[ "$P_HOST" = *"$POOLER_HOST_SUFFIX" && "$P_HOST" != "$POOLER_HOST_SUFFIX" ]] || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TARGET_INVALID'; exit 1; }
[ "$P_PORT" = "$EXPECTED_PORT" ] && [ "$P_DB" = "$EXPECTED_DB" ] && [ "$P_USER" = "postgres.$REVIEW_REF" ] && [ -n "$P_PASS" ] || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TARGET_INVALID'; exit 1; }
[[ "$P_QUERY" != *sslmode=disable* ]] || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TARGET_INVALID'; exit 1; }
say 'PROJECT_REF_MATCH=true'; export PGPASSWORD="$P_PASS" PGCONNECT_TIMEOUT=15
export DB_HOST="$P_HOST" DB_PORT="$P_PORT" DB_USER="$P_USER" DB_NAME="$P_DB"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --no-psqlrc -At -c 'select 1' >/dev/null 2>"$LOG"; then say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_ENVIRONMENTAL'; evidence; exit 1; fi
snapshot(){ bash "$PRE_RUNNER" >"$1" 2>>"$LOG"; }; val(){ grep -m1 "^$1=" "$PRE"|cut -d= -f2-; }
snapshot "$PRE" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_PRE_QUERY_FAILED'; evidence; exit 1; }; cat "$PRE"
[ "$(val DB_NAME)" = postgres ] && [ "$(val IS_LOOPBACK)" = false ] && [ "$(val HAS_MIGRATION_LEDGER)" = true ] && [ "$(val SUPABASE_ROLES)" = 4 ] || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TARGET_IDENTITY_FAILED'; evidence; exit 1; }
for pair in MIGRATION_0126_COUNT=1 MIGRATION_0129_COUNT=1 MIGRATION_0130_COUNT=0 MIGRATION_0131_COUNT=0 MIGRATION_0132_COUNT=0 MIGRATIONS_AFTER_0132=0 NEW_TABLE_COUNT=0 LIFECYCLE_BOUNDARY_NAMECOUNT=0 TEMPLATE_AUTHORING_NAMECOUNT=0 APPLICATION_NEW_NAMECOUNT=0 PLAN_VERSION_COLUMN=false TEMPLATE_REVISION_COLUMN=false REPLACED_FUNCTIONS_PRESENT=3 RETENTION_PRESENT=true RETENTION_FOUR_RELATIONS=4; do key=${pair%%=*}; expected=${pair#*=}; [ "$(val "$key")" = "$expected" ] || { say "PROMOTION_OUTCOME=NOT_ATTEMPTED_PRE_DRIFT [$key]"; evidence; exit 1; }; done

# Exact canonical history through 0129, compared without exposing credentials.
LOCAL_HISTORY=$(find supabase/migrations -maxdepth 1 -type f -name '0*.sql' -print | sed -E 's#^.*/([0-9]+)_.*#\1#' | awk '$1 <= 129' | sort -u | paste -sd, -)
REMOTE_HISTORY=$(printf '%s' "$(val MIGRATION_HISTORY)" | tr ',' '\n' | awk '$1 <= 129' | sort -u | paste -sd, -)
[ "$LOCAL_HISTORY" = "$REMOTE_HISTORY" ] || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_MIGRATION_HISTORY_DRIFT'; evidence; exit 1; }

snapshot "$TOCTOU" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TOCTOU_QUERY_FAILED'; evidence; exit 1; }
cmp -s "$PRE" "$TOCTOU" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TOCTOU_DRIFT'; evidence; exit 1; }
EXPECTED_PENDING='0130_create_development_trusted_lifecycle_boundary.sql,0131_create_development_template_authoring_boundary.sql,0132_extend_development_template_application_authorization.sql'
pending(){ grep -oE '0[0-9]{3}_[a-z0-9_]+\.sql' "$1"|sort -u|paste -sd, -; }
TRANSPORT=none
if SUPABASE_DB_URL="$URL" supabase db push --dry-run </dev/null >"$DRY" 2>&1 && [ "$(pending "$DRY")" = "$EXPECTED_PENDING" ]; then
  TRANSPORT=environment
elif supabase db push --db-url "$URL" --dry-run </dev/null >"$DRY" 2>&1 && [ "$(pending "$DRY")" = "$EXPECTED_PENDING" ]; then
  TRANSPORT=argv
fi
DRY_PENDING=$(pending "$DRY"); printf 'DRY_PENDING=%s\n' "$DRY_PENDING" >>"$LOG"; : >"$DRY"
if [ "$TRANSPORT" = none ]; then say "PROMOTION_OUTCOME=NOT_ATTEMPTED_DRY_RUN_FAILED [pending=$DRY_PENDING]"; evidence; exit 1; fi
say 'PRE_GATE=PASS'; say 'PROMOTION_ATTEMPT=BEGIN'
# This is the only mutating command. An ambiguous result is never retried.
run_mutating_push(){ if [ "$TRANSPORT" = environment ]; then SUPABASE_DB_URL="$URL" supabase db push --yes; else supabase db push --db-url "$URL" --yes; fi; }
if ! run_mutating_push </dev/null >"$PUSH" 2>&1; then : >"$PUSH"; printf 'PUSH_EXIT=NONZERO\n' >>"$LOG"; say 'PROMOTION_OUTCOME=UNKNOWN_REMOTE_OUTCOME_INSPECT_BEFORE_RETRY'; evidence; exit 2; fi
: >"$PUSH"; printf 'PUSH_EXIT=0\n' >>"$LOG"
export PRE_POLICY_FINGERPRINT="$(val DEVELOPMENT_POLICY_FINGERPRINT)" PRE_RLS_FINGERPRINT="$(val DEVELOPMENT_RLS_FINGERPRINT)" PRE_RETENTION_FINGERPRINT="$(val RETENTION_BODY_FINGERPRINT)"
if ! bash "$POST_RUNNER" >"$POST" 2>>"$LOG"; then cat "$POST"; say 'PROMOTION_OUTCOME=POST_VERIFICATION_FAILED_DO_NOT_RETRY'; evidence; exit 1; fi
cat "$POST"; say 'PROMOTION_OUTCOME=APPLIED_AND_VERIFIED'; evidence
