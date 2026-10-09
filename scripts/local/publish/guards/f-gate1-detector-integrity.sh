#!/usr/bin/env bash
#
# F-GATE1 publication guard — the detector cannot be weakened into silence.
#
# It does NOT run the database gate: that needs a local PostgreSQL and is red by
# design. It guards the properties that would let someone turn an honest red into
# a dishonest green, each of which this slice already got wrong once and fixed.
#
# Read-only. No remote contact, no credential, no mutation. Exit 0 is the only
# pass.

set -uo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
cd "$REPO_ROOT" || { printf 'STOP: cannot reach repository root\n'; exit 1; }

FK="supabase/gates/adr_0012_tenant_owned_fk_sweep.sql"
ACL="supabase/gates/client_privilege_posture_baseline.sql"
RUNNER="scripts/local/verify-f-gate1-foundation-sweeps.sh"
DOC="docs/Execution/F-GATE1-FOUNDATION-SWEEP-BASELINE.md"

FAILURES=0
fail() { printf '  FAIL %s\n' "$*"; FAILURES=$((FAILURES + 1)); }
pass() { printf '  ok   %s\n' "$*"; }
for f in "$FK" "$ACL" "$RUNNER" "$DOC"; do
  [ -f "$f" ] || { printf 'STOP: missing %s\n' "$f"; exit 1; }
done

# Judged on comment-stripped SQL: this slice's own static check once matched the
# prose that forbade the violation it was looking for.
code() { sed -E 's/--.*$//' "$1"; }
FK_CODE=$(code "$FK")

printf '[guard f-gate1] the sweep has no allow-list\n'

# 1. The contract assertion must be unfiltered. An allow-list is exactly how a
#    repo-wide sweep degrades into the per-table suites it replaced.
if printf '%s\n' "$FK_CODE" | grep -qE "from f_gate1_violation\),[[:space:]]*$" \
   || printf '%s\n' "$FK_CODE" | grep -qE "select count\(\*\) from f_gate1_violation\)"; then
  pass "the contract assertion counts f_gate1_violation unfiltered"
else
  fail "cannot find an unfiltered count over f_gate1_violation"
fi

# 2. Tenant ownership must be decided by the presence of company_id — the ADR's
#    own operational test — and not by a hard-coded set of table names.
printf '%s\n' "$FK_CODE" | grep -qE "attname = 'company_id'" \
  && pass "tenant ownership is derived from the company_id column" \
  || fail "tenant ownership is not derived from company_id"

# 3. Column ORDER must not be asserted: ADR-0012 keeps pre-existing composite
#    constraints whose order differs (Notifications is (company_id, id)).
printf '%s\n' "$FK_CODE" | grep -qE "= any\(conkey\)" \
  && pass "company_id membership is tested with = any(conkey), not by position" \
  || fail "the sweep does not test membership with = any(conkey)"

printf '[guard f-gate1] the expected set cannot shrink silently\n'

# 4. The reciprocal assertion. Without it, deleting a name from the expected set
#    makes the regression check pass for the wrong reason.
printf '%s\n' "$FK_CODE" | grep -qE "f_gate1_expected_constraint\), 30::bigint" \
  && pass "the expected set is pinned at 30 entries" \
  || fail "the expected-set size assertion is missing or not 30"

EXPECTED=$(printf '%s\n' "$FK_CODE" \
  | sed -n '/create temporary view f_gate1_expected_constraint/,/as conname;/p' \
  | grep -oE "'[a-z0-9_]+_fkey'" | sort -u | wc -l | tr -d ' ')
if [ "$EXPECTED" = 30 ]; then
  pass "the expected set literally contains 30 distinct constraint names"
else
  fail "the expected set contains $EXPECTED distinct names, not 30"
fi

# 5. The two constraints retired with position_competencies (0125:69) must stay
#    OUT, and the retirement must stay cited, so the next reader does not
#    "restore" them and re-break the gate.
printf '%s\n' "$FK_CODE" | grep -qE "'position_competencies_[a-z_]+_company_fkey'" \
  && fail "a constraint retired with position_competencies is back in the expected set" \
  || pass "the position_competencies constraints stay out of the expected set"
grep -q "0125" "$FK" && pass "the retirement is cited in the sweep" \
  || fail "the sweep does not cite 0125, so the omission looks arbitrary"

printf '[guard f-gate1] withdrawn ACL assertions stay withdrawn\n'

# 6. The two ACL assertions were gate hypotheses, not contract. Reinstating them
#    needs a canonical decision about the platform's default privileges, not an
#    edit here. They must remain census (`ok(true, ...)`), never `is(...) = 0`.
ACL_CODE=$(code "$ACL")
if printf '%s\n' "$ACL_CODE" | grep -qE "is\([[:space:]]*\(select count\(\*\) from pg_default_acl"; then
  fail "the default-ACL assertion was reinstated as a verdict; it is a census"
else
  pass "default ACL is reported as census, not asserted"
fi
if printf '%s\n' "$ACL_CODE" | grep -qE "is\(.*TRUNCATE.*0::bigint" ; then
  fail "the client-TRUNCATE assertion was reinstated as a verdict; it is a census"
else
  pass "client TRUNCATE is reported as census, not asserted"
fi
printf '%s\n' "$ACL_CODE" | grep -qE "CLIENT_PRIVILEGE_FINGERPRINT" \
  && pass "the Review-comparison fingerprint is emitted" \
  || fail "the client-privilege fingerprint is missing"

printf '[guard f-gate1] the baseline is explicit and the fleet stays green\n'

# 7. The baseline must be a named constant that moves only deliberately.
grep -qE "^readonly BASELINE_OFFENDERS=[0-9]+$" "$RUNNER" \
  && grep -qE "F-DB1[bc]: [0-9]+ -> [0-9]+" "$RUNNER" \
  && pass "the runner pins a named baseline and cites the slice that moved it" \
  || fail "the runner does not pin a baseline with slice provenance"

grep -qF '^[[:space:]]*not ok' "$RUNNER" \
  && grep -qF '^[[:space:]]*ok 1' "$RUNNER" \
  && pass "the TAP parser accepts psql indentation and still detects failures" \
  || fail "the TAP parser can misclassify indented ok/not ok output"

# 8. The red sweep must NOT be in the fleet path, or every other local gate's
#    FULL_DB_SUITE=PASS becomes meaningless.
# `ls A* B*` was the first attempt and it was BLIND: ls exits nonzero when
# EITHER pattern matches nothing, so one misplaced file read as "all clear".
# `find` reports what exists instead of conflating absence with failure.
MISPLACED=$(find supabase/tests -maxdepth 1 \
  \( -name 'adr_0012_tenant_owned_fk_sweep*' -o -name 'client_privilege_posture_baseline*' \) \
  2>/dev/null)
if [ -n "$MISPLACED" ]; then
  fail "a red-by-design sweep is inside supabase/tests; it would turn the whole fleet red:"
  printf '%s\n' "$MISPLACED" | sed 's/^/       /'
else
  pass "the sweeps stay out of supabase/tests"
fi

# 9. Authorized migration allow-list, with the payload of each entry pinned.
#
#    This used to demand equality with 0144 alone, which was right for F-DB1b and
#    wrong for the next slice: F-DB1c legitimately adds 0145 and the guard refused
#    it. Generalising to a list is NOT a relaxation, because the list is closed and
#    every entry carries its reviewed SHA256:
#
#      * a migration outside the list fails, including any earlier one;
#      * a listed migration whose payload changed fails;
#      * an empty migration scope fails when the candidate claims one, so the
#        allow-list cannot degenerate into "anything goes".
AUTHORIZED_MIGRATIONS="\
supabase/migrations/0144_harden_assessment_execution_tenant_fks.sql:b9289408e100ead1b21e6cd4e063788ce4b9344dac310ae04c24d9a4553ab23f
supabase/migrations/0145_harden_assessment_lifecycle_tenant_fks.sql:a267ec22eadc795c1c2112039d57c99f2799b1746158f9d549d49fa4624d7b5f"

AUTHORIZED_PATHS=""
while IFS=: read -r path want; do
  [ -n "$path" ] || continue
  AUTHORIZED_PATHS="$AUTHORIZED_PATHS$path\n"
  if [ ! -f "$path" ]; then
    fail "an authorized migration is missing: $path"
  elif [ "$(shasum -a 256 "$path" | cut -d' ' -f1)" != "$want" ]; then
    fail "$path does not match its reviewed SHA256"
  else
    pass "$(basename "$path") matches its reviewed SHA256"
  fi
done <<EOF
$AUTHORIZED_MIGRATIONS
EOF

if [ -n "${PUBLISH_BASE:-}" ]; then
  CHANGED_MIGRATIONS=$(git diff --name-only "$PUBLISH_BASE..${PUBLISH_CANDIDATE:-HEAD}" -- supabase/migrations 2>/dev/null)
  UNAUTHORIZED=""
  for m in $CHANGED_MIGRATIONS; do
    printf '%b' "$AUTHORIZED_PATHS" | grep -qxF "$m" || UNAUTHORIZED="$UNAUTHORIZED $m"
  done
  if [ -n "$UNAUTHORIZED" ]; then
    fail "candidate touches unauthorized migration(s):$UNAUTHORIZED"
  elif [ -z "$CHANGED_MIGRATIONS" ]; then
    fail "candidate declares a migration slice but changes no migration"
  else
    pass "candidate migrations are all authorized: $(printf '%s' "$CHANGED_MIGRATIONS" | tr '\n' ' ')"
  fi
else
  pass "authorized migration payloads verified locally"
fi

# 10. Baseline and migration must move TOGETHER.
#
#     The baseline is only factually true once the migration that reduces it is in
#     the same candidate. Asserting the pair makes the inconsistency window
#     impossible rather than merely short: a candidate carrying 0145 must declare
#     30, and a candidate without it must not.
CANDIDATE_HAS_0145=no
if [ -n "${PUBLISH_BASE:-}" ]; then
  printf '%s' "$CHANGED_MIGRATIONS" \
    | grep -qxF "supabase/migrations/0145_harden_assessment_lifecycle_tenant_fks.sql" \
    && CANDIDATE_HAS_0145=yes
fi
if [ "$CANDIDATE_HAS_0145" = yes ]; then
  grep -qE "^readonly BASELINE_OFFENDERS=30$" "$RUNNER" \
    && grep -qE "F-DB1c: 32 -> 30" "$RUNNER" \
    && pass "a candidate carrying 0145 pins BASELINE_OFFENDERS=30 and cites F-DB1c" \
    || fail "the candidate carries 0145 but the runner does not pin 30 with F-DB1c provenance"
else
  grep -qE "^readonly BASELINE_OFFENDERS=30$" "$RUNNER" \
    && fail "the runner pins 30 without a candidate that carries 0145 — baseline would precede its migration" \
    || pass "baseline is not advanced ahead of its migration"
fi

printf '\n'
if [ "$FAILURES" -eq 0 ]; then printf 'F_GATE1_DETECTOR_INTEGRITY=PASS\n'; exit 0; fi
printf 'F_GATE1_DETECTOR_INTEGRITY=FAIL (%s)\n' "$FAILURES"
printf 'Classify before editing: HARNESS_DEFECT if this guard is wrong about correct\n'
printf 'content, REGRESSION if the detector was weakened to silence a red.\n'
exit 1
