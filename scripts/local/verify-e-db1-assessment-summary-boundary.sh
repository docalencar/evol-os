#!/usr/bin/env bash
#
# E-DB1 LOCAL database gate — aggregated Assessment summary read boundary (0141).
#
#   bash scripts/local/verify-e-db1-assessment-summary-boundary.sh
#
# Run it as its own process. Never source it, never `. ` it, never eval it: a
# nonzero exit is a normal result here and must not be able to close a shell.
#
# WHY IT EXISTS, AND WHY IT HAS FOUR PHASES
#
# The slice requires evidence that static SQL text cannot produce:
#
#   RED       the suite must FAIL before 0141 exists, or it is not testing the
#             boundary — it is testing nothing. A suite that has never been red
#             cannot be trusted when it turns green.
#   GREEN     the suite, and the whole canonical DB suite, must pass with 0141.
#   MUTATION  tenancy, authorization and audit cardinality are each broken in
#             turn; the suite must return RED for each. A test that stays green
#             while the property it names is broken is not a test of it.
#   RESTORE   the correct definition is put back and re-proven green, so the gate
#             cannot leave a mutated function behind.
#
# The executor that authored this slice has no PostgreSQL, no Supabase CLI and no
# Docker, so none of the above can run where the code was written. This file is
# how it gets run on a machine that has the toolchain.
#
# LOCAL ONLY. It never reads a Review credential, never contacts Review,
# Production or Legacy, and runs no browser. `supabase db reset` destroys and
# rebuilds the LOCAL development database — that is its purpose. The mutations
# are applied to that local database only, are reverted by phase 4, and are never
# written into any migration file.

set -uo pipefail   # NOT -e: every step is checked explicitly and fails closed.

say() { printf '%s\n' "$*"; }

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { say "STOP: cannot reach repository root"; exit 1; }

MIGRATION="supabase/migrations/0141_create_company_assessment_summary_read_boundary.sql"
SUITE="supabase/tests/company_assessment_summary_read_boundary.test.sql"
COMPAT_SUITE="supabase/tests/assessment_authorization_rls.test.sql"

say "[e-db1] repo: $REPO_ROOT"

# --------------------------------------------------------------------------
# 1. toolchain, candidate files, and a proven-local database target
# --------------------------------------------------------------------------
for tool in supabase psql shasum; do
  command -v "$tool" >/dev/null 2>&1 || {
    say "STOP: '$tool' not found. This gate needs the real toolchain; it cannot be simulated."
    say "E_DB1_MAC_GATE=FAIL"
    exit 1
  }
done

MISSING=0
for f in "$MIGRATION" "$SUITE" "$COMPAT_SUITE"; do
  [ -f "$f" ] || { say "STOP: missing $f"; MISSING=1; }
done
[ "$MISSING" -eq 0 ] || { say "E_DB1_MAC_GATE=FAIL"; exit 1; }

# The mutation phases talk to the database directly, so the target must be proven
# local BEFORE anything is executed. Asking the CLI is the canonical source; the
# loopback assertion below is what actually decides, because a value that merely
# came from a trusted-looking command is still just a value.
DB_URL=$(supabase status -o env 2>/dev/null | sed -nE 's/^DB_URL="?([^"]*)"?$/\1/p' | tail -1)
[ -n "$DB_URL" ] || DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

DB_HOST=$(printf '%s' "$DB_URL" | sed -nE 's#^[a-z+]+://[^@]*@([^:/]+).*#\1#p')
case "$DB_HOST" in
  localhost|127.0.0.1|::1|"[::1]") : ;;
  *)
    say "STOP: refusing to run against a non-loopback database host: '${DB_HOST:-<unparsed>}'"
    say "      This gate mutates a security boundary. It runs on a local stack only."
    say "E_DB1_MAC_GATE=FAIL"
    say "TARGET_PROVEN_LOCAL=NO"
    exit 1 ;;
esac
case "$DB_URL" in
  *supabase.co*|*supabase.com*)
    say "STOP: the database URL names a hosted Supabase domain. Refusing."
    say "E_DB1_MAC_GATE=FAIL"
    say "TARGET_PROVEN_LOCAL=NO"
    exit 1 ;;
esac
say "[e-db1] target proven local: host=$DB_HOST"

SHA_MIGRATION=$(shasum -a 256 "$MIGRATION" | cut -d' ' -f1)
SHA_SUITE=$(shasum -a 256 "$SUITE" | cut -d' ' -f1)

WORK=$(mktemp -d -t edb1.XXXXXX)
HELD="$WORK/0141.held.sql"

RED_VERDICT=FAIL
DB_RESET=FAIL
E_DB1_PGTAP=FAIL
E_DB1_ASSERTIONS=UNKNOWN
FULL_DB_SUITE=FAIL
FULL_DB_FILES=UNKNOWN
FULL_DB_ASSERTIONS=UNKNOWN
COMPAT_GATE=FAIL
MUT_TENANCY=FAIL
MUT_AUTHORIZATION=FAIL
MUT_AUDIT_CARDINALITY=FAIL
RESTORED=FAIL
PARSER_MUTATION_PROOF=FAIL
RUNNER_OUTPUT_CAPTURE_PROOF=FAIL

# Restore the migration file whatever happens, including on interrupt. A gate
# that can leave the working tree missing a migration is worse than no gate.
cleanup() {
  if [ -f "$HELD" ] && [ ! -f "$MIGRATION" ]; then
    cp "$HELD" "$MIGRATION" && say "[e-db1] migration file restored by cleanup"
  fi
}
trap cleanup EXIT INT TERM

# Parse the aligned output emitted by psql without accepting partial TAP. A pass
# requires one exact plan, every assertion number exactly once, and no database
# error or negative assertion.
parse_pgtap_25() {
  awk '
    {
      line = $0
      sub(/^[[:space:]]+/, "", line)
      if (line ~ /^Bail out!/) bad = 1
      if (line ~ /(^|[[:space:]])(ERROR|FATAL):/) bad = 1
      if (line ~ /^not ok[[:space:]]+[0-9]+([[:space:]]|$)/) bad = 1
      if (line == "1..25") plans++
      if (line ~ /^ok[[:space:]]+[0-9]+([[:space:]]|$)/) {
        split(line, fields, /[[:space:]]+/)
        assertion = fields[2] + 0
        seen[assertion]++
        assertions++
      }
    }
    END {
      if (bad || plans != 1 || assertions != 25) exit 1
      for (i = 1; i <= 25; i++) if (seen[i] != 1) exit 1
      for (i in seen) if ((i + 0) < 1 || (i + 0) > 25) exit 1
    }
  ' "$1"
}

prove_parser_mutations() {
  local green="$WORK/parser-green.log"
  local mutated="$WORK/parser-mutated.log"

  awk 'BEGIN { for (i = 1; i <= 25; i++) print "   ok " i " - assertion"; print " 1..25" }' >"$green"
  parse_pgtap_25 "$green" || return 1

  sed 's/^   ok 13 /   not ok 13 /' "$green" >"$mutated"
  parse_pgtap_25 "$mutated" && return 1

  sed '/^   ok 13 /d' "$green" >"$mutated"
  parse_pgtap_25 "$mutated" && return 1

  sed 's/^ 1\.\.25$/ 1..24/' "$green" >"$mutated"
  parse_pgtap_25 "$mutated" && return 1

  { printf '%s\n' 'psql:test.sql:1: ERROR: unexpected failure'; sed -n '1,$p' "$green"; } >"$mutated"
  parse_pgtap_25 "$mutated" && return 1

  return 0
}

if prove_parser_mutations; then
  PARSER_MUTATION_PROOF=PASS
  say "[e-db1] parser mutation proof: GREEN/pass; not-ok/missing/wrong-plan/ERROR fail."
else
  say "STOP: pgTAP parser mutation proof failed."
  say "E_DB1_MAC_GATE=FAIL"
  say "PARSER_MUTATION_PROOF=FAIL"
  exit 1
fi

# Run one suite file directly and report PASS/FAIL. psql's own exit status is not
# sufficient, because a suite can produce failing assertions and still exit 0.
run_suite() {
  # $1 = suite path, $2 = log path; echoes PASS or FAIL.
  local log="$2"
  psql "$DB_URL" -v ON_ERROR_STOP=0 -f "$1" >"$log" 2>&1
  if parse_pgtap_25 "$log"; then
    printf 'PASS'
  else
    printf 'FAIL'
  fi
}

apply_sql() {
  # $1 = sql text, $2 = log path; returns psql's status.
  printf '%s\n' "$1" | psql "$DB_URL" -v ON_ERROR_STOP=1 -q >"$2" 2>&1
}

# --------------------------------------------------------------------------
# 2. PHASE RED — the suite must fail before 0141 exists
# --------------------------------------------------------------------------
say "[e-db1] 1/5 RED — canonical history WITHOUT 0141 ..."
cp "$MIGRATION" "$HELD" || { say "STOP: cannot stage the migration aside"; say "E_DB1_MAC_GATE=FAIL"; exit 1; }
rm -f "$MIGRATION"

if supabase db reset >"$WORK/reset-red.log" 2>&1; then
  RED_RUN=$(run_suite "$SUITE" "$WORK/red.log")
  if [ "$RED_RUN" = FAIL ]; then
    RED_VERDICT=PASS
    say "[e-db1]     RED=PASS — the suite fails without the boundary, as required."
  else
    RED_VERDICT=FAIL
    say "[e-db1]     RED=FAIL — the suite PASSED without 0141. It is not testing the boundary."
    say "            Do not proceed by making it green; find what it is actually asserting."
  fi
else
  say "[e-db1]     RED inconclusive: reset failed without 0141."
  grep -nE "ERROR:|CONTEXT:|DETAIL:|FATAL" "$WORK/reset-red.log" | head -20 | sed 's/^/  /'
  RED_VERDICT=FAIL
fi

cp "$HELD" "$MIGRATION" || { say "STOP: cannot restore the migration"; say "E_DB1_MAC_GATE=FAIL"; exit 1; }

# --------------------------------------------------------------------------
# 3. PHASE GREEN — full canonical history through 0141, whole DB suite
# --------------------------------------------------------------------------
say "[e-db1] 2/5 GREEN — supabase db reset (full canonical history through 0141) ..."
if supabase db reset >"$WORK/reset.log" 2>&1; then
  DB_RESET=PASS
else
  say "[e-db1]     DB_RESET=FAIL — migrations did not apply cleanly."
  grep -nE "ERROR:|CONTEXT:|DETAIL:|FATAL|failed" "$WORK/reset.log" | head -25 | sed 's/^/  /'
  say "Full log: $WORK/reset.log"
  say ""
  say "E_DB1_MAC_GATE=FAIL"
  say "RED=$RED_VERDICT"
  say "DB_RESET=FAIL"
  say "MIGRATION_0141_SHA256=$SHA_MIGRATION"
  say "E_DB1_SUITE_SHA256=$SHA_SUITE"
  say "REVIEW_ACCESSED=NO"
  exit 1
fi

say "[e-db1]     supabase test db (full suite) ..."
if supabase test db >"$WORK/test.log" 2>&1; then
  FULL_DB_SUITE=PASS
else
  FULL_DB_SUITE=FAIL
fi

FULL_DB_SUMMARY=$(sed -nE 's/^Files=([0-9]+), Tests=([0-9]+),.*/\1 \2/p' "$WORK/test.log" | tail -1)
if [ -n "$FULL_DB_SUMMARY" ]; then
  FULL_DB_FILES=${FULL_DB_SUMMARY%% *}
  FULL_DB_ASSERTIONS=${FULL_DB_SUMMARY#* }
else
  # A parser uncertainty is not a factual zero and must not affect the verdict.
  FULL_DB_FILES=UNKNOWN
  FULL_DB_ASSERTIONS=UNKNOWN
fi

verdict_for() {
  if grep -q "$1" "$WORK/test.log"; then
    if grep -E "$1" "$WORK/test.log" | grep -qiE "fail|not ok"; then printf 'FAIL'; else printf 'PASS'; fi
  else
    printf 'FAIL'   # expected in the run; absence is not a pass
  fi
}

E_DB1_PGTAP=$(verdict_for "company_assessment_summary_read_boundary")
COMPAT_GATE=$(verdict_for "assessment_authorization_rls")

grep -q "company_assessment_summary_read_boundary" "$WORK/test.log" \
  || say "[e-db1]     WARNING: the E-DB1 suite was not named in the test output."

E_DB1_ASSERTIONS=$(sed -nE 's#.*company_assessment_summary_read_boundary[^0-9]*\.\.[[:space:]]*ok[[:space:]]+([0-9]+).*#\1#p' "$WORK/test.log" | tail -1)
[ -n "$E_DB1_ASSERTIONS" ] || E_DB1_ASSERTIONS=UNKNOWN

if [ "$FULL_DB_SUITE" != PASS ]; then
  say "[e-db1]     FULL_DB_SUITE=FAIL. Classify every failure before touching code:"
  say "            REGRESSION | PRE_EXISTING | STALE_TEST | ENVIRONMENTAL |"
  say "            HARNESS_DEFECT | SECURITY_CONTRACT_FAILURE | DB_CONTRACT_DEFICIENCY |"
  say "            CONTRACT_CONFLICT | DOWNSTREAM_CASCADE"
  grep -nE "ERROR:|CONTEXT:|DETAIL:|Bail out" "$WORK/test.log" | head -25 | sed 's/^/  /'
  grep -nE "not ok|Failed test|Bad plan|Looks like|Result: *FAIL" "$WORK/test.log" | head -40 | sed 's/^/  /'
  say "Full log: $WORK/test.log"
fi

# --------------------------------------------------------------------------
# 4. PHASE MUTATION — break each property in turn; the suite must go RED
# --------------------------------------------------------------------------
# Each mutation is a `create or replace` against the LOCAL database only, and is
# the smallest change that removes exactly one property. Nothing is written to a
# migration file, and phase 5 restores the canonical definition from 0141.

# 4a. TENANCY — the company filter is dropped. Authorization and audit stay
#     intact, so only the isolation assertions may move. If they do not, the
#     suite is not proving tenancy.
MUT_TENANCY_SQL=$(cat <<'SQL'
create or replace function public.get_company_assessment_summary_v1(
  p_company_id uuid, p_reason text
) returns table (
  employee_id uuid, completed_assessments integer,
  pending_assessments integer, latest_completed_at timestamptz
) language plpgsql volatile security definer
set search_path = public, pg_temp as $mut$
begin
  if p_company_id is null then
    raise exception using errcode = '22023', message = 'ASSESSMENT_SUMMARY_COMPANY_REQUIRED';
  end if;
  perform public.audit_secure_administrative_read(
    p_company_id, 'assessments', 'assessment_company_summary',
    p_company_id, 'read_company_summary', p_reason);
  return query
  select response.employee_id,
         count(*) filter (where response.status = 'completed')::integer,
         count(*) filter (where response.status in ('draft','in_progress','submitted'))::integer,
         max(response.completed_at) filter (where response.status = 'completed')
    from public.assessment_responses response
   group by response.employee_id
   order by response.employee_id;
end; $mut$;
SQL
)

# 4b. AUTHORIZATION — the audit/authorization call is removed entirely. Every
#     refusal assertion and the whole of TEST 7 must move.
MUT_AUTH_SQL=$(cat <<'SQL'
create or replace function public.get_company_assessment_summary_v1(
  p_company_id uuid, p_reason text
) returns table (
  employee_id uuid, completed_assessments integer,
  pending_assessments integer, latest_completed_at timestamptz
) language plpgsql volatile security definer
set search_path = public, pg_temp as $mut$
begin
  if p_company_id is null then
    raise exception using errcode = '22023', message = 'ASSESSMENT_SUMMARY_COMPANY_REQUIRED';
  end if;
  return query
  select response.employee_id,
         count(*) filter (where response.status = 'completed')::integer,
         count(*) filter (where response.status in ('draft','in_progress','submitted'))::integer,
         max(response.completed_at) filter (where response.status = 'completed')
    from public.assessment_responses response
   where response.company_id = p_company_id
   group by response.employee_id
   order by response.employee_id;
end; $mut$;
SQL
)

# 4c. AUDIT CARDINALITY — authorization and tenancy are kept, and the read still
#     returns the same rows; only the audit becomes per-employee instead of per
#     read. This is the mutation that matters most: it is the shape a naive
#     implementation would have, it leaks nothing, and every assertion except the
#     cardinality one stays satisfied. If the suite stays green here, TEST 7 is
#     decorative.
MUT_AUDIT_SQL=$(cat <<'SQL'
create or replace function public.get_company_assessment_summary_v1(
  p_company_id uuid, p_reason text
) returns table (
  employee_id uuid, completed_assessments integer,
  pending_assessments integer, latest_completed_at timestamptz
) language plpgsql volatile security definer
set search_path = public, pg_temp as $mut$
declare subject uuid;
begin
  if p_company_id is null then
    raise exception using errcode = '22023', message = 'ASSESSMENT_SUMMARY_COMPANY_REQUIRED';
  end if;
  for subject in
    select distinct r.employee_id from public.assessment_responses r
     where r.company_id = p_company_id order by 1
  loop
    perform public.audit_secure_administrative_read(
      p_company_id, 'assessments', 'assessment_company_summary',
      subject, 'read_company_summary', p_reason);
  end loop;
  return query
  select response.employee_id,
         count(*) filter (where response.status = 'completed')::integer,
         count(*) filter (where response.status in ('draft','in_progress','submitted'))::integer,
         max(response.completed_at) filter (where response.status = 'completed')
    from public.assessment_responses response
   where response.company_id = p_company_id
   group by response.employee_id
   order by response.employee_id;
end; $mut$;
SQL
)

mutate_and_expect_red() {
  # $1 = label, $2 = sql, $3 = tag; echoes PASS when the suite goes RED.
  local tag="$3"
  if ! apply_sql "$2" "$WORK/mut-$tag-apply.log"; then
    say "[e-db1]     MUTATION $1 could not be applied — inconclusive, not a pass." >&2
    grep -nE "ERROR:|DETAIL:" "$WORK/mut-$tag-apply.log" | head -10 | sed 's/^/  /' >&2
    printf 'FAIL'
    return
  fi
  local run
  run=$(run_suite "$SUITE" "$WORK/mut-$tag.log")
  if [ "$run" = FAIL ]; then
    say "[e-db1]     MUTATION $1 → suite RED (correct). Failing assertions:" >&2
    grep -E "^not ok" "$WORK/mut-$tag.log" | head -8 | sed 's/^/  /' >&2
    printf 'PASS'
  else
    say "[e-db1]     MUTATION $1 → suite still GREEN. The suite does not prove this property." >&2
    printf 'FAIL'
  fi
}

prove_mutation_output_capture() {
  local diagnostics="$WORK/mutation-output-capture.log"
  local red_value green_value

  mutation_output_probe() {
    say "diagnostic remains visible on stderr: $1" >&2
    printf '%s' "$2"
  }

  red_value=$(mutation_output_probe red PASS 2>"$diagnostics")
  [ "$red_value" = PASS ] || return 1
  grep -q "diagnostic remains visible on stderr: red" "$diagnostics" || return 1

  green_value=$(mutation_output_probe green FAIL 2>>"$diagnostics")
  [ "$green_value" = FAIL ] || return 1
  grep -q "diagnostic remains visible on stderr: green" "$diagnostics" || return 1

  [ "$(wc -l <"$diagnostics" | tr -d ' ')" = 2 ] || return 1
  return 0
}

if prove_mutation_output_capture; then
  RUNNER_OUTPUT_CAPTURE_PROOF=PASS
  say "[e-db1] mutation output capture proof: diagnostics preserved; values exact PASS/FAIL."
else
  say "STOP: mutation output capture proof failed."
  say "E_DB1_MAC_GATE=FAIL"
  say "RUNNER_OUTPUT_CAPTURE_PROOF=FAIL"
  exit 1
fi

if [ "$E_DB1_PGTAP" = PASS ]; then
  say "[e-db1] 3/5 MUTATION proof ..."
  MUT_TENANCY=$(mutate_and_expect_red "tenancy (company filter removed)" "$MUT_TENANCY_SQL" tenancy)
  MUT_AUTHORIZATION=$(mutate_and_expect_red "authorization (audit/authz call removed)" "$MUT_AUTH_SQL" authz)
  MUT_AUDIT_CARDINALITY=$(mutate_and_expect_red "audit cardinality (one event per employee)" "$MUT_AUDIT_SQL" audit)
else
  say "[e-db1] 3/5 MUTATION proof SKIPPED — the suite is not green, so RED means nothing."
fi

# --------------------------------------------------------------------------
# 5. PHASE RESTORE — canonical 0141 back in the database, re-proven green
# --------------------------------------------------------------------------
say "[e-db1] 4/5 RESTORE — resetting to the full canonical migration history ..."
if supabase db reset >"$WORK/restore.log" 2>&1; then
  RESTORE_RUN=$(run_suite "$SUITE" "$WORK/restore-suite.log")
  if [ "$RESTORE_RUN" = PASS ]; then
    RESTORED=PASS
    say "[e-db1]     RESTORED=PASS — reset and E-DB1 suite are green."
  else
    say "[e-db1]     RESTORED=FAIL — the E-DB1 suite is not green after reset."
    grep -E "^not ok" "$WORK/restore-suite.log" | head -10 | sed 's/^/  /'
  fi
else
  say "[e-db1]     RESTORED=FAIL — canonical supabase db reset failed."
  grep -nE "ERROR:|CONTEXT:|DETAIL:|FATAL|failed" "$WORK/restore.log" | head -10 | sed 's/^/  /'
fi

# --------------------------------------------------------------------------
# 6. summary — machine-readable, pasteable, no secrets
# --------------------------------------------------------------------------
say "[e-db1] 5/5 summary"
OVERALL=PASS
for v in "$RED_VERDICT" "$DB_RESET" "$E_DB1_PGTAP" "$FULL_DB_SUITE" "$COMPAT_GATE" \
         "$MUT_TENANCY" "$MUT_AUTHORIZATION" "$MUT_AUDIT_CARDINALITY" "$RESTORED"; do
  [ "$v" = PASS ] || OVERALL=FAIL
done

say ""
say "E_DB1_MAC_GATE=$OVERALL"
say "TARGET_PROVEN_LOCAL=YES"
say "RED_BEFORE_BOUNDARY=$RED_VERDICT"
say "DB_RESET=$DB_RESET"
say "E_DB1_PGTAP=$E_DB1_PGTAP"
say "E_DB1_ASSERTIONS=$E_DB1_ASSERTIONS"
say "FULL_DB_SUITE=$FULL_DB_SUITE"
say "FULL_DB_FILES=$FULL_DB_FILES"
say "FULL_DB_ASSERTIONS=$FULL_DB_ASSERTIONS"
say "ASSESSMENT_AUTHORIZATION_COMPAT=$COMPAT_GATE"
say "MUTATION_TENANCY_RED=$MUT_TENANCY"
say "MUTATION_AUTHORIZATION_RED=$MUT_AUTHORIZATION"
say "MUTATION_AUDIT_CARDINALITY_RED=$MUT_AUDIT_CARDINALITY"
say "CANONICAL_DEFINITION_RESTORED=$RESTORED"
say "PARSER_MUTATION_PROOF=$PARSER_MUTATION_PROOF"
say "RUNNER_OUTPUT_CAPTURE_PROOF=$RUNNER_OUTPUT_CAPTURE_PROOF"
say "MIGRATION_0141_SHA256=$SHA_MIGRATION"
say "E_DB1_SUITE_SHA256=$SHA_SUITE"
say "REVIEW_ACCESSED=NO"
say "REVIEW_DB_0141=NOT_APPLIED"
say "EXECUTIVE_TOUCHED=NO"
say ""
say "Logs: $WORK"

[ "$OVERALL" = PASS ] || exit 1
exit 0
