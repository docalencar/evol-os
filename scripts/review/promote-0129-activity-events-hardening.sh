#!/usr/bin/env bash
# Review-only, single-attempt promotion runner for migration 0129.
set -uo pipefail

REVIEW_REF="rwfvxvbzaosgcyfxdjpt"
MIGRATION_FILE="supabase/migrations/0129_harden_activity_events_client_privileges.sql"
PGTAP_FILE="supabase/tests/activity_events_client_privilege_hardening.test.sql"
RUNNER_PATH="scripts/review/promote-0129-activity-events-hardening.sh"
APPROVED_BASE="b2ca4cf73098fb1415a2bb0ef96cf9c17d3a3a67"
APPROVED_MIGRATION_SHA="b529fc59395835fbb5b232fbeeb7a82857bf10193df2f8264b2559ea7a2050cd"
APPROVED_PGTAP_SHA="4facf04935ce7df445c13d8dd53258563babb15edfb48321d65f0e5ff2035664"
EXPECTED_PRE_ACTIVITY_ACL_FINGERPRINT="46875263bd6598c4534e2df7d1847a5e"
EXPECTED_ACTIVITY_POLICY_FINGERPRINT="44f737d45509824130c2ba631de442ce"
KEYCHAIN_SERVICE="evol-os-review-db"
LOG=$(mktemp -t evol0129log.XXXXXX)
PRE=$(mktemp -t evol0129pre.XXXXXX)
TOCTOU=$(mktemp -t evol0129toctou.XXXXXX)
POST=$(mktemp -t evol0129post.XXXXXX)
DRY=$(mktemp -t evol0129dry.XXXXXX)
PUSH=$(mktemp -t evol0129push.XXXXXX)
say() { printf '%s\n' "$*"; }
evidence() { say "EVIDENCE LOG=$LOG PRE=$PRE TOCTOU=$TOCTOU POST=$POST DRY=$DRY PUSH=$PUSH"; }

LOCAL_OK=no
for arg in "$@"; do [ "$arg" = "--local-pgtap-verified" ] && LOCAL_OK=yes; done
if [ "$LOCAL_OK" != yes ]; then say 'PROMOTION_OUTCOME=NO_MUTATION_LOCAL_GATE_NOT_ASSERTED'; exit 1; fi

ROOT=$(cd "$(dirname "$0")/../.." && pwd) || exit 1
cd "$ROOT" || exit 1
git fetch --no-tags origin main >>"$LOG" 2>&1 || { say 'STOP: fetch failed'; exit 1; }
HEAD_SHA=$(git rev-parse HEAD); ORIGIN_SHA=$(git rev-parse origin/main); BRANCH=$(git branch --show-current)
if [ "$HEAD_SHA" != "$ORIGIN_SHA" ] || [ "$BRANCH" != main ]; then say 'STOP: canonical clean main required'; exit 1; fi
if [ "$(git status --porcelain --untracked-files=no | wc -l | tr -d ' ')" != 0 ]; then say 'STOP: tracked worktree dirty'; exit 1; fi
git merge-base --is-ancestor "$APPROVED_BASE" origin/main || { say 'STOP: approved base absent'; exit 1; }
MIG_SHA=$(shasum -a 256 "$MIGRATION_FILE" | cut -d' ' -f1)
TAP_SHA=$(shasum -a 256 "$PGTAP_FILE" | cut -d' ' -f1)
RUN_SHA=$(shasum -a 256 "$RUNNER_PATH" | cut -d' ' -f1)
RUN_CANON=$(git show "origin/main:$RUNNER_PATH" 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
if [ "$MIG_SHA" != "$APPROVED_MIGRATION_SHA" ] || [ "$TAP_SHA" != "$APPROVED_PGTAP_SHA" ]; then say 'STOP: reviewed content hash mismatch'; exit 1; fi
if [ -z "$RUN_CANON" ] || [ "$RUN_SHA" != "$RUN_CANON" ]; then say 'STOP: runner is not canonical main content'; exit 1; fi
LINK_FILE="$ROOT/supabase/.temp/project-ref"
if [ ! -f "$LINK_FILE" ] || [ "$(tr -d '[:space:]' <"$LINK_FILE")" != "$REVIEW_REF" ]; then say 'STOP: linked push target is not canonical Review'; exit 1; fi
DB_PASSWORD=$(security find-generic-password -s "$KEYCHAIN_SERVICE" -a "$USER" -w 2>>"$LOG")
if [ -z "$DB_PASSWORD" ]; then say 'STOP: Review credential unavailable'; exit 1; fi
export PGPASSWORD="$DB_PASSWORD"
DB_HOST="db.${REVIEW_REF}.supabase.co"
snapshot() {
  PGPASSWORD="$DB_PASSWORD" DB_HOST="$DB_HOST" DB_PORT=5432 DB_USER=postgres DB_NAME=postgres \
    bash scripts/review/verify-0129-activity-events-hardening-pre.sh >"$1" 2>>"$LOG"
}
val() { grep -m1 "^$1=" "$PRE" | cut -d= -f2-; }

if ! snapshot "$PRE"; then say 'PROMOTION_OUTCOME=NO_MUTATION_PRE_QUERY_FAILED'; evidence; exit 1; fi
cat "$PRE"
load_state() {
  M128=$(val MIGRATION_0128_COUNT); M129=$(val MIGRATION_0129_COUNT)
  PUB=$(val ACTIVITY_SELECT_PUBLIC); ANON=$(val ACTIVITY_SELECT_ANON); AUTH=$(val ACTIVITY_SELECT_AUTHENTICATED)
  ACL_FP=$(val ACTIVITY_ACL_FINGERPRINT)
  CLIENT=$(val ACTIVITY_CLIENT_PRIVILEGES); POLICIES=$(val ACTIVITY_POLICY_COUNT)
  POLICY_FP=$(val ACTIVITY_POLICY_FINGERPRINT); SERVICE=$(val ACTIVITY_SERVICE_PRIVILEGES)
  TL=$(val TIMELINE_FILTERS_COMPANY); DEF=$(val TIMELINE_SECURITY_DEFINER); EXEC_AUTH=$(val TIMELINE_EXECUTE_AUTHENTICATED)
  BRIDGE=$(val BRIDGE_PRESENT); FKS=$(val COMPOSITE_FKS_VALIDATED); RPCS=$(val RPC_EXACT_SIGNATURES)
  FWP=$(val FEEDBACK_WRITE_PRIVILEGES); FWL=$(val FEEDBACK_WRITE_POLICIES)
}
load_state

classify_state() {
  if [ "$M128" = 1 ] && [ "$M129" = 0 ] && [ "$PUB" = false ] && [ "$ANON" = true ] && [ "$AUTH" = true ] && \
     [ "$CLIENT" = 16 ] && [ "$ACL_FP" = "$EXPECTED_PRE_ACTIVITY_ACL_FINGERPRINT" ] && \
     [ "$POLICIES" = 2 ] && [ "$POLICY_FP" = "$EXPECTED_ACTIVITY_POLICY_FINGERPRINT" ] && \
     [ "$SERVICE" = 8 ] && [ "$TL" = true ] && [ "$DEF" = true ] && [ "$EXEC_AUTH" = true ] && \
     [ "$BRIDGE" = true ] && [ "$FKS" = 7 ] && [ "$RPCS" = 5 ] && [ "$FWP" = 0 ] && [ "$FWL" = 0 ]; then
    printf '%s\n' READY_TO_APPLY
  elif [ "$M128" = 1 ] && [ "$M129" = 1 ] && [ "$PUB" = false ] && [ "$ANON" = false ] && [ "$AUTH" = false ] && \
       [ "$CLIENT" = 0 ] && [ "$POLICIES" = 2 ] && [ "$POLICY_FP" = "$EXPECTED_ACTIVITY_POLICY_FINGERPRINT" ] && \
       [ "$SERVICE" = 8 ] && [ "$TL" = true ] && [ "$DEF" = true ] && [ "$EXEC_AUTH" = true ] && \
       [ "$BRIDGE" = true ] && [ "$FKS" = 7 ] && [ "$RPCS" = 5 ] && [ "$FWP" = 0 ] && [ "$FWL" = 0 ]; then
    printf '%s\n' ALREADY_APPLIED_EXACTLY
  elif [ "$M129" != 0 ] || [ "$AUTH" != true ] || [ "$ANON" != true ]; then
    printf '%s\n' DRIFT
  else
    printf '%s\n' UNKNOWN
  fi
}
STATE=$(classify_state)
say "PRE_0129_STATE=$STATE"
if [ "$STATE" = ALREADY_APPLIED_EXACTLY ]; then say 'PROMOTION_OUTCOME=ALREADY_APPLIED_EXACTLY_NO_MUTATION'; evidence; exit 0; fi
if [ "$STATE" != READY_TO_APPLY ]; then say "PROMOTION_OUTCOME=BLOCKED_${STATE}"; evidence; exit 1; fi

if ! snapshot "$TOCTOU"; then say 'PROMOTION_OUTCOME=NO_MUTATION_TOCTOU_QUERY_FAILED'; evidence; exit 1; fi
for pair in "MIGRATION_0128_COUNT=1" "MIGRATION_0129_COUNT=0" "ACTIVITY_SELECT_PUBLIC=false" \
  "ACTIVITY_SELECT_ANON=true" "ACTIVITY_SELECT_AUTHENTICATED=true" "ACTIVITY_CLIENT_PRIVILEGES=16" \
  "ACTIVITY_ACL_FINGERPRINT=$EXPECTED_PRE_ACTIVITY_ACL_FINGERPRINT" \
  "ACTIVITY_POLICY_FINGERPRINT=$POLICY_FP" "ACTIVITY_SERVICE_PRIVILEGES=$SERVICE" \
  "TIMELINE_FILTERS_COMPANY=true" "BRIDGE_PRESENT=true" "COMPOSITE_FKS_VALIDATED=7" "RPC_EXACT_SIGNATURES=5"
do grep -Fxq "$pair" "$TOCTOU" || { say "PROMOTION_OUTCOME=NO_MUTATION_TOCTOU_DRIFT [$pair]"; evidence; exit 1; }; done

if ! supabase db push --linked --dry-run >"$DRY" 2>&1; then say 'PROMOTION_OUTCOME=NO_MUTATION_DRY_RUN_FAILED'; evidence; exit 1; fi
PENDING=$(grep -oE '0[0-9]{3}_[a-z0-9_]+\.sql' "$DRY" | sort -u | paste -sd, -)
if [ "$PENDING" != "0129_harden_activity_events_client_privileges.sql" ]; then say "PROMOTION_OUTCOME=NO_MUTATION_PENDING_SET [$PENDING]"; evidence; exit 1; fi

say '[0129] applying exactly one pending migration to canonical Review'
supabase db push --linked --yes >"$PUSH" 2>&1
RC=$?
cat "$PUSH"
if [ "$RC" -ne 0 ]; then say 'PROMOTION_OUTCOME=UNKNOWN_INSPECT_BEFORE_ANY_RETRY'; evidence; exit 1; fi
if rg -q 'pgdelta-target-ca\.crt|failed to cache migrations catalog' "$PUSH"; then
  say 'CLI_WARNING=NON_BLOCKING_CATALOG_CACHE_WARNING; POST decides applied state'
fi

if ! snapshot "$POST"; then say 'PROMOTION_OUTCOME=POST_QUERY_FAILED_DO_NOT_RETRY'; evidence; exit 1; fi
cat "$POST"
cp "$POST" "$PRE"
load_state
POST_STATE=$(classify_state)
if [ "$POST_STATE" != ALREADY_APPLIED_EXACTLY ]; then say 'PROMOTION_OUTCOME=POST_VERIFICATION_FAILED_DO_NOT_RETRY'; evidence; exit 1; fi
if ! PGPASSWORD="$DB_PASSWORD" DB_HOST="$DB_HOST" DB_PORT=5432 DB_USER=postgres DB_NAME=postgres \
  bash scripts/review/verify-0129-activity-events-hardening-post.sh >>"$POST" 2>>"$LOG"; then
  say 'PROMOTION_OUTCOME=POST_BEHAVIOR_VERIFICATION_FAILED_DO_NOT_RETRY'; evidence; exit 1
fi
say 'PROMOTION_OUTCOME=APPLIED_AND_POST_VERIFIED'
evidence
