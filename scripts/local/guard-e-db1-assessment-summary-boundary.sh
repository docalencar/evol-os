#!/usr/bin/env bash
#
# E-DB1 static guard — the aggregated Assessment summary boundary stays minimal.
#
# What this guard can and cannot do: it judges TEXT. It cannot prove tenancy,
# authorization or audit cardinality — only a real PostgreSQL can, which is what
# scripts/local/verify-e-db1-assessment-summary-boundary.sh exists for. What it
# CAN do is refuse a future edit that quietly widens the payload or removes the
# single enforcement call, which is the change most likely to be made by someone
# who never reads the pgTAP suite.
#
# Everything is judged on COMMENT-STRIPPED SQL. Guards in this repository have
# repeatedly failed correct content by matching their own prose or a substring of
# an unrelated identifier; the rule here is to check receivers and structure, and
# to scope every assertion to this slice's own delta.

set -uo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { printf 'STOP: cannot reach repository root\n'; exit 1; }

MIGRATION="supabase/migrations/0141_create_company_assessment_summary_read_boundary.sql"
SUITE="supabase/tests/company_assessment_summary_read_boundary.test.sql"
FROZEN_0062="supabase/migrations/0062_harden_assessment_authorization.sql"

FAILURES=0
fail() { printf '  FAIL %s\n' "$*"; FAILURES=$((FAILURES + 1)); }
pass() { printf '  ok   %s\n' "$*"; }

for f in "$MIGRATION" "$SUITE" "$FROZEN_0062"; do
  [ -f "$f" ] || { printf 'STOP: missing %s\n' "$f"; exit 1; }
done

# Strip `--` line comments so prose can never satisfy a structural assertion, and
# never make one fail either.
code() { sed -E 's/--.*$//' "$1"; }

SQL=$(code "$MIGRATION")

printf '[guard e-db1] migration surface\n'

# 1. One function, and it is the one this slice is authorized to add.
CREATES=$(printf '%s\n' "$SQL" | grep -ciE '^[[:space:]]*create( or replace)? function')
if [ "$CREATES" -eq 1 ]; then
  pass "declares exactly one function"
else
  fail "declares $CREATES functions; this slice authorizes exactly one"
fi
printf '%s\n' "$SQL" | grep -qE 'create( or replace)? function public\.get_company_assessment_summary_v1\(' \
  && pass "the function is get_company_assessment_summary_v1" \
  || fail "the created function is not get_company_assessment_summary_v1"

# 2. Trusted-boundary posture.
printf '%s\n' "$SQL" | grep -qiE '^[[:space:]]*security definer' \
  && pass "security definer" || fail "not security definer"
printf '%s\n' "$SQL" | grep -qiE '^[[:space:]]*set search_path = public, pg_temp' \
  && pass "search_path is fixed to public, pg_temp" \
  || fail "search_path is not fixed to 'public, pg_temp'"

# 3. Exactly ONE authorization/audit call, and no loop that could turn it into N.
#    This is the audit-cardinality property as far as text can carry it.
AUDIT_CALLS=$(printf '%s\n' "$SQL" | grep -c 'public\.audit_secure_administrative_read(')
if [ "$AUDIT_CALLS" -eq 1 ]; then
  pass "exactly one audit_secure_administrative_read call"
else
  fail "found $AUDIT_CALLS audit_secure_administrative_read calls; the contract is exactly one"
fi
if printf '%s\n' "$SQL" | grep -qiE '^[[:space:]]*(for|while|loop)\b'; then
  fail "the body contains a loop; a per-row loop is how audit cardinality regresses"
else
  pass "no loop in the body"
fi

# 4. The authorization call must come BEFORE the read. A boundary that reads and
#    then audits has already leaked on the path where the audit raises.
AUDIT_LINE=$(printf '%s\n' "$SQL" | grep -n 'public\.audit_secure_administrative_read(' | head -1 | cut -d: -f1)
QUERY_LINE=$(printf '%s\n' "$SQL" | grep -niE '^[[:space:]]*return query' | head -1 | cut -d: -f1)
if [ -n "$AUDIT_LINE" ] && [ -n "$QUERY_LINE" ] && [ "$AUDIT_LINE" -lt "$QUERY_LINE" ]; then
  pass "authorization precedes the read"
else
  fail "cannot establish that authorization precedes the read (audit=$AUDIT_LINE query=$QUERY_LINE)"
fi

# 5. MINIMUM NECESSARY DATA. The payload is aggregates; none of these may appear
#    anywhere in the executable surface.
for forbidden in assessment_answers full_name email 'ar\.score' 'response\.score' assessment_sections assessment_questions; do
  if printf '%s\n' "$SQL" | grep -qE "$forbidden"; then
    fail "the boundary references '$forbidden'; the payload must stay aggregate-only"
  else
    pass "no reference to '$forbidden'"
  fi
done

# 6. Tenancy is explicit. The filter is asserted on its RECEIVER, so an alias
#    rename is fine and a missing filter is not.
printf '%s\n' "$SQL" | grep -qE '\bwhere[[:space:]]+[a-z_]+\.company_id[[:space:]]*=[[:space:]]*p_company_id' \
  && pass "the aggregate is filtered by p_company_id" \
  || fail "no explicit company_id = p_company_id filter on the aggregate"

# 7. Privilege closure.
printf '%s\n' "$SQL" | grep -qE 'revoke all on function public\.get_company_assessment_summary_v1' \
  && pass "revokes all before granting" || fail "does not revoke all"
for role in public anon service_role; do
  printf '%s\n' "$SQL" | grep -E 'revoke all' -A2 | grep -qE "(^|[ ,])$role([ ,;]|$)" \
    && pass "revoked from $role" || fail "not revoked from $role"
done
GRANTS=$(printf '%s\n' "$SQL" | grep -ciE '^[[:space:]]*grant ')
if [ "$GRANTS" -eq 1 ] && printf '%s\n' "$SQL" | grep -qE 'grant execute on function public\.get_company_assessment_summary_v1'; then
  pass "exactly one grant, execute to a single role"
else
  fail "expected exactly one grant of execute on this function; found $GRANTS grant statement(s)"
fi
# The grant's role LIST must be exactly `authenticated`. Grepping for
# "to authenticated" is not enough: `to authenticated, service_role` contains it,
# and that is precisely the widening this assertion exists to catch. So the list
# is extracted whole, across lines, and compared.
GRANT_ROLES=$(printf '%s\n' "$SQL" \
  | tr '\n' ' ' \
  | sed -nE 's/.*grant execute on function public\.get_company_assessment_summary_v1[^;]*[^a-z_]to[[:space:]]+([^;]*);.*/\1/p' \
  | tr -s ' ' | sed -E 's/^ +| +$//g')
if [ "$GRANT_ROLES" = "authenticated" ]; then
  pass "the grant target list is exactly 'authenticated'"
else
  fail "the grant target list is '${GRANT_ROLES:-<unparsed>}'; it must be exactly 'authenticated'"
fi

# 8. The slice adds a boundary. It does not reshape anything else.
printf '[guard e-db1] blast radius\n'
if printf '%s\n' "$SQL" | grep -qiE '^[[:space:]]*(alter table|drop |create policy|drop policy|alter policy|create table|create trigger)'; then
  fail "the migration alters tables, policies or triggers; this slice adds a read boundary only"
else
  pass "no table, policy or trigger change"
fi
if printf '%s\n' "$SQL" | grep -qE 'create( or replace)? function public\.read_assessment_administratively' \
   || printf '%s\n' "$SQL" | grep -qE 'create( or replace)? function public\.audit_secure_administrative_read'; then
  fail "the migration redefines an existing authorization function"
else
  pass "no existing authorization function is redefined"
fi

# 0062 is the frozen contract this boundary reuses. If the working tree changed
# it, the slice has widened who can read assessments — the explicit stop
# condition — and no amount of green tests makes that in scope.
if git diff --quiet HEAD -- "$FROZEN_0062" 2>/dev/null; then
  pass "0062 is unchanged against HEAD"
else
  fail "0062 has been modified; that is a CONTRACT_CONFLICT, not part of this slice"
fi

# Executive and Employee Intelligence are explicitly out of scope for E-DB1.
CHANGED=$(git diff --name-only HEAD 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null)
OUT_OF_SCOPE=$(printf '%s\n' "$CHANGED" | grep -E \
  'apps/web/src/features/executive/|apps/web/src/app/.*executive|get-employee-intelligence-list|create-employee-intelligence|get-workforce-health|get-executive-overview' \
  | grep -v ' 2\.' || true)
if [ -n "$OUT_OF_SCOPE" ]; then
  fail "out-of-scope files touched:"
  printf '%s\n' "$OUT_OF_SCOPE" | sed 's/^/       /'
else
  pass "Executive and Employee Intelligence are untouched"
fi

# 9. The suite must actually name the properties it claims to prove. A suite that
#    silently loses its cardinality or tenancy test would let the gate go green
#    for the wrong reason.
printf '[guard e-db1] suite covers the named properties\n'
SUITE_CODE=$(code "$SUITE")
while IFS='|' read -r label pattern; do
  printf '%s\n' "$SUITE_CODE" | grep -qE "$pattern" \
    && pass "suite covers: $label" || fail "suite does not cover: $label"
done <<'PROPS'
audit cardinality is one event|activity_type = 'assessments.administrative_read'
tenancy isolation|ADMINISTRATIVE_READ_FORBIDDEN
null auth context|AUTH_REQUIRED
reason validation|ADMINISTRATIVE_READ_REASON_REQUIRED
privilege closure for anon and service_role|has_function_privilege
0062 scope union unchanged|ASSESSMENT_ADMINISTRATIVE_SCOPE_INVALID
PROPS

printf '\n'
if [ "$FAILURES" -eq 0 ]; then
  printf 'E_DB1_STATIC_GUARD=PASS\n'
  exit 0
fi
printf 'E_DB1_STATIC_GUARD=FAIL (%s)\n' "$FAILURES"
printf 'Classify before editing: HARNESS_DEFECT if the guard is wrong about correct\n'
printf 'content, CONTRACT_CONFLICT if the content genuinely leaves this slice.\n'
exit 1
