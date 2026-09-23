#!/usr/bin/env bash
#
# PLN-DB3 LOCAL database gate — deterministic Planning version-conflict SQLSTATE (0139).
#
#   bash scripts/local/verify-pln-db3-version-conflict-sqlstate.sh
#
# Run it as its own process. Never source it, never `. ` it, never eval it: it is
# written to be executed, and a nonzero exit is a normal result that must not be
# able to close an interactive shell.
#
# WHY IT EXISTS
#
# 0139 replaces eight SECURITY DEFINER bodies. Static inspection of SQL text
# proves the errcode changed; it proves nothing about whether the functions still
# compile, still hold their grants, still lock, or still leave canonical state
# untouched when a writer loses. Only a real PostgreSQL does. The executor that
# authored this slice has no PostgreSQL, no Supabase CLI and no Docker, so the
# gates that decide it cannot run where the code was written. This file is how
# they get run, on a machine that has the toolchain.
#
# LOCAL ONLY. It never reads a Review credential, never contacts Review,
# Production or Legacy, and runs no hosted browser. `supabase db reset` destroys
# and rebuilds the LOCAL development database — that is its purpose.

set -uo pipefail   # NOT -e: every step is checked explicitly and fails closed.

say() { printf '%s\n' "$*"; }

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { say "STOP: cannot reach repository root"; exit 1; }

MIGRATION_0139="supabase/migrations/0139_correct_planning_version_conflict_sqlstate.sql"
SQLSTATE_SUITE="supabase/tests/planning_version_conflict_sqlstate.test.sql"
CHANGE_SET_SUITE="supabase/tests/organization_planning_change_set_mutation_boundary.test.sql"
OPERATIONAL_SUITE="supabase/tests/organization_planning_operational_trusted_boundary.test.sql"
LIFECYCLE_SUITE="supabase/tests/organization_planning_trusted_lifecycle_boundary.test.sql"

say "[pln-db3] repo: $REPO_ROOT"

# --------------------------------------------------------------------------
# 1. toolchain and candidate files
# --------------------------------------------------------------------------
for tool in supabase shasum; do
  command -v "$tool" >/dev/null 2>&1 || {
    say "STOP: '$tool' not found. This gate needs the real toolchain; it cannot be simulated."
    say "PLN_DB3_MAC_GATE=FAIL"
    exit 1
  }
done

MISSING=0
for f in "$MIGRATION_0139" "$SQLSTATE_SUITE" "$CHANGE_SET_SUITE" "$OPERATIONAL_SUITE" "$LIFECYCLE_SUITE"; do
  [ -f "$f" ] || { say "STOP: missing $f"; MISSING=1; }
done
[ "$MISSING" -eq 0 ] || { say "PLN_DB3_MAC_GATE=FAIL"; exit 1; }

# --------------------------------------------------------------------------
# 2. static preconditions that must hold before a database is even started.
#    A stale expectation left anywhere would otherwise surface as a confusing
#    pgTAP failure rather than as the contract error it is.
# --------------------------------------------------------------------------
STATIC_CONTRACT=PASS

# No Planning suite may still expect the retryable code.
if grep -rl "'40001','PLANNING_VERSION_CONFLICT'" supabase/tests >/dev/null 2>&1; then
  say "[pln-db3]     STATIC: a Planning suite still expects 40001:"
  grep -rn "'40001','PLANNING_VERSION_CONFLICT'" supabase/tests | sed 's/^/              /'
  STATIC_CONTRACT=FAIL
fi

# 0139 itself must not raise the old code, and must not alter privileges.
if grep -qE "errcode\s*=\s*'40001'" "$MIGRATION_0139"; then
  say "[pln-db3]     STATIC: 0139 still raises 40001."
  STATIC_CONTRACT=FAIL
fi
if grep -qiE "^(grant|revoke)" "$MIGRATION_0139"; then
  say "[pln-db3]     STATIC: 0139 issues GRANT/REVOKE; CREATE OR REPLACE must retain privileges."
  STATIC_CONTRACT=FAIL
fi

# Out-of-scope surfaces must be untouched by this slice.
for guard in DEVELOPMENT_VERSION_CONFLICT TENANT_CONFLICT; do
  if grep -q "$guard" "$MIGRATION_0139"; then
    say "[pln-db3]     STATIC: 0139 mentions $guard; this slice is Planning-only."
    STATIC_CONTRACT=FAIL
  fi
done

[ "$STATIC_CONTRACT" = PASS ] || { say ""; say "PLN_DB3_MAC_GATE=FAIL"; say "STATIC_CONTRACT=FAIL"; exit 1; }
say "[pln-db3]     STATIC_CONTRACT=PASS"

# --------------------------------------------------------------------------
# 3. fingerprint recorded before anything runs.
# --------------------------------------------------------------------------
SHA_0139=$(shasum -a 256 "$MIGRATION_0139" | cut -d' ' -f1)
SHA_SUITE=$(shasum -a 256 "$SQLSTATE_SUITE" | cut -d' ' -f1)

RESET_LOG=$(mktemp -t plndb3reset.XXXXXX)
TEST_LOG=$(mktemp -t plndb3test.XXXXXX)

DB_RESET=FAIL
PLN_DB3_PGTAP=FAIL
PLN_DB3_ASSERTIONS=UNKNOWN
FULL_DB_SUITE=FAIL
FULL_DB_FILES=UNKNOWN
FULL_DB_ASSERTIONS=UNKNOWN

# --------------------------------------------------------------------------
# 4. full-history reset through 0139.
# --------------------------------------------------------------------------
say "[pln-db3] 1/3 supabase db reset (full canonical history through 0139) ..."
if supabase db reset >"$RESET_LOG" 2>&1; then
  DB_RESET=PASS
  say "[pln-db3]     DB_RESET=PASS (log: $RESET_LOG)"
else
  say "[pln-db3]     DB_RESET=FAIL — migrations did not apply cleanly."
  say "Causal diagnostics:"
  grep -nE "ERROR:|CONTEXT:|DETAIL:|FATAL|failed" "$RESET_LOG" | head -25 | sed 's/^/  /'
  say "Full log: $RESET_LOG"
  say ""
  say "PLN_DB3_MAC_GATE=FAIL"
  say "DB_RESET=FAIL"
  say "MIGRATION_0139_SHA256=$SHA_0139"
  say "PLN_DB3_SUITE_SHA256=$SHA_SUITE"
  say "REVIEW_ACCESSED=NO"
  exit 1
fi

# --------------------------------------------------------------------------
# 5. the whole DB suite in ONE run, then per-suite verdicts read from THAT run
#    rather than from a second run against a database the first may have changed.
# --------------------------------------------------------------------------
say "[pln-db3] 2/3 supabase test db (full suite) ..."
if supabase test db >"$TEST_LOG" 2>&1; then
  FULL_DB_SUITE=PASS
else
  FULL_DB_SUITE=FAIL
fi

FULL_DB_SUMMARY=$(sed -nE 's/^Files=([0-9]+), Tests=([0-9]+),.*/\1 \2/p' "$TEST_LOG" | tail -1)
if [ -n "$FULL_DB_SUMMARY" ]; then
  FULL_DB_FILES=${FULL_DB_SUMMARY%% *}
  FULL_DB_ASSERTIONS=${FULL_DB_SUMMARY#* }
else
  # A parser uncertainty is not a factual zero and must not affect the verdict.
  FULL_DB_FILES=UNKNOWN
  FULL_DB_ASSERTIONS=UNKNOWN
fi

verdict_for() {
  if grep -q "$1" "$TEST_LOG"; then
    if grep -E "$1" "$TEST_LOG" | grep -qiE "fail|not ok"; then printf 'FAIL'; else printf 'PASS'; fi
  else
    printf 'FAIL'   # expected to be part of the run; absence is not a pass
  fi
}

PLN_DB3_PGTAP=$(verdict_for "planning_version_conflict_sqlstate")
CHANGE_SET_GATE=$(verdict_for "organization_planning_change_set_mutation_boundary")
OPERATIONAL_GATE=$(verdict_for "organization_planning_operational_trusted_boundary")
LIFECYCLE_GATE=$(verdict_for "organization_planning_trusted_lifecycle_boundary")

PLN_DB3_ASSERTIONS=$(sed -nE 's#.*planning_version_conflict_sqlstate[^0-9]*\.\.[[:space:]]*ok[[:space:]]+([0-9]+).*#\1#p' "$TEST_LOG" | tail -1)
[ -n "$PLN_DB3_ASSERTIONS" ] || PLN_DB3_ASSERTIONS=UNKNOWN

if [ "$FULL_DB_SUITE" != PASS ]; then
  say "[pln-db3]     FULL_DB_SUITE=FAIL. Classify every failure before touching code:"
  say "              REGRESSION | PRE_EXISTING | STALE_TEST | ENVIRONMENTAL |"
  say "              HARNESS_DEFECT | SECURITY_CONTRACT_FAILURE | DB_CONTRACT_DEFICIENCY |"
  say "              CONTRACT_CONFLICT | DOWNSTREAM_CASCADE"
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
# 6. summary — machine-readable, pasteable, no secrets.
# --------------------------------------------------------------------------
say "[pln-db3] 3/3 summary"
OVERALL=PASS
for v in "$DB_RESET" "$PLN_DB3_PGTAP" "$FULL_DB_SUITE" "$CHANGE_SET_GATE" "$OPERATIONAL_GATE" "$LIFECYCLE_GATE"; do
  [ "$v" = PASS ] || OVERALL=FAIL
done

say ""
say "PLN_DB3_MAC_GATE=$OVERALL"
say "STATIC_CONTRACT=$STATIC_CONTRACT"
say "DB_RESET=$DB_RESET"
say "PLN_DB3_PGTAP=$PLN_DB3_PGTAP"
say "PLN_DB3_ASSERTIONS=$PLN_DB3_ASSERTIONS"
say "FULL_DB_SUITE=$FULL_DB_SUITE"
say "FULL_DB_FILES=$FULL_DB_FILES"
say "FULL_DB_ASSERTIONS=$FULL_DB_ASSERTIONS"
say "CHANGE_SET_GATE=$CHANGE_SET_GATE"
say "OPERATIONAL_GATE=$OPERATIONAL_GATE"
say "LIFECYCLE_GATE=$LIFECYCLE_GATE"
say "MIGRATION_0139_SHA256=$SHA_0139"
say "PLN_DB3_SUITE_SHA256=$SHA_SUITE"
say "REVIEW_ACCESSED=NO"
say "REVIEW_DB_0139=NOT_APPLIED"
say ""
say "Logs: reset=$RESET_LOG test=$TEST_LOG"

[ "$OVERALL" = PASS ] || exit 1
exit 0
