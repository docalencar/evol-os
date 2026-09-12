#!/usr/bin/env bash
#
# E5-DB1 LOCAL database gate for migration 0128.
#
#   bash scripts/review/run-0128-local-db-gate.sh
#
# WHY THIS EXISTS
#
# The implementation environment has no PostgreSQL, no Supabase CLI and no
# pg_prove, so the four database gates could not be executed where the code was
# written. They are not optional and they were not faked: this file is how they
# get run, on a machine that has the toolchain, before anything is committed or
# promoted.
#
# WHAT IT RUNS, IN ORDER
#
#   1. supabase db reset   — rebuilds LOCAL from migrations 0001..0128
#   2. supabase test db    — the repository's official pgTAP validation
#   3. verify-0128-...-post.sh — structural proof of the applied contract
#
# The PRE verifier is deliberately NOT in this sequence. `db reset` always
# applies every migration, so there is no moment at which a freshly reset local
# database is in the pre-0128 state. PRE belongs to the promotion gate, against
# the target being promoted, and is run separately:
#
#   DATABASE_URL="postgresql://..." bash scripts/review/verify-0128-trusted-feedback-pre.sh
#
# SAFETY
#
# LOCAL ONLY. This script never reads a remote credential, never contacts
# Review, never contacts Production, and refuses to run if DATABASE_URL points
# anywhere but a loopback host. `supabase db reset` destroys and rebuilds the
# LOCAL development database — that is its purpose and it touches nothing else.
#
# Never source it, never `. ` it, never eval it. It runs as its own process.

set -uo pipefail   # NOT -e: every step is checked explicitly and fails closed.

: "${DATABASE_URL:=postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

say() { printf '%s\n' "$*"; }

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { say "STOP: cannot reach repository root"; exit 1; }

say "[gate-0128] repo: $REPO_ROOT"

# --------------------------------------------------------------------------
# Refuse anything that is not local. The host is checked, not trusted.
# --------------------------------------------------------------------------
case "$DATABASE_URL" in
  *@127.0.0.1:*|*@localhost:*|*@[::1]:*) ;;
  *)
    say "STOP: DATABASE_URL does not point at a loopback host."
    say "      This gate is LOCAL ONLY. Review promotion has its own approved runner."
    exit 1
    ;;
esac
say "[gate-0128] target: local Supabase database (loopback)"

for tool in supabase psql shasum; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    say "STOP: '$tool' not found. This gate needs the real toolchain; it cannot be simulated."
    exit 1
  fi
done

MIGRATION_FILE="supabase/migrations/0128_create_trusted_feedback_mutation_boundary.sql"
PGTAP_FILE="supabase/tests/trusted_feedback_mutation_boundary.test.sql"
TIMELINE_TEST="supabase/tests/tenant_activity_timeline_read_boundary.test.sql"

for f in "$MIGRATION_FILE" "$PGTAP_FILE" "$TIMELINE_TEST"; do
  if [ ! -f "$f" ]; then say "STOP: $f not found"; exit 1; fi
done

say "[gate-0128] migration sha256      = $(shasum -a 256 "$MIGRATION_FILE" | cut -d' ' -f1)"
say "[gate-0128] feedback pgTAP sha256 = $(shasum -a 256 "$PGTAP_FILE" | cut -d' ' -f1)"
say "[gate-0128] timeline pgTAP sha256 = $(shasum -a 256 "$TIMELINE_TEST" | cut -d' ' -f1)"
say ""

RESET_LOG=$(mktemp -t evol0128reset.XXXXXX)
TEST_LOG=$(mktemp -t evol0128pgtap.XXXXXX)

# --------------------------------------------------------------------------
# 1. APPLY
# --------------------------------------------------------------------------
say "[gate-0128] 1/3 supabase db reset ..."
if ! supabase db reset >"$RESET_LOG" 2>&1; then
  say "GATE FAIL at APPLY. 0128 did not apply cleanly to a fresh local database."
  say "Last 40 lines:"
  tail -40 "$RESET_LOG"
  say "Full log: $RESET_LOG"
  exit 1
fi
say "[gate-0128]     APPLY PASS (log: $RESET_LOG)"

# --------------------------------------------------------------------------
# 2. pgTAP
# --------------------------------------------------------------------------
say "[gate-0128] 2/3 supabase test db ..."
if ! supabase test db >"$TEST_LOG" 2>&1; then
  say "GATE FAIL at pgTAP. Classify every failure before touching code:"
  say "  REGRESSION | PRE_EXISTING | STALE_TEST | ENVIRONMENTAL | HARNESS_DEFECT"
  say ""
  # The first run of this gate printed an empty "Failing lines:" section while
  # the log plainly contained `ERROR:`, `Failed test` and `Bad plan`. The old
  # pattern only looked for `^not ok`, which a suite that ABORTS never emits —
  # a fixture that violates an invariant dies at the ERROR, and the causal line
  # was the one line not shown. These patterns are anchored nowhere and cover
  # every way a pgTAP run can fail, with the causal diagnostics first.
  say "Causal diagnostics (psql/plpgsql errors, in order):"
  grep -nE "ERROR:|CONTEXT:|DETAIL:|Bail out" "$TEST_LOG" | head -25 | sed 's/^/  /'
  say ""
  say "Assertion and plan failures:"
  grep -nE "not ok|Failed test|Bad plan|Looks like|Dubious|planned .* ran|Result: *FAIL" "$TEST_LOG" | head -40 | sed 's/^/  /'
  say ""
  say "Per-file result tail:"
  grep -nE "^(ok|not ok) +[0-9]+ +- +.*\.sql|Result:" "$TEST_LOG" | tail -15 | sed 's/^/  /'
  say ""
  say "Full log (complete, nothing elided): $TEST_LOG"
  exit 1
fi
say "[gate-0128]     pgTAP PASS (log: $TEST_LOG)"
grep -cE "^ok " "$TEST_LOG" 2>/dev/null | sed 's/^/[gate-0128]     assertions passed: /'

# --------------------------------------------------------------------------
# 3. POST
# --------------------------------------------------------------------------
say "[gate-0128] 3/3 structural POST verification ..."
if ! DATABASE_URL="$DATABASE_URL" bash scripts/review/verify-0128-trusted-feedback-post.sh; then
  say "GATE FAIL at POST. The applied shape is not the reviewed shape."
  exit 1
fi

say ""
say "[gate-0128] LOCAL DB GATE PASS"
say "            APPLY  = PASS"
say "            pgTAP  = PASS"
say "            POST   = PASS"
say ""
say "            Report this result back before any commit, push, PR or promotion."
exit 0
