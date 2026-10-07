#!/usr/bin/env bash
#
# T-E2E0E publication guard — the Turnover identity checks stay MEASURED.
#
# WHY A PUBLICATION GUARD AND NOT JUST THE NODE TEST
#
# `apps/web/e2e/turnover-fixture/operational-static-guard.test.ts` already holds
# this invariant, and it is the right place for it. But CI for this repository
# runs lint and build only — it does not run the node:test suites. So without
# this guard the one assertion that keeps the bootstrap's identity checks
# load-bearing would never be executed by any gate on the publication path.
#
# Receives PUBLISH_BASE, PUBLISH_CANDIDATE and PUBLISH_BRANCH from the runner.
# Read-only: it contacts no environment, reads no credential, and mutates
# nothing. Exit 0 is the only pass.

set -uo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
cd "$REPO_ROOT" || { printf 'STOP: cannot reach repository root\n'; exit 1; }

TRANSPORT="apps/web/e2e/turnover-fixture/operational-transport.ts"
RESOLVER="apps/web/e2e/turnover-fixture/repository-identity.ts"

FAILURES=0
fail() { printf '  FAIL %s\n' "$*"; FAILURES=$((FAILURES + 1)); }
pass() { printf '  ok   %s\n' "$*"; }

for f in "$TRANSPORT" "$RESOLVER"; do
  [ -f "$f" ] || { printf 'STOP: missing %s\n' "$f"; exit 1; }
done

printf '[guard t-e2e0e] the snapshot measures, it does not echo a pin\n'

# Judged on comment-stripped CODE. Guards in this repository have matched their
# own prose before, and this file's whole subject is a check that looked real.
code() { sed -E 's#//.*$##' "$1"; }
TRANSPORT_CODE=$(code "$TRANSPORT")

# 1. Neither pin may appear in the transport at all. This is stronger than
#    checking the assignment: it also refuses laundering the constant through a
#    local alias, which is how the first fix attempt could have been defeated.
for pin in EXPECTED_MAIN EXPECTED_MIGRATION_SHA; do
  if printf '%s\n' "$TRANSPORT_CODE" | grep -qE "\b$pin\b"; then
    fail "the transport references '$pin'; both identity facts must be measured"
  else
    pass "no reference to '$pin'"
  fi
done

# 2. Each field must be produced by its resolver, asserted on the RECEIVER so a
#    formatting change is fine and a missing measurement is not.
if printf '%s\n' "$TRANSPORT_CODE" | grep -qE 'canonicalMain[[:space:]]*:[[:space:]]*resolveCanonicalMain\(\)'; then
  pass "canonicalMain comes from resolveCanonicalMain()"
else
  fail "canonicalMain is not produced by resolveCanonicalMain()"
fi
if printf '%s\n' "$TRANSPORT_CODE" | grep -qE 'migration0142Sha256[[:space:]]*:[[:space:]]*resolveMigrationPayloadSha\("0142"\)'; then
  pass "migration0142Sha256 comes from resolveMigrationPayloadSha(\"0142\")"
else
  fail "migration0142Sha256 is not produced by resolveMigrationPayloadSha(\"0142\")"
fi

# 3. The resolver must fail closed rather than default. A resolver that returns
#    a fallback on error reintroduces the defect in a different shape.
RESOLVER_CODE=$(code "$RESOLVER")
for codepath in TURNOVER_BOOTSTRAP_MAIN_UNRESOLVABLE TURNOVER_BOOTSTRAP_MAIN_NOT_CHECKED_OUT TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE; do
  printf '%s\n' "$RESOLVER_CODE" | grep -qE "\b$codepath\b" \
    && pass "resolver refuses with $codepath" \
    || fail "resolver is missing the $codepath refusal"
done

# 4. The resolver stays read-only. It resolves names and hashes a file; it never
#    fetches, checks out or writes.
if printf '%s\n' "$RESOLVER_CODE" | grep -qE '"(fetch|checkout|reset|pull|push|commit|clean)"'; then
  fail "the resolver runs a mutating git subcommand"
else
  pass "no mutating git subcommand in the resolver"
fi

# 5. The invariant's own test must run and pass. Counting tests is evidence; the
#    exit status is the contract.
printf '[guard t-e2e0e] running the turnover-fixture suites\n'
LOG=$(mktemp -t te2e0eguard.XXXXXX)
if (cd apps/web && npx --no-install tsx --test \
      e2e/turnover-fixture/*.test.ts e2e/turnover-fixture-lifecycle-guard.test.ts) >"$LOG" 2>&1; then
  grep -E '^# (tests|pass|fail)' "$LOG" | sed 's/^/  /'
  pass "turnover-fixture suites PASS"
else
  fail "turnover-fixture suites did not pass"
  grep -E '^not ok|^# fail|Error' "$LOG" | head -20 | sed 's/^/       /'
  printf '       full log: %s\n' "$LOG"
fi

printf '\n'
if [ "$FAILURES" -eq 0 ]; then
  printf 'T_E2E0E_MEASURED_IDENTITY=PASS\n'
  exit 0
fi
printf 'T_E2E0E_MEASURED_IDENTITY=FAIL (%s)\n' "$FAILURES"
printf 'Classify before editing: HARNESS_DEFECT if this guard is wrong about\n'
printf 'correct content, REGRESSION if an identity check went back to echoing a pin.\n'
exit 1
