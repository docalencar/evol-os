#!/usr/bin/env bash
#
# D-SEC1 LOCAL database gate — Development ledger privacy hardening (0134).
#
#   bash scripts/local/verify-d-sec1-ledger-closure.sh
#
# Run it as its own process. Never source it, never eval it: a nonzero exit is a
# normal result and must not be able to close an interactive shell.
#
# A privilege revoke is exactly the kind of change that looks trivial in a diff
# and is decided entirely by the server: whether the SECURITY DEFINER readers
# still work, whether RLS was forced, whether any other fingerprint moved. Static
# inspection cannot answer any of that. This gate makes a real PostgreSQL answer
# it before the migration is ever proposed for promotion.
#
# LOCAL ONLY. It never reads a Review credential, never contacts Review,
# Production or Legacy, and runs no hosted browser. `supabase db reset` destroys
# and rebuilds the LOCAL database — that is its purpose.

set -uo pipefail   # NOT -e: every step is checked explicitly and fails closed.

say() { printf '%s\n' "$*"; }

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { say "STOP: cannot reach repository root"; exit 1; }

MIGRATION="supabase/migrations/0134_close_development_ledger_direct_read.sql"
CLOSURE_SUITE="supabase/tests/development_ledger_direct_read_closure.test.sql"
ORIGIN_SUITE="supabase/tests/development_plan_origin_read_boundary.test.sql"
DETERMINISTIC_SUITE="supabase/tests/deterministic_template_application_infrastructure.test.sql"
RETENTION_SUITE="supabase/tests/company_retention_pressure_boundary.test.sql"
DEVELOPMENT_SUITE="supabase/tests/development_trusted_lifecycle_boundary.test.sql"

say "[d-sec1] repo: $REPO_ROOT"

for tool in supabase shasum; do
  command -v "$tool" >/dev/null 2>&1 || {
    say "STOP: '$tool' not found. This gate needs the real toolchain; it cannot be simulated."
    say "D_SEC1_LOCAL_GATE=FAIL"; exit 1; }
done

MISSING=0
for f in "$MIGRATION" "$CLOSURE_SUITE" "$ORIGIN_SUITE" "$DETERMINISTIC_SUITE" \
         "$RETENTION_SUITE" "$DEVELOPMENT_SUITE"; do
  [ -f "$f" ] || { say "STOP: missing $f"; MISSING=1; }
done
[ "$MISSING" -eq 0 ] || { say "D_SEC1_LOCAL_GATE=FAIL"; exit 1; }

SHA_0134=$(shasum -a 256 "$MIGRATION" | cut -d' ' -f1)
SHA_CLOSURE=$(shasum -a 256 "$CLOSURE_SUITE" | cut -d' ' -f1)
say "[d-sec1] migration sha256 = $SHA_0134"

RESET_LOG=$(mktemp -t dsec1reset.XXXXXX)
TEST_LOG=$(mktemp -t dsec1test.XXXXXX)

DB_RESET=FAIL
CLOSURE_PGTAP=FAIL
FULL_DB_SUITE=FAIL
FULL_DB_FILES=UNKNOWN
FULL_DB_ASSERTIONS=UNKNOWN
RETENTION_GATE=FAIL
ORIGIN_GATE=FAIL
DETERMINISTIC_GATE=FAIL
DEVELOPMENT_GATE=FAIL

# --------------------------------------------------------------------------
# 1. full canonical history through 0134
# --------------------------------------------------------------------------
say "[d-sec1] 1/3 supabase db reset ..."
if supabase db reset >"$RESET_LOG" 2>&1; then
  DB_RESET=PASS; say "[d-sec1]     DB_RESET=PASS"
else
  say "[d-sec1]     DB_RESET=FAIL — migrations did not apply cleanly."
  grep -nE "ERROR:|CONTEXT:|DETAIL:|FATAL|failed" "$RESET_LOG" | head -25 | sed 's/^/  /'
  say "Full log: $RESET_LOG"
  say ""; say "D_SEC1_LOCAL_GATE=FAIL"; say "DB_RESET=FAIL"
  say "MIGRATION_0134_SHA256=$SHA_0134"; say "REVIEW_ACCESSED=NO"
  exit 1
fi

# --------------------------------------------------------------------------
# 2. the whole DB suite in ONE run. The closure suite, the 0133 origin suite,
#    the deterministic-infrastructure suite whose assertions this slice
#    re-anchored, retention and the D-DB1 Development suite are all inside it.
#    Each verdict is then read from THIS run rather than re-running anything
#    against a database the first run may already have changed.
# --------------------------------------------------------------------------
say "[d-sec1] 2/3 supabase test db (full suite) ..."
if supabase test db >"$TEST_LOG" 2>&1; then FULL_DB_SUITE=PASS; else FULL_DB_SUITE=FAIL; fi

SUMMARY=$(sed -nE 's/^Files=([0-9]+), Tests=([0-9]+),.*/\1 \2/p' "$TEST_LOG" | tail -1)
if [ -n "$SUMMARY" ]; then
  FULL_DB_FILES=${SUMMARY%% *}; FULL_DB_ASSERTIONS=${SUMMARY#* }
else
  # pg_prove may omit its aggregate line after an early psql bailout. A parser
  # uncertainty is not a factual zero and must not affect the verdict.
  FULL_DB_FILES=UNKNOWN; FULL_DB_ASSERTIONS=UNKNOWN
fi

verdict_for() {
  if grep -q "$1" "$TEST_LOG"; then
    if grep -E "$1" "$TEST_LOG" | grep -qiE "fail|not ok"; then printf 'FAIL'; else printf 'PASS'; fi
  else
    printf 'FAIL'   # expected in the run; absence is not a pass
  fi
}
CLOSURE_PGTAP=$(verdict_for "development_ledger_direct_read_closure")
ORIGIN_GATE=$(verdict_for "development_plan_origin_read_boundary")
DETERMINISTIC_GATE=$(verdict_for "deterministic_template_application_infrastructure")
RETENTION_GATE=$(verdict_for "company_retention_pressure_boundary")
DEVELOPMENT_GATE=$(verdict_for "development_trusted_lifecycle_boundary")

grep -q "development_ledger_direct_read_closure" "$TEST_LOG" \
  || say "[d-sec1]     WARNING: the D-SEC1 closure suite was not named in the test output."

if [ "$FULL_DB_SUITE" != PASS ]; then
  say "[d-sec1]     FULL_DB_SUITE=FAIL. Classify every failure before touching code:"
  say "            REGRESSION | PRE_EXISTING | STALE_TEST | ENVIRONMENTAL | HARNESS_DEFECT |"
  say "            SECURITY_CONTRACT_FAILURE | DB_CONTRACT_DEFICIENCY | CONTRACT_CONFLICT |"
  say "            DOWNSTREAM_CASCADE"
  say ""
  say "A suite that fails ONLY on a direct-read expectation is STALE_TEST, not a"
  say "regression: this slice deliberately closes that read. A suite that fails"
  say "because a trusted function can no longer reach the ledger is the opposite —"
  say "that is SECURITY_CONTRACT_FAILURE and the revoke is wrong."
  say ""
  say "Causal diagnostics:"
  grep -nE "ERROR:|CONTEXT:|DETAIL:|Bail out" "$TEST_LOG" | head -25 | sed 's/^/  /'
  say ""
  say "Assertion and plan failures:"
  grep -nE "not ok|Failed test|Bad plan|Looks like|Dubious|planned .* ran|Result: *FAIL" "$TEST_LOG" | head -40 | sed 's/^/  /'
  say ""
  say "Full log: $TEST_LOG"
fi

# --------------------------------------------------------------------------
# 3. summary — machine-readable, pasteable, no secrets.
# --------------------------------------------------------------------------
say "[d-sec1] 3/3 summary"
OVERALL=PASS
for v in "$DB_RESET" "$CLOSURE_PGTAP" "$FULL_DB_SUITE" "$ORIGIN_GATE" \
         "$DETERMINISTIC_GATE" "$RETENTION_GATE" "$DEVELOPMENT_GATE"; do
  [ "$v" = PASS ] || OVERALL=FAIL
done

say ""
say "D_SEC1_LOCAL_GATE=$OVERALL"
say "DB_RESET=$DB_RESET"
say "CLOSURE_PGTAP=$CLOSURE_PGTAP"
say "ORIGIN_BOUNDARY_GATE=$ORIGIN_GATE"
say "DETERMINISTIC_APPLICATION_GATE=$DETERMINISTIC_GATE"
say "RETENTION_GATE=$RETENTION_GATE"
say "D_DB1_DEVELOPMENT_GATE=$DEVELOPMENT_GATE"
say "FULL_DB_SUITE=$FULL_DB_SUITE"
say "FULL_DB_FILES=$FULL_DB_FILES"
say "FULL_DB_ASSERTIONS=$FULL_DB_ASSERTIONS"
say "MIGRATION_0134_SHA256=$SHA_0134"
say "D_SEC1_SUITE_SHA256=$SHA_CLOSURE"
say "REVIEW_ACCESSED=NO"
say "REVIEW_DB_0134=NOT_APPLIED"
say ""
say "Logs: reset=$RESET_LOG test=$TEST_LOG"

[ "$OVERALL" = PASS ] || exit 1
exit 0
