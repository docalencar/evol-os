#!/usr/bin/env bash
#
# LOCAL database gate for migration 0129.
#
#   bash scripts/review/run-0129-local-db-gate.sh
#
# WHY THIS EXISTS
#
# promotion-tooling-guards-0129.test.mjs pattern-matches the promotion scripts;
# it never sends their SQL to a PostgreSQL server. The 0128 gate deliberately
# skipped PRE for a defensible reason — `supabase db reset` always applies every
# migration, so a freshly reset database is never in the pre-migration state —
# and the consequence was that the 0129 PRE snapshot's first contact with a real
# planner was canonical Review. Twice now a snapshot defect has been discovered
# that way: a FILTER clause on a non-aggregate in the 0128 runner, and before it
# a "char" concatenation in the 0127 verifier. Pattern matching cannot catch
# either. Only a server can.
#
# So this gate does what the 0128 one could not: it CONSTRUCTS the pre-migration
# ACL state locally, runs the real PRE snapshot against it, and then puts the
# database back. The point is not to reproduce Review byte for byte — the ACL
# fingerprint is environment-specific and deliberately not asserted here — it is
# to prove that every statement parses, plans and executes, and that the
# discriminators the promotion classifier depends on actually move when the
# underlying privileges move.
#
# WHAT IT RUNS, IN ORDER
#
#   1. supabase db reset            — rebuild LOCAL from migrations 0001..0129
#   2. supabase test db             — the repository's official pgTAP validation
#   3. POST verifier                — the applied contract, structural + behavioral
#   4. PRE snapshot, broad ACL      — grant the eight client privileges, execute
#                                     the real PRE SQL, assert the discriminators
#   5. restore + re-prove           — revoke, execute PRE again, assert they moved
#
# SAFETY
#
# LOCAL ONLY. It never reads a remote credential, never contacts Review or
# Production, and refuses to run against anything but a loopback host. Steps 4
# and 5 do grant and revoke on the local database — that is the fixture, and it
# is why they are paired: step 5 restores exactly what step 4 changed, and then
# proves the restoration by measurement rather than by assertion.
#
# Never source it, never `. ` it, never eval it. It runs as its own process.

set -uo pipefail   # NOT -e: every step is checked explicitly and fails closed.

: "${DATABASE_URL:=postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
: "${DB_HOST:=127.0.0.1}"
: "${DB_PORT:=54322}"
: "${DB_USER:=postgres}"
: "${DB_NAME:=postgres}"
: "${PGPASSWORD:=postgres}"
export PGPASSWORD

say() { printf '%s\n' "$*"; }

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { say "STOP: cannot reach repository root"; exit 1; }
say "[gate-0129] repo: $REPO_ROOT"

case "$DATABASE_URL" in
  *@127.0.0.1:*|*@localhost:*|*@[::1]:*) ;;
  *)
    say "STOP: DATABASE_URL does not point at a loopback host."
    say "      This gate is LOCAL ONLY and it MUTATES privileges. Review promotion"
    say "      has its own approved runner."
    exit 1
    ;;
esac
case "$DB_HOST" in
  127.0.0.1|localhost|::1) ;;
  *) say "STOP: DB_HOST '$DB_HOST' is not loopback. Refusing."; exit 1;;
esac
say "[gate-0129] target: local Supabase database (loopback)"

for tool in supabase psql shasum; do
  command -v "$tool" >/dev/null 2>&1 || { say "STOP: '$tool' not found. This gate needs the real toolchain; it cannot be simulated."; exit 1; }
done

MIGRATION_FILE="supabase/migrations/0129_harden_activity_events_client_privileges.sql"
PGTAP_FILE="supabase/tests/activity_events_client_privilege_hardening.test.sql"
PRE_VERIFIER="scripts/review/verify-0129-activity-events-hardening-pre.sh"
POST_VERIFIER="scripts/review/verify-0129-activity-events-hardening-post.sh"
for f in "$MIGRATION_FILE" "$PGTAP_FILE" "$PRE_VERIFIER" "$POST_VERIFIER"; do
  [ -f "$f" ] || { say "STOP: $f not found"; exit 1; }
done
say "[gate-0129] migration sha256 = $(shasum -a 256 "$MIGRATION_FILE" | cut -d' ' -f1)"
say "[gate-0129] pgTAP sha256     = $(shasum -a 256 "$PGTAP_FILE" | cut -d' ' -f1)"
say ""

RESET_LOG=$(mktemp -t evol0129gatereset.XXXXXX)
TEST_LOG=$(mktemp -t evol0129gatepgtap.XXXXXX)
SNAP_BROAD=$(mktemp -t evol0129gatebroad.XXXXXX)
SNAP_CLOSED=$(mktemp -t evol0129gateclosed.XXXXXX)
FIXTURE_LOG=$(mktemp -t evol0129gatefixture.XXXXXX)

psql_local() {
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 --no-psqlrc -At </dev/null "$@"
}
snapshot() {
  DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" DB_USER="$DB_USER" DB_NAME="$DB_NAME" PGPASSWORD="$PGPASSWORD" \
    bash "$PRE_VERIFIER" >"$1" 2>&1
}
label() { grep -m1 "^$1=" "$2" | cut -d= -f2-; }

EXPECTED_LABELS="MIGRATION_0128_COUNT MIGRATION_0129_COUNT ACTIVITY_RELACL ACTIVITY_ACL_FINGERPRINT
ACTIVITY_SELECT_PUBLIC ACTIVITY_SELECT_ANON ACTIVITY_SELECT_AUTHENTICATED ACTIVITY_CLIENT_PRIVILEGES
ACTIVITY_SERVICE_PRIVILEGES ACTIVITY_POLICY_COUNT ACTIVITY_POLICY_FINGERPRINT ACTIVITY_RLS_ENABLED
TIMELINE_FILTERS_COMPANY TIMELINE_SECURITY_DEFINER TIMELINE_EXECUTE_AUTHENTICATED
ENTITY_TIMELINE_STILL_PRESENT BRIDGE_PRESENT COMPOSITE_FKS_VALIDATED RPC_EXACT_SIGNATURES
FEEDBACK_WRITE_PRIVILEGES FEEDBACK_WRITE_POLICIES"

FAIL=0
expect() {  # expect <label> <expected> <file> <phase>
  local actual; actual=$(label "$1" "$3")
  if [ "$actual" != "$2" ]; then say "  FAIL [$4] $1 expected=$2 actual=${actual:-<absent>}"; FAIL=1
  else say "  ok   [$4] $1=$2"; fi
}

# --------------------------------------------------------------------------
say "[gate-0129] 1/5 supabase db reset ..."
if ! supabase db reset >"$RESET_LOG" 2>&1; then
  say "GATE FAIL at APPLY. 0129 did not apply cleanly to a fresh local database."
  tail -40 "$RESET_LOG"; say "Full log: $RESET_LOG"; exit 1
fi
say "[gate-0129]     APPLY PASS (log: $RESET_LOG)"

# --------------------------------------------------------------------------
say "[gate-0129] 2/5 supabase test db ..."
if ! supabase test db >"$TEST_LOG" 2>&1; then
  say "GATE FAIL at pgTAP. Classify every failure before touching code:"
  say "  REGRESSION | PRE_EXISTING | STALE_TEST | ENVIRONMENTAL | HARNESS_DEFECT"
  say ""
  say "Causal diagnostics (psql/plpgsql errors, in order):"
  grep -nE "ERROR:|CONTEXT:|DETAIL:|Bail out" "$TEST_LOG" | head -25 | sed 's/^/  /'
  say "Assertion and plan failures:"
  grep -nE "not ok|Failed test|Bad plan|Looks like|Dubious|planned .* ran|Result: *FAIL" "$TEST_LOG" | head -40 | sed 's/^/  /'
  say "Full log: $TEST_LOG"
  exit 1
fi
say "[gate-0129]     pgTAP PASS (log: $TEST_LOG)"

# --------------------------------------------------------------------------
say "[gate-0129] 3/5 POST verifier against the applied local database ..."
if ! DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" DB_USER="$DB_USER" DB_NAME="$DB_NAME" PGPASSWORD="$PGPASSWORD" \
  bash "$POST_VERIFIER"; then
  say "GATE FAIL at POST. The applied shape is not the reviewed shape."
  exit 1
fi
say "[gate-0129]     POST PASS"

# --------------------------------------------------------------------------
# 4. The part the 0128 gate could not do: execute the real PRE snapshot against
#    a deliberately constructed broad-ACL state.
# --------------------------------------------------------------------------
say "[gate-0129] 4/5 PRE snapshot against a reconstructed broad-ACL state ..."
if ! psql_local -c "grant select, insert, update, delete, truncate, references, trigger, maintain on table public.activity_events to anon, authenticated" >"$FIXTURE_LOG" 2>&1; then
  say "GATE FAIL: could not construct the broad-ACL fixture."; cat "$FIXTURE_LOG"; exit 1
fi

restore() {
  psql_local -c "revoke select, insert, update, delete, truncate, references, trigger, maintain on table public.activity_events from public, anon, authenticated" >>"$FIXTURE_LOG" 2>&1
}
trap 'restore' EXIT

if ! snapshot "$SNAP_BROAD"; then
  say "GATE FAIL: the PRE snapshot SQL did not execute. This is the failure mode"
  say "           this gate exists to catch before Review ever sees it."
  cat "$SNAP_BROAD"
  exit 1
fi
say "[gate-0129]     PRE SQL executed: parser, planner and executor all accepted it"

MISSING=""
for l in $EXPECTED_LABELS; do
  grep -q "^$l=" "$SNAP_BROAD" || MISSING="$MISSING $l"
done
if [ -n "$MISSING" ]; then
  say "  FAIL [broad] labels absent (a statement returned no row):$MISSING"; FAIL=1
else
  say "  ok   [broad] all 21 snapshot labels present"
fi
expect ACTIVITY_CLIENT_PRIVILEGES 16 "$SNAP_BROAD" broad
expect ACTIVITY_SELECT_ANON true "$SNAP_BROAD" broad
expect ACTIVITY_SELECT_AUTHENTICATED true "$SNAP_BROAD" broad
expect ACTIVITY_SELECT_PUBLIC false "$SNAP_BROAD" broad
expect ACTIVITY_SERVICE_PRIVILEGES 8 "$SNAP_BROAD" broad
expect ACTIVITY_POLICY_COUNT 2 "$SNAP_BROAD" broad
expect ACTIVITY_RLS_ENABLED true "$SNAP_BROAD" broad
expect TIMELINE_FILTERS_COMPANY true "$SNAP_BROAD" broad
expect TIMELINE_SECURITY_DEFINER true "$SNAP_BROAD" broad
expect TIMELINE_EXECUTE_AUTHENTICATED true "$SNAP_BROAD" broad
expect ENTITY_TIMELINE_STILL_PRESENT true "$SNAP_BROAD" broad
expect BRIDGE_PRESENT true "$SNAP_BROAD" broad
expect COMPOSITE_FKS_VALIDATED 7 "$SNAP_BROAD" broad
expect RPC_EXACT_SIGNATURES 5 "$SNAP_BROAD" broad
expect FEEDBACK_WRITE_PRIVILEGES 0 "$SNAP_BROAD" broad
expect FEEDBACK_WRITE_POLICIES 0 "$SNAP_BROAD" broad

# --------------------------------------------------------------------------
# 5. Restore, and prove the restoration by measuring it. An assertion that the
#    discriminator MOVED is what makes step 4 meaningful: a snapshot that always
#    reports 16 would have passed step 4 and be useless in promotion.
# --------------------------------------------------------------------------
say "[gate-0129] 5/5 restoring the hardened state and re-measuring ..."
restore
trap - EXIT
if ! snapshot "$SNAP_CLOSED"; then
  say "GATE FAIL: the PRE snapshot SQL did not execute after restore."; cat "$SNAP_CLOSED"; exit 1
fi
expect ACTIVITY_CLIENT_PRIVILEGES 0 "$SNAP_CLOSED" closed
expect ACTIVITY_SELECT_ANON false "$SNAP_CLOSED" closed
expect ACTIVITY_SELECT_AUTHENTICATED false "$SNAP_CLOSED" closed
expect ACTIVITY_SELECT_PUBLIC false "$SNAP_CLOSED" closed
expect ACTIVITY_SERVICE_PRIVILEGES 8 "$SNAP_CLOSED" closed

BROAD_FP=$(label ACTIVITY_ACL_FINGERPRINT "$SNAP_BROAD")
CLOSED_FP=$(label ACTIVITY_ACL_FINGERPRINT "$SNAP_CLOSED")
if [ -z "$BROAD_FP" ] || [ "$BROAD_FP" = "$CLOSED_FP" ]; then
  say "  FAIL [moved] the ACL fingerprint did not change when the privileges did"; FAIL=1
else
  say "  ok   [moved] ACL fingerprint responds to privilege change"
fi

say ""
if [ "$FAIL" -ne 0 ]; then
  say "[gate-0129] LOCAL DB GATE FAIL"
  say "            Evidence: broad=$SNAP_BROAD closed=$SNAP_CLOSED fixture=$FIXTURE_LOG"
  exit 1
fi
say "[gate-0129] LOCAL DB GATE PASS"
say "            APPLY     = PASS"
say "            pgTAP     = PASS"
say "            POST      = PASS"
say "            PRE SQL   = EXECUTED against a real PostgreSQL server"
say "            RESTORED  = local privileges returned to the hardened state"
say ""
say "            Report this result back before any commit, push, PR or promotion."
exit 0
