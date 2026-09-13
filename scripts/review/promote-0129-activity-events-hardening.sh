#!/usr/bin/env bash
# Review-only, single-attempt promotion runner for migration 0129.
#
# WHY THE CONNECTION LAYER LOOKS LIKE THIS
#
# The first promotion attempt never reached SQL:
#
#   psql: error: could not translate host name
#   "db.rwfvxvbzaosgcyfxdjpt.supabase.co" to address:
#   nodename nor servname provided, or not known
#
# That host publishes an AAAA record and no A record. Supabase direct database
# endpoints are IPv6-only unless the IPv4 add-on is enabled, and this operator's
# network cannot use it. Every earlier runner (0126, 0127, 0128) hard-codes
# db.$REVIEW_REF.supabase.co, so all of them share the defect; 0129 is simply
# the first one to meet a network that exposed it.
#
# The fix is the Session pooler, which is IPv4-reachable. Its hostname is NOT
# derivable — the AWS region is part of it — so this script refuses to guess it
# and requires the operator to supply the exact string from
# Supabase → Connect → Session pooler → port 5432.
#
# WHAT THE POOLER CHANGES ABOUT IDENTITY
#
# With the direct endpoint, the hostname carried the project ref, and the 0128
# runner could tie the psql target to the CLI's linked ref. With the pooler the
# hostname is shared across every project in a region, and the project is
# selected by the TENANT KEY inside the username: postgres.<project-ref>. That
# key is the routing authority — it is what Supavisor dispatches on — so it is
# what this script validates, not the hostname. The in-SQL identity phase then
# proves what KIND of database answered (a Supabase-managed remote, not a
# developer's loopback), and the linked-ref guard is kept on top.
#
# SECRETS
#
# The pooler URL contains the database password. It is read from the
# environment or the Keychain, split into components in this process, and
# handed to psql through PGPASSWORD — never argv, never a log, never a file.
# The one place the full URL must reach a child process's argv is the Supabase
# CLI's --db-url, and only if the CLI has no environment binding for it; that
# case is detected at run time, announced, and the password is scrubbed from
# every line this script prints.
#
#   export E5_REVIEW_DB_URL="$(security find-generic-password \
#     -s evol-os-review-pooler-url -a "$USER" -w)"
#   bash scripts/review/promote-0129-activity-events-hardening.sh --local-pgtap-verified
#
# Storing it in the Keychain first keeps it out of shell history:
#   security add-generic-password -s evol-os-review-pooler-url -a "$USER" -w
#
set -uo pipefail

REVIEW_REF="rwfvxvbzaosgcyfxdjpt"
POOLER_HOST_SUFFIX=".pooler.supabase.com"
EXPECTED_POOLER_PORT="5432"
EXPECTED_DB_NAME="postgres"
URL_KEYCHAIN_SERVICE="evol-os-review-pooler-url"
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
IDENT=$(mktemp -t evol0129ident.XXXXXX)
CONNERR=$(mktemp -t evol0129conn.XXXXXX)
HELP=$(mktemp -t evol0129help.XXXXXX)
say() { printf '%s\n' "$*"; }
evidence() { say "EVIDENCE LOG=$LOG PRE=$PRE TOCTOU=$TOCTOU POST=$POST DRY=$DRY PUSH=$PUSH IDENT=$IDENT CONN=$CONNERR"; }

# Print a file with the database password removed. Used for everything the CLI
# emits, because a CLI error may quote the connection string back at us.
redacted() {
  if [ -n "${P_PASS:-}" ]; then
    while IFS= read -r line; do printf '%s\n' "${line//"$P_PASS"/[REDACTED]}"; done <"$1"
  else
    cat "$1"
  fi
}

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

# --------------------------------------------------------------------------
# Session pooler URL: structural validation, then decomposition.
# Both are pure functions of their argument so the guard tests can execute them
# directly instead of pattern-matching this file.
# --------------------------------------------------------------------------
validate_review_db_url() {
  local url="$1" user pass host port db rest
  if [ -z "$url" ]; then printf '%s\n' URL_MISSING; return 0; fi
  # An ALLOW-list, not a deny-list. The tenant key must be exactly Review's, so
  # every other project — Production and Legacy included — is refused without
  # this runner having to name them, which the repository guards forbid anyway.
  # A deny-list would also be weaker: it only rejects the projects it remembers.
  if [[ ! "$url" =~ ^postgres(ql)?://([^:/@]+):([^@]*)@([^:/@]+):([0-9]+)/([^?]+)(\?.*)?$ ]]; then
    printf '%s\n' URL_MALFORMED; return 0
  fi
  user="${BASH_REMATCH[2]}"; pass="${BASH_REMATCH[3]}"; host="${BASH_REMATCH[4]}"
  port="${BASH_REMATCH[5]}"; db="${BASH_REMATCH[6]}"; rest="${BASH_REMATCH[7]}"
  case "$host" in
    *"$POOLER_HOST_SUFFIX") : ;;
    *) printf '%s\n' URL_NOT_POOLER_HOST; return 0;;
  esac
  # A hostname that merely ENDS in the suffix is not enough: ".pooler.supabase.com"
  # with an empty label, or a lookalike registered elsewhere, must not pass.
  if [ "$host" = "$POOLER_HOST_SUFFIX" ] || [ "${host%"$POOLER_HOST_SUFFIX"}" = "" ]; then
    printf '%s\n' URL_NOT_POOLER_HOST; return 0
  fi
  [ "$port" = "$EXPECTED_POOLER_PORT" ] || { printf '%s\n' URL_BAD_PORT; return 0; }
  [ "$user" = "postgres.${REVIEW_REF}" ] || { printf '%s\n' URL_WRONG_PROJECT; return 0; }
  [ "$db" = "$EXPECTED_DB_NAME" ] || { printf '%s\n' URL_BAD_DATABASE; return 0; }
  [ -n "$pass" ] || { printf '%s\n' URL_NO_PASSWORD; return 0; }
  case "$rest" in *sslmode=disable*) printf '%s\n' URL_SSL_DISABLED; return 0;; esac
  printf '%s\n' URL_OK
}

urldecode() { local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }

parse_review_db_url() {
  [[ "$1" =~ ^postgres(ql)?://([^:/@]+):([^@]*)@([^:/@]+):([0-9]+)/([^?]+)(\?.*)?$ ]] || return 1
  P_USER=$(urldecode "${BASH_REMATCH[2]}")
  P_PASS=$(urldecode "${BASH_REMATCH[3]}")
  P_HOST="${BASH_REMATCH[4]}"
  P_PORT="${BASH_REMATCH[5]}"
  P_DB="${BASH_REMATCH[6]}"
}

REVIEW_DB_URL="${E5_REVIEW_DB_URL:-}"
if [ -z "$REVIEW_DB_URL" ]; then
  REVIEW_DB_URL=$(security find-generic-password -s "$URL_KEYCHAIN_SERVICE" -a "$USER" -w 2>>"$LOG")
fi
URL_VERDICT=$(validate_review_db_url "$REVIEW_DB_URL")
if [ "$URL_VERDICT" != URL_OK ]; then
  say "URL_VALIDATION=$URL_VERDICT"
  say 'The Session pooler connection string for canonical Review is required.'
  say 'Supabase -> Connect -> Session pooler -> port 5432, for project '"$REVIEW_REF"'.'
  say 'Provide it as E5_REVIEW_DB_URL, or store it once in the Keychain:'
  say "  security add-generic-password -s $URL_KEYCHAIN_SERVICE -a \"\$USER\" -w"
  say 'PROMOTION_OUTCOME=NO_MUTATION_REVIEW_DB_URL_INVALID'
  exit 1
fi
parse_review_db_url "$REVIEW_DB_URL" || { say 'PROMOTION_OUTCOME=NO_MUTATION_REVIEW_DB_URL_INVALID'; exit 1; }
say "[0129] pooler target accepted: host=$P_HOST port=$P_PORT db=$P_DB tenant=$REVIEW_REF"

export PGPASSWORD="$P_PASS"
export PGCONNECT_TIMEOUT=15
DB_HOST="$P_HOST"; DB_PORT="$P_PORT"; DB_USER="$P_USER"; DB_NAME="$P_DB"

# --------------------------------------------------------------------------
# PHASE 0 — connectivity, then authentication, then identity. Three distinct
# outcomes: collapsing them is what made the first failure take a whole
# adjudication slice to explain.
# --------------------------------------------------------------------------
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 --no-psqlrc -At -c 'select 1' </dev/null >/dev/null 2>"$CONNERR"; then
  redacted "$CONNERR" >>"$LOG"
  if grep -qiE 'password authentication failed|no password supplied|authentication failed|Tenant or user not found|role .* does not exist' "$CONNERR"; then
    say 'PREFLIGHT=AUTHENTICATION_FAILED'
    redacted "$CONNERR" | tail -3
    say 'PROMOTION_OUTCOME=NO_MUTATION_AUTH_FAILED'
  else
    say 'PREFLIGHT=CONNECTION_UNAVAILABLE'
    redacted "$CONNERR" | tail -3
    say 'PROMOTION_OUTCOME=NO_MUTATION_CONNECTION_FAILED'
  fi
  evidence; exit 1
fi
say '[0129] PREFLIGHT=CONNECTED'

if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 --no-psqlrc -At >"$IDENT" 2>>"$LOG" <<'IDSQL'
set default_transaction_read_only = on;
select 'SERVER_VERSION=' || current_setting('server_version');
select 'DB_NAME=' || current_database();
select 'CONNECTED_ROLE=' || current_user;
select 'IS_LOOPBACK=' || coalesce((inet_server_addr() << inet '127.0.0.0/8' or inet_server_addr() = inet '::1')::text, 'false');
select 'HAS_MIGRATION_LEDGER=' || (to_regclass('supabase_migrations.schema_migrations') is not null)::text;
select 'MIGRATION_LEDGER_ROWS=' || coalesce((select count(*) from supabase_migrations.schema_migrations), 0)::text;
select 'SUPABASE_ROLES=' || (select count(*) from pg_roles where rolname in ('anon','authenticated','service_role','supabase_admin'))::text;
IDSQL
then
  say 'PREFLIGHT=TARGET_IDENTITY_UNREADABLE'
  say 'PROMOTION_OUTCOME=NO_MUTATION_TARGET_IDENTITY_FAILED'
  evidence; exit 1
fi
cat "$IDENT"
ident() { grep -m1 "^$1=" "$IDENT" | cut -d= -f2-; }
IDENTITY_OK=yes
[ "$(ident DB_NAME)" = "$EXPECTED_DB_NAME" ] || { say "IDENTITY_FAIL database=$(ident DB_NAME)"; IDENTITY_OK=no; }
[ "$(ident IS_LOOPBACK)" = false ] || { say 'IDENTITY_FAIL answered on a loopback address — that is a local database, not Review'; IDENTITY_OK=no; }
[ "$(ident HAS_MIGRATION_LEDGER)" = true ] || { say 'IDENTITY_FAIL no supabase_migrations ledger — not a Supabase-managed database'; IDENTITY_OK=no; }
[ "$(ident SUPABASE_ROLES)" = 4 ] || { say "IDENTITY_FAIL supabase role set incomplete ($(ident SUPABASE_ROLES)/4)"; IDENTITY_OK=no; }
[ "$(ident MIGRATION_LEDGER_ROWS)" -gt 0 ] 2>/dev/null || { say 'IDENTITY_FAIL migration ledger is empty — not a promoted environment'; IDENTITY_OK=no; }
if [ "$IDENTITY_OK" != yes ]; then
  say 'PROMOTION_OUTCOME=NO_MUTATION_TARGET_IDENTITY_FAILED'; evidence; exit 1
fi
say '[0129] PREFLIGHT=TARGET_IDENTITY_VERIFIED (tenant key postgres.'"$REVIEW_REF"' routed to a managed remote Supabase database)'

snapshot() {
  PGPASSWORD="$P_PASS" DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" DB_USER="$DB_USER" DB_NAME="$DB_NAME" \
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

# --------------------------------------------------------------------------
# CLI transport. --linked resolves the direct IPv6 endpoint, which is exactly
# what could not be reached, so the transport is discovered rather than assumed.
# The dry-run is non-mutating, which is what makes it safe to use as the probe:
# a transport only qualifies if it produces the expected pending set.
# --------------------------------------------------------------------------
if ! supabase db push --help >"$HELP" 2>&1; then say 'PROMOTION_OUTCOME=NO_MUTATION_CLI_UNAVAILABLE'; evidence; exit 1; fi
grep -q -- '--dry-run' "$HELP" || { say 'STOP: CLI lacks --dry-run'; evidence; exit 1; }
YES_FLAG=""
if grep -q -- '--yes' "$HELP"; then YES_FLAG="--yes"
elif grep -qE '^[[:space:]]*-y,' "$HELP"; then YES_FLAG="-y"
else say 'STOP: CLI has no verified non-interactive confirmation flag'; evidence; exit 1; fi

pending_set() { grep -oE '0[0-9]{3}_[a-z0-9_]+\.sql' "$1" | sort -u | paste -sd, -; }
EXPECTED_PENDING="0129_harden_activity_events_client_privileges.sql"
TRANSPORT=none

if grep -q -- '--linked' "$HELP"; then
  if supabase db push --linked --dry-run </dev/null >"$DRY" 2>&1 && [ "$(pending_set "$DRY")" = "$EXPECTED_PENDING" ]; then
    TRANSPORT=linked
  fi
fi
if [ "$TRANSPORT" = none ] && grep -q -- '--db-url' "$HELP"; then
  # Environment binding first: it keeps the URL out of every process table.
  if SUPABASE_DB_URL="$REVIEW_DB_URL" supabase db push --dry-run </dev/null >"$DRY" 2>&1 \
     && [ "$(pending_set "$DRY")" = "$EXPECTED_PENDING" ]; then
    TRANSPORT=db-url-env
  elif supabase db push --db-url "$REVIEW_DB_URL" --dry-run </dev/null >"$DRY" 2>&1 \
     && [ "$(pending_set "$DRY")" = "$EXPECTED_PENDING" ]; then
    TRANSPORT=db-url-argv
  fi
fi
redacted "$DRY" >>"$LOG"
if [ "$TRANSPORT" = none ]; then
  say "PROMOTION_OUTCOME=NO_MUTATION_DRY_RUN_FAILED [pending=$(pending_set "$DRY")]"
  redacted "$DRY" | tail -5
  evidence; exit 1
fi
say "[0129] CLI transport=$TRANSPORT; dry-run pending set is exactly one migration"
if [ "$TRANSPORT" = db-url-argv ]; then
  say 'NOTE: this CLI has no environment binding for --db-url, so the connection'
  say '      string is visible in this machine process table for the duration of'
  say '      one push. Nothing is written to disk and every printed line is scrubbed.'
fi

say '[0129] applying exactly one pending migration to canonical Review'
case "$TRANSPORT" in
  linked)      supabase db push --linked $YES_FLAG </dev/null >"$PUSH" 2>&1 ;;
  db-url-env)  SUPABASE_DB_URL="$REVIEW_DB_URL" supabase db push $YES_FLAG </dev/null >"$PUSH" 2>&1 ;;
  db-url-argv) supabase db push --db-url "$REVIEW_DB_URL" $YES_FLAG </dev/null >"$PUSH" 2>&1 ;;
esac
RC=$?
redacted "$PUSH"
if [ "$RC" -ne 0 ]; then say 'PROMOTION_OUTCOME=UNKNOWN_INSPECT_BEFORE_ANY_RETRY'; evidence; exit 1; fi
if grep -qE 'pgdelta-target-ca\.crt|failed to cache migrations catalog' "$PUSH"; then
  say 'CLI_WARNING=NON_BLOCKING_CATALOG_CACHE_WARNING; POST decides applied state'
fi

if ! snapshot "$POST"; then say 'PROMOTION_OUTCOME=POST_QUERY_FAILED_DO_NOT_RETRY'; evidence; exit 1; fi
cat "$POST"
cp "$POST" "$PRE"
load_state
POST_STATE=$(classify_state)
if [ "$POST_STATE" != ALREADY_APPLIED_EXACTLY ]; then say 'PROMOTION_OUTCOME=POST_VERIFICATION_FAILED_DO_NOT_RETRY'; evidence; exit 1; fi
if ! PGPASSWORD="$P_PASS" DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" DB_USER="$DB_USER" DB_NAME="$DB_NAME" \
  bash scripts/review/verify-0129-activity-events-hardening-post.sh >>"$POST" 2>>"$LOG"; then
  say 'PROMOTION_OUTCOME=POST_BEHAVIOR_VERIFICATION_FAILED_DO_NOT_RETRY'; evidence; exit 1
fi
say 'PROMOTION_OUTCOME=APPLIED_AND_POST_VERIFIED'
evidence
