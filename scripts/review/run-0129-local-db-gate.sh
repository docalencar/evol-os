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
# So this gate CONSTRUCTS the pre-migration state locally, runs the real PRE
# snapshot against it, and then puts the database back.
#
# THE TWO ACL STATES, AND WHY THEY ARE NOT THE SAME STATE
#
# The first run of this gate failed, and it was right to. It asserted
# ACTIVITY_SERVICE_PRIVILEGES=8 in both phases, on the assumption that the local
# baseline and Review's baseline were the same. They are not, and migration 0129
# says so in its own header: Review inherited broad relation ACLs when migration
# 0039 created this table, and local environments did not.
#
#   canonical Review, before 0129   {postgres=arwdDxtm/postgres,
#                                    anon=arwdDxtm/postgres,
#                                    authenticated=arwdDxtm/postgres,
#                                    service_role=arwdDxtm/postgres}
#                                   client=16  service_role=8
#
#   local, after reset (0129 applied)
#                                   {postgres=arwdDxtm/postgres,
#                                    service_role=Dxtm/postgres}
#                                   client=0   service_role=4
#
# service_role holds Dxtm locally — TRUNCATE, REFERENCES, TRIGGER, MAINTAIN —
# and never held arwd on this table here. 0129 revokes from public, anon and
# authenticated only, so it is not what produced that difference and it is not
# what would fix it. The two states are modelled separately below: the Review
# PRE state is SYNTHESISED explicitly, and the local state is CAPTURED before
# anything is touched and restored from that capture rather than from a constant.
#
# ORDER MATTERS IN AN ACL. relacl is an array, its text rendering follows the
# order grants were made, and the canonical fingerprint is an md5 of that text.
# So the synthetic state is built by first clearing all four client-facing
# grantees and then granting anon, authenticated and service_role in that exact
# order. A fixture that merely adds privileges to whatever is already there
# would produce the right privilege COUNTS and the wrong fingerprint.
#
# WHAT IT RUNS, IN ORDER
#
#   1. supabase db reset            — rebuild LOCAL from migrations 0001..0129
#   2. supabase test db             — the repository's official pgTAP validation
#   3. POST verifier                — the applied contract, structural + behavioral
#   4. capture the local hardened ACL, by running the real PRE snapshot on it
#   5. synthesise canonical Review PRE, run the real PRE snapshot, assert exactly
#   6. restore from the capture, and prove the restoration by measuring it
#
# SAFETY
#
# LOCAL ONLY. It never reads a remote credential, never contacts Review or
# Production, and refuses to run against anything but a loopback host. Steps 5
# and 6 grant and revoke on the local database — that is the fixture, and step 6
# restores exactly what step 5 changed, then proves it by comparing the final
# relacl and fingerprint against the capture from step 4.
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

# The ACL the canonical Review database carries before 0129, and the md5 of its
# text rendering. Pinned, because reproducing it is the point of step 5.
CANONICAL_REVIEW_PRE_RELACL='{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'
CANONICAL_REVIEW_PRE_FINGERPRINT='46875263bd6598c4534e2df7d1847a5e'
ALL_TABLE_PRIVILEGES='select, insert, update, delete, truncate, references, trigger, maintain'
CLIENT_FACING_GRANTEES='public, anon, authenticated, service_role'

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
SNAP_ORIGINAL=$(mktemp -t evol0129gateorig.XXXXXX)
SNAP_BROAD=$(mktemp -t evol0129gatebroad.XXXXXX)
SNAP_RESTORED=$(mktemp -t evol0129gaterestored.XXXXXX)
RESTORE_SQL=$(mktemp -t evol0129gaterestoresql.XXXXXX)
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

# The synthetic Review PRE state, asserted exactly. The privilege shape and the
# structural contract are both here: a fixture that reproduces the counts but
# breaks the boundary is not a reproduction of Review.
BROAD_EXPECTATIONS="ACTIVITY_CLIENT_PRIVILEGES=16
ACTIVITY_SERVICE_PRIVILEGES=8
ACTIVITY_SELECT_ANON=true
ACTIVITY_SELECT_AUTHENTICATED=true
ACTIVITY_SELECT_PUBLIC=false
ACTIVITY_ACL_FINGERPRINT=$CANONICAL_REVIEW_PRE_FINGERPRINT
ACTIVITY_RELACL=$CANONICAL_REVIEW_PRE_RELACL
ACTIVITY_POLICY_COUNT=2
ACTIVITY_RLS_ENABLED=true
TIMELINE_FILTERS_COMPANY=true
TIMELINE_SECURITY_DEFINER=true
TIMELINE_EXECUTE_AUTHENTICATED=true
ENTITY_TIMELINE_STILL_PRESENT=true
BRIDGE_PRESENT=true
COMPOSITE_FKS_VALIDATED=7
RPC_EXACT_SIGNATURES=5
FEEDBACK_WRITE_PRIVILEGES=0
FEEDBACK_WRITE_POLICIES=0"

FAIL=0
# check_expectations <snapshot-file> <phase> <newline-separated LABEL=value list>
# Pure: it reads a file and a list and reports. The guard tests execute it
# directly against synthetic snapshots, which is how the RED cases are proven
# without a database.
check_expectations() {
  local file="$1" phase="$2" list="$3" line key want actual bad=0
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    key="${line%%=*}"; want="${line#*=}"
    actual=$(label "$key" "$file")
    if [ "$actual" != "$want" ]; then
      say "  FAIL [$phase] $key"
      say "         expected: $want"
      say "         actual:   ${actual:-<absent>}"
      bad=1
    else
      say "  ok   [$phase] $key=$want"
    fi
  done <<EOF
$list
EOF
  return "$bad"
}

# --------------------------------------------------------------------------
say "[gate-0129] 1/6 supabase db reset ..."
if ! supabase db reset >"$RESET_LOG" 2>&1; then
  say "GATE FAIL at APPLY. 0129 did not apply cleanly to a fresh local database."
  tail -40 "$RESET_LOG"; say "Full log: $RESET_LOG"; exit 1
fi
say "[gate-0129]     APPLY PASS (log: $RESET_LOG)"

# --------------------------------------------------------------------------
say "[gate-0129] 2/6 supabase test db ..."
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
say "[gate-0129] 3/6 POST verifier against the applied local database ..."
if ! DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" DB_USER="$DB_USER" DB_NAME="$DB_NAME" PGPASSWORD="$PGPASSWORD" \
  bash "$POST_VERIFIER"; then
  say "GATE FAIL at POST. The applied shape is not the reviewed shape."
  exit 1
fi
say "[gate-0129]     POST PASS"

# --------------------------------------------------------------------------
# 4. Capture. Running the real PRE snapshot here does double duty: it records
#    the state to restore, and it proves the snapshot SQL executes against the
#    HARDENED shape as well as the broad one.
# --------------------------------------------------------------------------
say "[gate-0129] 4/6 capturing the local hardened ACL ..."
if ! snapshot "$SNAP_ORIGINAL"; then
  say "GATE FAIL: the PRE snapshot SQL did not execute against the hardened state."
  cat "$SNAP_ORIGINAL"; exit 1
fi
ORIG_RELACL=$(label ACTIVITY_RELACL "$SNAP_ORIGINAL")
ORIG_FINGERPRINT=$(label ACTIVITY_ACL_FINGERPRINT "$SNAP_ORIGINAL")
ORIG_SERVICE=$(label ACTIVITY_SERVICE_PRIVILEGES "$SNAP_ORIGINAL")
ORIG_CLIENT=$(label ACTIVITY_CLIENT_PRIVILEGES "$SNAP_ORIGINAL")
ORIG_PUBLIC=$(label ACTIVITY_SELECT_PUBLIC "$SNAP_ORIGINAL")
if [ -z "$ORIG_RELACL" ] || [ -z "$ORIG_FINGERPRINT" ]; then
  say "GATE FAIL: could not capture the original ACL. Refusing to mutate a state I cannot restore."
  exit 1
fi
say "[gate-0129]     captured relacl      = $ORIG_RELACL"
say "[gate-0129]     captured fingerprint = $ORIG_FINGERPRINT"
say "[gate-0129]     captured client=$ORIG_CLIENT service_role=$ORIG_SERVICE public_select=$ORIG_PUBLIC"

# The restore script is GENERATED from the captured ACL, not written by hand, so
# it cannot drift from what was actually there. Grantees are replayed in relacl
# order because that order is part of the text the fingerprint hashes.
# UNION ALL does not promise to preserve branch order, so the ordering is an
# explicit sort key rather than an accident of the plan: the revoke must be
# emitted first, and the grants must follow in relacl order.
if ! psql_local -o "$RESTORE_SQL" -c "
select statement from (
  select 0::bigint as ord,
         format('revoke all privileges on table public.activity_events from %s;',
                '$CLIENT_FACING_GRANTEES') as statement
  union all
  select min(o.ord) as ord,
         format('grant %s on table public.activity_events to %s;',
                string_agg(a.privilege_type, ', ' order by a.privilege_type),
                case when a.grantee = 0 then 'public' else a.grantee::regrole::text end) as statement
    from pg_class c
    cross join lateral unnest(c.relacl) with ordinality as o(item, ord)
    cross join lateral aclexplode(array[o.item]) a
   where c.oid = 'public.activity_events'::regclass
     and a.grantee <> c.relowner
   group by a.grantee
) generated
order by ord;" >>"$FIXTURE_LOG" 2>&1; then
  say "GATE FAIL: could not generate the restore script."; cat "$FIXTURE_LOG"; exit 1
fi
say "[gate-0129]     restore script generated from the capture:"
sed 's/^/                /' "$RESTORE_SQL"

restore() { psql_local -f "$RESTORE_SQL" >>"$FIXTURE_LOG" 2>&1; }

# --------------------------------------------------------------------------
# 5. Synthesise canonical Review PRE. Clear first, then grant in canonical
#    order: the fingerprint is an md5 of the ACL's text, and the text follows
#    grant order.
# --------------------------------------------------------------------------
say "[gate-0129] 5/6 synthesising canonical Review PRE and running the real PRE snapshot ..."
trap 'restore' EXIT
if ! psql_local >>"$FIXTURE_LOG" 2>&1 \
  -c "revoke all privileges on table public.activity_events from $CLIENT_FACING_GRANTEES" \
  -c "grant $ALL_TABLE_PRIVILEGES on table public.activity_events to anon" \
  -c "grant $ALL_TABLE_PRIVILEGES on table public.activity_events to authenticated" \
  -c "grant $ALL_TABLE_PRIVILEGES on table public.activity_events to service_role"; then
  say "GATE FAIL: could not construct the canonical Review PRE fixture."
  cat "$FIXTURE_LOG"; exit 1
fi

if ! snapshot "$SNAP_BROAD"; then
  say "GATE FAIL: the PRE snapshot SQL did not execute. This is the failure mode"
  say "           this gate exists to catch before Review ever sees it."
  cat "$SNAP_BROAD"; exit 1
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
check_expectations "$SNAP_BROAD" broad "$BROAD_EXPECTATIONS" || FAIL=1

# --------------------------------------------------------------------------
# 6. Restore from the capture — not from a constant — and prove it by measuring.
# --------------------------------------------------------------------------
say "[gate-0129] 6/6 restoring the local hardened state and re-measuring ..."
restore
trap - EXIT
if ! snapshot "$SNAP_RESTORED"; then
  say "GATE FAIL: the PRE snapshot SQL did not execute after restore."
  cat "$SNAP_RESTORED"; exit 1
fi
RESTORE_EXPECTATIONS="ACTIVITY_RELACL=$ORIG_RELACL
ACTIVITY_ACL_FINGERPRINT=$ORIG_FINGERPRINT
ACTIVITY_SERVICE_PRIVILEGES=$ORIG_SERVICE
ACTIVITY_CLIENT_PRIVILEGES=$ORIG_CLIENT
ACTIVITY_SELECT_PUBLIC=$ORIG_PUBLIC
ACTIVITY_SELECT_ANON=false
ACTIVITY_SELECT_AUTHENTICATED=false"
check_expectations "$SNAP_RESTORED" restored "$RESTORE_EXPECTATIONS" || FAIL=1

# The fingerprint must have MOVED between the two states. Without this, a
# snapshot that always reported the same value would satisfy both phases above
# and be worthless in promotion.
BROAD_FP=$(label ACTIVITY_ACL_FINGERPRINT "$SNAP_BROAD")
if [ -z "$BROAD_FP" ] || [ "$BROAD_FP" = "$ORIG_FINGERPRINT" ]; then
  say "  FAIL [moved] the ACL fingerprint did not change when the privileges did"; FAIL=1
else
  say "  ok   [moved] ACL fingerprint responds to privilege change ($ORIG_FINGERPRINT -> $BROAD_FP)"
fi

say ""
if [ "$FAIL" -ne 0 ]; then
  say "[gate-0129] LOCAL DB GATE FAIL"
  say "            Evidence: original=$SNAP_ORIGINAL broad=$SNAP_BROAD restored=$SNAP_RESTORED"
  say "                      restore-sql=$RESTORE_SQL fixture=$FIXTURE_LOG"
  exit 1
fi
say "[gate-0129] LOCAL DB GATE PASS"
say "            APPLY          = PASS"
say "            pgTAP          = PASS"
say "            POST           = PASS"
say "            PRE SQL        = EXECUTED against a real PostgreSQL server, both states"
say "            REVIEW PRE     = reproduced exactly, fingerprint $CANONICAL_REVIEW_PRE_FINGERPRINT"
say "            RESTORED       = local ACL identical to the captured original"
say ""
say "            Report this result back before any commit, push, PR or promotion."
exit 0
