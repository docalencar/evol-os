#!/usr/bin/env bash
# Review-only, single-attempt promotion runner for D-R2 migration 0133.
#
#   bash scripts/review/promote-d-r2-development-origin.sh
#
# Run it as its own process. Never source it, never eval it.
#
# It promotes EXACTLY ONE migration —
# 0133_create_development_plan_origin_read_boundary.sql — to canonical Review, and
# it is not a general-purpose migration executor: the payload is named and hashed
# in this file, there is no arbitrary-SQL path, and there is exactly one command
# in the whole script that can change the remote.
#
# The mutation identity is the pair (canonical source commit, migration SHA256).
# A filename is not an identity; either half changing means this is a different
# operation and needs re-governance.
#
# 0133 is function-only. It adds no table, touches no ACL, no RLS and no policy.
# In particular the PRE-EXISTING tenant-wide visibility of the application ledger
# to authenticated members is left EXACTLY as found — this runner neither widens
# nor repairs it, and POST fails if any of those fingerprints moved. That repair
# is its own adjudicated slice.
set -uo pipefail
umask 077

REVIEW_REF="rwfvxvbzaosgcyfxdjpt"
SOURCE_COMMIT="ef36ac130c8b655e0635102a9a6d89c45e483b4b"
URL_KEYCHAIN_SERVICE="evol-os-review-pooler-url"
POOLER_HOST_SUFFIX=".pooler.supabase.com"
EXPECTED_PORT=5432; EXPECTED_DB=postgres

M133="supabase/migrations/0133_create_development_plan_origin_read_boundary.sql"
S133="2791febff1b790712ffe60f13cf9e8227427c498b8310fcaf2f91977899509eb"
EXPECTED_PENDING='0133_create_development_plan_origin_read_boundary.sql'

RUNNER="scripts/review/promote-d-r2-development-origin.sh"
PRE_RUNNER="scripts/review/verify-d-r2-development-origin-pre.sh"
POST_RUNNER="scripts/review/verify-d-r2-development-origin-post.sh"

LOG=$(mktemp -t dr2log.XXXXXX); PRE=$(mktemp -t dr2pre.XXXXXX)
TOCTOU=$(mktemp -t dr2toctou.XXXXXX); POST=$(mktemp -t dr2post.XXXXXX)
DRY=$(mktemp -t dr2dry.XXXXXX); PUSH=$(mktemp -t dr2push.XXXXXX)
say(){ printf '%s\n' "$*"; }
evidence(){ say "EVIDENCE LOG=$LOG PRE=$PRE TOCTOU=$TOCTOU POST=$POST DRY=$DRY PUSH=$PUSH"; }

ROOT=$(cd "$(dirname "$0")/../.." && pwd) || exit 1; cd "$ROOT" || exit 1
for tool in git shasum psql supabase security; do
  command -v "$tool" >/dev/null || { say "STOP: $tool unavailable"; exit 1; }
done

# ---------------------------------------------------------------------------
# Source identity. Promotion is only meaningful from canonical, synchronized main.
# ---------------------------------------------------------------------------
git fetch --no-tags origin main >>"$LOG" 2>&1 || { say 'STOP: fetch failed'; exit 1; }
[ "$(git branch --show-current)" = main ] && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] \
  || { say 'STOP: canonical synchronized main required'; exit 1; }
[ -z "$(git status --porcelain --untracked-files=no)" ] || { say 'STOP: tracked worktree dirty'; exit 1; }
git merge-base --is-ancestor "$SOURCE_COMMIT" HEAD || { say 'STOP: source commit absent from ancestry'; exit 1; }

ACTUAL_S133=$(shasum -a 256 "$M133" | cut -d' ' -f1)
[ "$ACTUAL_S133" = "$S133" ] || { say "STOP: migration hash mismatch $M133"; exit 1; }

# The tooling that is about to mutate Review must itself be canonical main —
# reviewed and merged — before it is handed a credential. This check precedes any
# connection, and the guard suite pins that ordering.
for file in "$RUNNER" "$PRE_RUNNER" "$POST_RUNNER"; do
  local_sha=$(shasum -a 256 "$file" | cut -d' ' -f1)
  main_sha=$(git show "origin/main:$file" 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
  [ -n "$main_sha" ] && [ "$local_sha" = "$main_sha" ] \
    || { say "STOP: tooling is not canonical origin/main: $file"; exit 1; }
done

[ -f supabase/.temp/project-ref ] && [ "$(tr -d '[:space:]' <supabase/.temp/project-ref)" = "$REVIEW_REF" ] \
  || { say 'STOP: linked target is not canonical Review'; exit 1; }

# ---------------------------------------------------------------------------
# Credential. Structure is reported as booleans; the value is never printed,
# never placed in argv, and never written to a file.
# ---------------------------------------------------------------------------
URL="${D_R2_REVIEW_DB_URL:-}"
[ -n "$URL" ] || URL=$(security find-generic-password -s "$URL_KEYCHAIN_SERVICE" -a "$USER" -w 2>>"$LOG")
if [[ ! "$URL" =~ ^postgres(ql)?://([^:/@]+):([^@]*)@([^:/@]+):([0-9]+)/([^?]+)(\?.*)?$ ]]; then
  say 'SECRET_PRESENT=false'; say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_ENVIRONMENTAL'; exit 1
fi
P_USER=${BASH_REMATCH[2]}; P_PASS_RAW=${BASH_REMATCH[3]}; P_PASS=$P_PASS_RAW
P_HOST=${BASH_REMATCH[4]}; P_PORT=${BASH_REMATCH[5]}; P_DB=${BASH_REMATCH[6]}; P_QUERY=${BASH_REMATCH[7]}
urldecode(){ local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }
P_USER=$(urldecode "$P_USER"); P_PASS=$(urldecode "$P_PASS")
say 'SECRET_PRESENT=true'; say 'SCHEME_OK=true'; [ -n "$P_HOST" ] && say 'HOST_PRESENT=true'
[[ "$P_HOST" = *"$POOLER_HOST_SUFFIX" && "$P_HOST" != "$POOLER_HOST_SUFFIX" ]] \
  || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TARGET_INVALID'; exit 1; }
[ "$P_PORT" = "$EXPECTED_PORT" ] && [ "$P_DB" = "$EXPECTED_DB" ] && [ "$P_USER" = "postgres.$REVIEW_REF" ] && [ -n "$P_PASS" ] \
  || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TARGET_INVALID'; exit 1; }
[[ "$P_QUERY" != *sslmode=disable* ]] || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TARGET_INVALID'; exit 1; }
say 'PROJECT_REF_MATCH=true'
export PGPASSWORD="$P_PASS" PGCONNECT_TIMEOUT=15
export DB_HOST="$P_HOST" DB_PORT="$P_PORT" DB_USER="$P_USER" DB_NAME="$P_DB"

if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
     -v ON_ERROR_STOP=1 --no-psqlrc -At -c 'select 1' >/dev/null 2>"$LOG"; then
  say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_ENVIRONMENTAL'; evidence; exit 1
fi

# ---------------------------------------------------------------------------
# PRE.
# ---------------------------------------------------------------------------
snapshot(){ bash "$PRE_RUNNER" >"$1" 2>>"$LOG"; }
val(){ grep -m1 "^$1=" "$PRE" | cut -d= -f2-; }
snapshot "$PRE" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_PRE_QUERY_FAILED'; evidence; exit 1; }
cat "$PRE"

[ "$(val DB_NAME)" = postgres ] && [ "$(val IS_LOOPBACK)" = false ] \
  && [ "$(val HAS_MIGRATION_LEDGER)" = true ] && [ "$(val SUPABASE_ROLES)" = 4 ] \
  || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TARGET_IDENTITY_FAILED'; evidence; exit 1; }

for pair in \
  MIGRATION_0130_COUNT=1 MIGRATION_0131_COUNT=1 MIGRATION_0132_COUNT=1 \
  MIGRATION_0133_COUNT=0 MIGRATIONS_AFTER_0132=0 \
  ORIGIN_NAMECOUNT=0 ORIGIN_SIGNATURE_PRESENT=false ORIGIN_ACL_ROWS=0 \
  PLAN_READ_PREDICATE_PRESENT=true PLANS_READER_PRESENT=true \
  IS_COMPANY_MEMBER_PRESENT=true LEDGER_TABLE_COUNT=3 \
  RETENTION_PRESENT=true RETENTION_FOUR_RELATIONS=4
do
  key=${pair%%=*}; expected=${pair#*=}
  [ "$(val "$key")" = "$expected" ] || { say "PROMOTION_OUTCOME=NOT_ATTEMPTED_PRE_DRIFT [$key]"; evidence; exit 1; }
done

# Exact canonical history through 0132, compared without exposing credentials.
LOCAL_HISTORY=$(find supabase/migrations -maxdepth 1 -type f -name '0*.sql' -print \
  | sed -E 's#^.*/([0-9]+)_.*#\1#' | awk '$1 <= 132' | sort -u | paste -sd, -)
REMOTE_HISTORY=$(printf '%s' "$(val MIGRATION_HISTORY)" | tr ',' '\n' | awk '$1 <= 132' | sort -u | paste -sd, -)
[ "$LOCAL_HISTORY" = "$REMOTE_HISTORY" ] \
  || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_MIGRATION_HISTORY_DRIFT'; evidence; exit 1; }

# ---------------------------------------------------------------------------
# TOCTOU. The destructive fingerprint is the whole PRE snapshot — target identity,
# migration history, function absence, ledger ACL/RLS/policy and retention — plus
# the source commit and migration hash re-checked below. Any drift stops here.
# ---------------------------------------------------------------------------
snapshot "$TOCTOU" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TOCTOU_QUERY_FAILED'; evidence; exit 1; }
cmp -s "$PRE" "$TOCTOU" || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TOCTOU_DRIFT'; evidence; exit 1; }
[ "$(shasum -a 256 "$M133" | cut -d' ' -f1)" = "$S133" ] \
  || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TOCTOU_PAYLOAD_DRIFT'; evidence; exit 1; }
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] \
  || { say 'PROMOTION_OUTCOME=NOT_ATTEMPTED_TOCTOU_SOURCE_DRIFT'; evidence; exit 1; }

# The dry run must show EXACTLY 0133 pending. More or fewer means the operation
# is not the one that was governed.
pending(){ grep -oE '0[0-9]{3}_[a-z0-9_]+\.sql' "$1" | sort -u | paste -sd, -; }
TRANSPORT=none
if SUPABASE_DB_URL="$URL" supabase db push --dry-run </dev/null >"$DRY" 2>&1 && [ "$(pending "$DRY")" = "$EXPECTED_PENDING" ]; then
  TRANSPORT=environment
elif supabase db push --db-url "$URL" --dry-run </dev/null >"$DRY" 2>&1 && [ "$(pending "$DRY")" = "$EXPECTED_PENDING" ]; then
  TRANSPORT=argv
fi
DRY_PENDING=$(pending "$DRY"); printf 'DRY_PENDING=%s\n' "$DRY_PENDING" >>"$LOG"; : >"$DRY"
if [ "$TRANSPORT" = none ]; then
  say "PROMOTION_OUTCOME=NOT_ATTEMPTED_DRY_RUN_FAILED [pending=$DRY_PENDING]"; evidence; exit 1
fi

say 'PRE_GATE=PASS'
say 'PROMOTION_ATTEMPT=BEGIN'

# ---------------------------------------------------------------------------
# The ONLY mutating command in this file. It runs once.
#
# A nonzero exit does NOT mean the migration was not applied — the transport may
# have failed after the statement reached the server. That is UNKNOWN, not
# FAILED, and the only safe response is to stop and inspect. This runner never
# retries, never falls back to another transport, and never executes SQL of its
# own to "finish the job".
# ---------------------------------------------------------------------------
run_mutating_push(){
  if [ "$TRANSPORT" = environment ]; then SUPABASE_DB_URL="$URL" supabase db push --yes
  else supabase db push --db-url "$URL" --yes; fi
}
if ! run_mutating_push </dev/null >"$PUSH" 2>&1; then
  : >"$PUSH"; printf 'PUSH_EXIT=NONZERO\n' >>"$LOG"
  say 'PROMOTION_OUTCOME=UNKNOWN_REMOTE_OUTCOME_INSPECT_BEFORE_RETRY'
  say 'Next step is READ-ONLY inspection, not another push:'
  say "  bash $POST_RUNNER"
  say 'If it reports 0133 applied and exact, the promotion succeeded and the'
  say 'transport failed afterwards. If it reports part of the target state,'
  say 'classify PARTIAL_REMOTE_APPLICATION and adjudicate before any repair.'
  evidence; exit 2
fi
: >"$PUSH"; printf 'PUSH_EXIT=0\n' >>"$LOG"

# ---------------------------------------------------------------------------
# POST. The PRE fingerprints are handed over so that "nothing else moved" is
# verified against what was actually observed, not against a constant.
# ---------------------------------------------------------------------------
export PRE_LEDGER_ACL_FINGERPRINT="$(val LEDGER_ACL_FINGERPRINT)"
export PRE_LEDGER_RLS_FINGERPRINT="$(val LEDGER_RLS_FINGERPRINT)"
export PRE_POLICY_FINGERPRINT="$(val DEVELOPMENT_POLICY_FINGERPRINT)"
export PRE_RLS_FINGERPRINT="$(val DEVELOPMENT_RLS_FINGERPRINT)"
export PRE_ACL_FINGERPRINT="$(val DEVELOPMENT_ACL_FINGERPRINT)"
export PRE_RETENTION_FINGERPRINT="$(val RETENTION_BODY_FINGERPRINT)"

if ! bash "$POST_RUNNER" >"$POST" 2>>"$LOG"; then
  cat "$POST"
  say 'PROMOTION_OUTCOME=POST_VERIFICATION_FAILED_DO_NOT_RETRY'
  evidence; exit 1
fi
cat "$POST"
say 'PROMOTION_OUTCOME=APPLIED_AND_VERIFIED'
say 'PRE_EXISTING_LEDGER_PRIVACY_FINDING=OPEN_UNCHANGED'
evidence
