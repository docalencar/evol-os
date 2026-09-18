#!/usr/bin/env bash
#
# D-DB2 LOCAL database gate — historical Development plan origin boundary (0133).
#
#   bash scripts/local/verify-d-db2-plan-origin-boundary.sh
#
# Run it as its own process. Never source it, never `. ` it, never eval it: it is
# written to be executed, and a nonzero exit is a normal result that must not be
# able to close an interactive shell.
#
# WHY IT EXISTS
#
# 0133 is a migration and a security boundary. Static inspection of SQL text
# proves nothing about grants, definer semantics, trigger-enforced immutability or
# the actor matrix — only a real PostgreSQL does. The executor that authored this
# slice has no PostgreSQL, no Supabase CLI and no Docker, so the gates that decide
# it cannot run where the code was written. This file is how they get run, on a
# machine that has the toolchain.
#
# LOCAL ONLY. It never reads a Review credential, never contacts Review,
# Production or Legacy, and runs no hosted browser. `supabase db reset` destroys
# and rebuilds the LOCAL development database — that is its purpose.

set -uo pipefail   # NOT -e: every step is checked explicitly and fails closed.

say() { printf '%s\n' "$*"; }

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { say "STOP: cannot reach repository root"; exit 1; }

MIGRATION_0133="supabase/migrations/0133_create_development_plan_origin_read_boundary.sql"
ORIGIN_SUITE="supabase/tests/development_plan_origin_read_boundary.test.sql"
DEVELOPMENT_SUITE="supabase/tests/development_trusted_lifecycle_boundary.test.sql"
RETENTION_SUITE="supabase/tests/company_retention_pressure_boundary.test.sql"

say "[d-db2] repo: $REPO_ROOT"

# --------------------------------------------------------------------------
# 1. toolchain and candidate files
# --------------------------------------------------------------------------
for tool in supabase shasum; do
  command -v "$tool" >/dev/null 2>&1 || {
    say "STOP: '$tool' not found. This gate needs the real toolchain; it cannot be simulated."
    say "D_DB2_MAC_GATE=FAIL"
    exit 1
  }
done

MISSING=0
for f in "$MIGRATION_0133" "$ORIGIN_SUITE" "$DEVELOPMENT_SUITE" "$RETENTION_SUITE"; do
  [ -f "$f" ] || { say "STOP: missing $f"; MISSING=1; }
done
[ "$MISSING" -eq 0 ] || { say "D_DB2_MAC_GATE=FAIL"; exit 1; }

# --------------------------------------------------------------------------
# 2. fingerprint recorded before anything runs, so the summary always names the
#    exact content that was gated.
# --------------------------------------------------------------------------
SHA_0133=$(shasum -a 256 "$MIGRATION_0133" | cut -d' ' -f1)
SHA_SUITE=$(shasum -a 256 "$ORIGIN_SUITE" | cut -d' ' -f1)

RESET_LOG=$(mktemp -t ddb2reset.XXXXXX)
TEST_LOG=$(mktemp -t ddb2test.XXXXXX)

DB_RESET=FAIL
D_DB2_PGTAP=FAIL
D_DB2_ASSERTIONS=UNKNOWN
FULL_DB_SUITE=FAIL
FULL_DB_FILES=UNKNOWN
FULL_DB_ASSERTIONS=UNKNOWN
RETENTION_GATE=FAIL
DEVELOPMENT_GATE=FAIL

# --------------------------------------------------------------------------
# 3. full-history reset through 0133.
# --------------------------------------------------------------------------
say "[d-db2] 1/3 supabase db reset (full canonical history through 0133) ..."
if supabase db reset >"$RESET_LOG" 2>&1; then
  DB_RESET=PASS
  say "[d-db2]     DB_RESET=PASS (log: $RESET_LOG)"
else
  say "[d-db2]     DB_RESET=FAIL — migrations did not apply cleanly."
  say "Causal diagnostics:"
  grep -nE "ERROR:|CONTEXT:|DETAIL:|FATAL|failed" "$RESET_LOG" | head -25 | sed 's/^/  /'
  say "Full log: $RESET_LOG"
  say ""
  say "D_DB2_MAC_GATE=FAIL"
  say "DB_RESET=FAIL"
  say "MIGRATION_0133_SHA256=$SHA_0133"
  say "D_DB2_SUITE_SHA256=$SHA_SUITE"
  say "REVIEW_ACCESSED=NO"
  exit 1
fi

# --------------------------------------------------------------------------
# 4. the whole DB suite in ONE run. `supabase test db` runs every file under
#    supabase/tests, so the new origin suite, the D-DB1 suite and the retention
#    suite are all inside it. Each is then reported separately by reading THIS
#    run's output rather than by running it again against a database the first
#    run may already have changed.
# --------------------------------------------------------------------------
say "[d-db2] 2/3 supabase test db (full suite) ..."
if supabase test db >"$TEST_LOG" 2>&1; then
  FULL_DB_SUITE=PASS
else
  FULL_DB_SUITE=FAIL
fi

# pg_prove's aggregate line is the authoritative count.
FULL_DB_SUMMARY=$(sed -nE 's/^Files=([0-9]+), Tests=([0-9]+),.*/\1 \2/p' "$TEST_LOG" | tail -1)
if [ -n "$FULL_DB_SUMMARY" ]; then
  FULL_DB_FILES=${FULL_DB_SUMMARY%% *}
  FULL_DB_ASSERTIONS=${FULL_DB_SUMMARY#* }
else
  # pg_prove may omit its summary after an early psql bailout. A parser
  # uncertainty is not a factual zero and must not affect the verdict.
  FULL_DB_FILES=UNKNOWN
  FULL_DB_ASSERTIONS=UNKNOWN
fi

# Per-suite verdicts, read from the single run above.
verdict_for() {
  # $1 = suite basename fragment; echoes PASS or FAIL.
  if grep -q "$1" "$TEST_LOG"; then
    if grep -E "$1" "$TEST_LOG" | grep -qiE "fail|not ok"; then
      printf 'FAIL'
    else
      printf 'PASS'
    fi
  else
    # Expected to be part of the run; absence is not a pass.
    printf 'FAIL'
  fi
}

D_DB2_PGTAP=$(verdict_for "development_plan_origin_read_boundary")
DEVELOPMENT_GATE=$(verdict_for "development_trusted_lifecycle_boundary")
RETENTION_GATE=$(verdict_for "company_retention_pressure_boundary")

grep -q "development_plan_origin_read_boundary" "$TEST_LOG" \
  || say "[d-db2]     WARNING: the D-DB2 origin suite was not named in the test output."

# Per-file assertion count, taken from pg_prove's own per-file plan line when it
# is present. Counting `select ok(...)` lines in the source would be a guess, and
# a guess reported as a number is worse than UNKNOWN.
D_DB2_ASSERTIONS=$(sed -nE 's#.*development_plan_origin_read_boundary[^0-9]*\.\.[[:space:]]*ok[[:space:]]+([0-9]+).*#\1#p' "$TEST_LOG" | tail -1)
[ -n "$D_DB2_ASSERTIONS" ] || D_DB2_ASSERTIONS=UNKNOWN

if [ "$FULL_DB_SUITE" != PASS ]; then
  say "[d-db2]     FULL_DB_SUITE=FAIL. Classify every failure before touching code:"
  say "            REGRESSION | PRE_EXISTING | STALE_TEST | ENVIRONMENTAL |"
  say "            HARNESS_DEFECT | SECURITY_CONTRACT_FAILURE | DB_CONTRACT_DEFICIENCY |"
  say "            CONTRACT_CONFLICT | DOWNSTREAM_CASCADE"
  say ""
  say "Causal diagnostics (psql/plpgsql errors, in order):"
  grep -nE "ERROR:|CONTEXT:|DETAIL:|Bail out" "$TEST_LOG" | head -25 | sed 's/^/  /'
  say ""
  say "Assertion and plan failures:"
  grep -nE "not ok|Failed test|Bad plan|Looks like|Dubious|planned .* ran|Result: *FAIL" "$TEST_LOG" | head -40 | sed 's/^/  /'
  say ""
  say "Full log (complete, nothing elided): $TEST_LOG"
fi

# --------------------------------------------------------------------------
# 5. summary — machine-readable, pasteable, no secrets.
# --------------------------------------------------------------------------
say "[d-db2] 3/3 summary"
OVERALL=PASS
for v in "$DB_RESET" "$D_DB2_PGTAP" "$FULL_DB_SUITE" "$RETENTION_GATE" "$DEVELOPMENT_GATE"; do
  [ "$v" = PASS ] || OVERALL=FAIL
done

say ""
say "D_DB2_MAC_GATE=$OVERALL"
say "DB_RESET=$DB_RESET"
say "D_DB2_PGTAP=$D_DB2_PGTAP"
say "D_DB2_ASSERTIONS=$D_DB2_ASSERTIONS"
say "FULL_DB_SUITE=$FULL_DB_SUITE"
say "FULL_DB_FILES=$FULL_DB_FILES"
say "FULL_DB_ASSERTIONS=$FULL_DB_ASSERTIONS"
say "RETENTION_GATE=$RETENTION_GATE"
say "D_DB1_DEVELOPMENT_GATE=$DEVELOPMENT_GATE"
say "MIGRATION_0133_SHA256=$SHA_0133"
say "D_DB2_SUITE_SHA256=$SHA_SUITE"
say "REVIEW_ACCESSED=NO"
say "REVIEW_DB_0133=NOT_APPLIED"
say ""
say "Logs: reset=$RESET_LOG test=$TEST_LOG"

[ "$OVERALL" = PASS ] || exit 1
exit 0
