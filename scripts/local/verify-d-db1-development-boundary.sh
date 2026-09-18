#!/usr/bin/env bash
#
# D-DB1 LOCAL database gate — Development trusted boundary (0130–0132).
#
#   bash scripts/local/verify-d-db1-development-boundary.sh
#
# Run it as its own process. Never source it, never `. ` it, never eval it:
# it is written to be executed, and a nonzero exit is a normal result that must
# not be able to close an interactive shell.
#
# WHY IT EXISTS
#
# The executor that authored D-DB1 has no PostgreSQL, no Supabase CLI and no
# Docker, so the gates that actually decide this slice cannot run where the code
# is written. They are not optional and they were not faked: this file is how
# they get run, on a machine that has the toolchain.
#
# LOCAL ONLY. It never reads a Review credential, never contacts Review,
# Production or Legacy, and runs no hosted browser. `supabase db reset` destroys
# and rebuilds the LOCAL development database — that is its purpose.

set -uo pipefail   # NOT -e: every step is checked explicitly and fails closed.

say() { printf '%s\n' "$*"; }

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { say "STOP: cannot reach repository root"; exit 1; }

MIGRATION_0130="supabase/migrations/0130_create_development_trusted_lifecycle_boundary.sql"
MIGRATION_0131="supabase/migrations/0131_create_development_template_authoring_boundary.sql"
MIGRATION_0132="supabase/migrations/0132_extend_development_template_application_authorization.sql"
DEVELOPMENT_SUITE="supabase/tests/development_trusted_lifecycle_boundary.test.sql"
RETENTION_SUITE="supabase/tests/company_retention_pressure_boundary.test.sql"

say "[d-db1] repo: $REPO_ROOT"

# --------------------------------------------------------------------------
# 1. repository and toolchain assumptions
# --------------------------------------------------------------------------
for tool in supabase shasum; do
  command -v "$tool" >/dev/null 2>&1 || {
    say "STOP: '$tool' not found. This gate needs the real toolchain; it cannot be simulated."
    say "D_DB1_MAC_GATE=FAIL"
    exit 1
  }
done

MISSING=0
for f in "$MIGRATION_0130" "$MIGRATION_0131" "$MIGRATION_0132" "$DEVELOPMENT_SUITE" "$RETENTION_SUITE"; do
  [ -f "$f" ] || { say "STOP: missing $f"; MISSING=1; }
done
[ "$MISSING" -eq 0 ] || { say "D_DB1_MAC_GATE=FAIL"; exit 1; }

# --------------------------------------------------------------------------
# 2. candidate fingerprints — recorded before anything runs, so the summary
#    always names the exact content that was gated.
# --------------------------------------------------------------------------
SHA_0130=$(shasum -a 256 "$MIGRATION_0130" | cut -d' ' -f1)
SHA_0131=$(shasum -a 256 "$MIGRATION_0131" | cut -d' ' -f1)
SHA_0132=$(shasum -a 256 "$MIGRATION_0132" | cut -d' ' -f1)

RESET_LOG=$(mktemp -t ddb1reset.XXXXXX)
TEST_LOG=$(mktemp -t ddb1test.XXXXXX)

DB_RESET=FAIL
DEVELOPMENT_PGTAP=FAIL
DEVELOPMENT_ASSERTIONS=0
FULL_DB_SUITE=FAIL
FULL_DB_FILES=0
FULL_DB_ASSERTIONS=0
RETENTION_GATE=FAIL

# --------------------------------------------------------------------------
# 3. full-history reset. 0130 changed after the previous session's reset, so
#    this is re-run rather than assumed.
# --------------------------------------------------------------------------
say "[d-db1] 1/3 supabase db reset (full canonical history through 0132) ..."
if supabase db reset >"$RESET_LOG" 2>&1; then
  DB_RESET=PASS
  say "[d-db1]     DB_RESET=PASS (log: $RESET_LOG)"
else
  say "[d-db1]     DB_RESET=FAIL — migrations did not apply cleanly."
  say "Causal diagnostics:"
  grep -nE "ERROR:|CONTEXT:|DETAIL:|FATAL|failed" "$RESET_LOG" | head -25 | sed 's/^/  /'
  say "Full log: $RESET_LOG"
  say ""
  say "D_DB1_MAC_GATE=FAIL"
  say "DB_RESET=FAIL"
  say "MIGRATION_0130_SHA256=$SHA_0130"
  say "MIGRATION_0131_SHA256=$SHA_0131"
  say "MIGRATION_0132_SHA256=$SHA_0132"
  say "REVIEW_ACCESSED=NO"
  exit 1
fi

# --------------------------------------------------------------------------
# 4. the whole DB suite in one run — `supabase test db` is the project's
#    established mechanism and runs every file under supabase/tests, so the
#    Development suite and the retention suite are both inside it. They are
#    then reported separately by reading THIS run's output, rather than by
#    running them a second time against a database the first run may have
#    already changed.
# --------------------------------------------------------------------------
say "[d-db1] 2/3 supabase test db (full suite) ..."
if supabase test db >"$TEST_LOG" 2>&1; then
  FULL_DB_SUITE=PASS
else
  FULL_DB_SUITE=FAIL
fi

FULL_DB_FILES=$(grep -cE "^# .*\.sql|\.sql *\.\.+|Running tests" "$TEST_LOG" 2>/dev/null || echo 0)
FULL_DB_ASSERTIONS=$(grep -cE "^ok [0-9]+|^not ok [0-9]+" "$TEST_LOG" 2>/dev/null || echo 0)

# Per-suite verdicts, read from the single run above.
if grep -q "development_trusted_lifecycle_boundary" "$TEST_LOG"; then
  if grep -E "development_trusted_lifecycle_boundary" "$TEST_LOG" | grep -qiE "fail|not ok"; then
    DEVELOPMENT_PGTAP=FAIL
  else
    DEVELOPMENT_PGTAP=PASS
  fi
else
  # The suite is expected to be part of the run; absence is not a pass.
  DEVELOPMENT_PGTAP=FAIL
  say "[d-db1]     WARNING: the Development suite was not named in the test output."
fi
DEVELOPMENT_ASSERTIONS=$(grep -cE "^select (ok|is|isnt|throws_ok|lives_ok|has_function|has_table|has_column|results_eq|set_eq|matches)\(" "$DEVELOPMENT_SUITE" 2>/dev/null || echo 0)

if grep -q "company_retention_pressure_boundary" "$TEST_LOG"; then
  if grep -E "company_retention_pressure_boundary" "$TEST_LOG" | grep -qiE "fail|not ok"; then
    RETENTION_GATE=FAIL
  else
    RETENTION_GATE=PASS
  fi
else
  RETENTION_GATE=FAIL
  say "[d-db1]     WARNING: the retention suite was not named in the test output."
fi

if [ "$FULL_DB_SUITE" != PASS ]; then
  say "[d-db1]     FULL_DB_SUITE=FAIL. Classify every failure before touching code:"
  say "            REGRESSION | PRE_EXISTING | STALE_TEST | ENVIRONMENTAL | DOWNSTREAM_CASCADE"
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
say "[d-db1] 3/3 summary"
OVERALL=PASS
for verdict in "$DB_RESET" "$DEVELOPMENT_PGTAP" "$FULL_DB_SUITE" "$RETENTION_GATE"; do
  [ "$verdict" = PASS ] || OVERALL=FAIL
done

say ""
say "D_DB1_MAC_GATE=$OVERALL"
say "DB_RESET=$DB_RESET"
say "DEVELOPMENT_PGTAP=$DEVELOPMENT_PGTAP"
say "DEVELOPMENT_ASSERTIONS=$DEVELOPMENT_ASSERTIONS"
say "FULL_DB_SUITE=$FULL_DB_SUITE"
say "FULL_DB_FILES=$FULL_DB_FILES"
say "FULL_DB_ASSERTIONS=$FULL_DB_ASSERTIONS"
say "RETENTION_GATE=$RETENTION_GATE"
say "MIGRATION_0130_SHA256=$SHA_0130"
say "MIGRATION_0131_SHA256=$SHA_0131"
say "MIGRATION_0132_SHA256=$SHA_0132"
say "REVIEW_ACCESSED=NO"
say ""
say "Logs: reset=$RESET_LOG test=$TEST_LOG"

[ "$OVERALL" = PASS ] || exit 1
exit 0
