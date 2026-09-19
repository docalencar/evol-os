#!/usr/bin/env bash
#
# LOCAL database gate for the D-R2 promotion tooling (migration 0133).
#
#   bash scripts/review/run-d-r2-local-db-gate.sh
#
# Run it as its own process. Never source it, never eval it: a nonzero exit is a
# normal result and must not be able to close an interactive shell.
#
# WHY THIS EXISTS
#
# promotion-tooling-guards-d-r2.test.mjs pattern-matches the promotion scripts; it
# never sends their SQL to a server. That gap has cost this repository twice, and
# both times the defect surfaced against canonical Review:
#
#   * a "char" concatenation of `provolatile` in the 0127 verifier, which made
#     Postgres raise "operator is not unique" and ON_ERROR_STOP abort the whole
#     POST file — after the mutation it was meant to verify had happened;
#   * a FILTER clause on a non-aggregate in the 0128 runner.
#
# Neither is visible to a regex or to a shell syntax check. Only a planner sees
# them. So this gate makes a real PostgreSQL the FIRST reader of both D-R2
# snapshots, instead of Review.
#
# THE PROBLEM THIS GATE HAS TO SOLVE
#
# `supabase db reset` applies EVERY migration, 0133 included, so a freshly reset
# database is never in the pre-0133 state. The 0128 gate skipped PRE for exactly
# that reason, and the consequence was that the next PRE snapshot's first contact
# with a real planner was production-adjacent.
#
# So the pre-state is CONSTRUCTED here rather than assumed: reset gives the
# applied state, the function and its ledger row are removed to synthesise the
# pre-state, the real PRE snapshot runs against it, the canonical 0133 file is
# then applied verbatim by psql, and the real POST verifier runs against the
# result. Both snapshots execute, both against a server, in the order the
# promotion runner will use them.
#
# LOCAL ONLY. It never reads a Review credential, never contacts Review,
# Production or Legacy. `supabase db reset` destroys and rebuilds the LOCAL
# database — that is its purpose.

set -uo pipefail   # NOT -e: every step is checked explicitly and fails closed.

say(){ printf '%s\n' "$*"; }

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { say "STOP: cannot reach repository root"; exit 1; }

MIGRATION="supabase/migrations/0133_create_development_plan_origin_read_boundary.sql"
PRE_VERIFIER="scripts/review/verify-d-r2-development-origin-pre.sh"
POST_VERIFIER="scripts/review/verify-d-r2-development-origin-post.sh"
PROMOTER="scripts/review/promote-d-r2-development-origin.sh"
EXPECTED_S133="2791febff1b790712ffe60f13cf9e8227427c498b8310fcaf2f91977899509eb"
FUNCTION_SIGNATURE="public.get_authorized_development_plan_origins_v1(uuid,uuid)"

say "[gate-d-r2] repo: $REPO_ROOT"

for tool in supabase psql shasum; do
  command -v "$tool" >/dev/null 2>&1 || {
    say "STOP: '$tool' not found. This gate needs the real toolchain; it cannot be simulated."
    say "D_R2_LOCAL_GATE=FAIL"; exit 1; }
done
MISSING=0
for f in "$MIGRATION" "$PRE_VERIFIER" "$POST_VERIFIER" "$PROMOTER"; do
  [ -f "$f" ] || { say "STOP: missing $f"; MISSING=1; }
done
[ "$MISSING" -eq 0 ] || { say "D_R2_LOCAL_GATE=FAIL"; exit 1; }

ACTUAL_S133=$(shasum -a 256 "$MIGRATION" | cut -d' ' -f1)
if [ "$ACTUAL_S133" != "$EXPECTED_S133" ]; then
  say "STOP: migration hash drift. expected=$EXPECTED_S133 actual=$ACTUAL_S133"
  say "D_R2_LOCAL_GATE=FAIL"; exit 1
fi
say "[gate-d-r2] migration sha256 = $ACTUAL_S133 (canonical)"

# Local Supabase connection. Loopback only — asserted, not assumed.
DB_HOST=${DB_HOST:-127.0.0.1}; DB_PORT=${DB_PORT:-54322}
DB_USER=${DB_USER:-postgres};  DB_NAME=${DB_NAME:-postgres}
export PGPASSWORD="${PGPASSWORD:-postgres}" PGCONNECT_TIMEOUT=15
export DB_HOST DB_PORT DB_USER DB_NAME
case "$DB_HOST" in
  127.0.0.1|localhost|::1|[::1]) : ;;
  *) say "STOP: this gate runs against the LOCAL database only (DB_HOST=$DB_HOST)"
     say "D_R2_LOCAL_GATE=FAIL"; exit 1 ;;
esac
say "[gate-d-r2] target: local Supabase database ($DB_HOST:$DB_PORT)"

psql_local(){ psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 --no-psqlrc -At </dev/null "$@"; }

RESET_LOG=$(mktemp -t dr2gatereset.XXXXXX)
PRE_OUT=$(mktemp -t dr2gatepre.XXXXXX)
APPLY_LOG=$(mktemp -t dr2gateapply.XXXXXX)
POST_OUT=$(mktemp -t dr2gatepost.XXXXXX)

DB_RESET=FAIL; PRE_SNAPSHOT=FAIL; PRE_CONTRACT=FAIL; READ_ONLY_PROOF=FAIL
MIGRATION_APPLIES=FAIL; POST_SNAPSHOT=FAIL

# ---------------------------------------------------------------------------
# 1. canonical local history, 0133 included.
# ---------------------------------------------------------------------------
say "[gate-d-r2] 1/5 supabase db reset ..."
if supabase db reset >"$RESET_LOG" 2>&1; then
  DB_RESET=PASS; say "[gate-d-r2]     DB_RESET=PASS"
else
  say "[gate-d-r2]     DB_RESET=FAIL"
  grep -nE "ERROR:|CONTEXT:|DETAIL:|FATAL|failed" "$RESET_LOG" | head -20 | sed 's/^/  /'
  say "Full log: $RESET_LOG"; say "D_R2_LOCAL_GATE=FAIL"; exit 1
fi

# ---------------------------------------------------------------------------
# 2. synthesise the pre-0133 state. Only 0133's own artifacts are removed: the
#    function it creates and its ledger row. Nothing else is touched, so what the
#    PRE snapshot then reads is the real pre-migration shape.
# ---------------------------------------------------------------------------
say "[gate-d-r2] 2/5 synthesising the pre-0133 state ..."
if ! psql_local -c "drop function if exists $FUNCTION_SIGNATURE;" >>"$APPLY_LOG" 2>&1 \
  || ! psql_local -c "delete from supabase_migrations.schema_migrations where version like '0133%';" >>"$APPLY_LOG" 2>&1; then
  say "[gate-d-r2]     could not construct the pre-state"; sed 's/^/  /' "$APPLY_LOG" | tail -10
  say "D_R2_LOCAL_GATE=FAIL"; exit 1
fi
NAMECOUNT=$(psql_local -c "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_authorized_development_plan_origins_v1';")
[ "$NAMECOUNT" = "0" ] || { say "[gate-d-r2]     pre-state not reached (namecount=$NAMECOUNT)"; say "D_R2_LOCAL_GATE=FAIL"; exit 1; }
say "[gate-d-r2]     pre-state constructed"

# ---------------------------------------------------------------------------
# 3. the REAL PRE snapshot, against a real planner. This is the step the earlier
#    gates skipped, and the one that would have caught both historical defects.
# ---------------------------------------------------------------------------
say "[gate-d-r2] 3/5 executing the real PRE snapshot ..."
if bash "$PRE_VERIFIER" >"$PRE_OUT" 2>&1; then
  PRE_SNAPSHOT=PASS; say "[gate-d-r2]     PRE_SNAPSHOT=PASS ($(wc -l <"$PRE_OUT" | tr -d ' ') labels)"
else
  say "[gate-d-r2]     PRE_SNAPSHOT=FAIL — the PRE SQL did not execute:"
  sed 's/^/  /' "$PRE_OUT" | tail -20
  say "D_R2_LOCAL_GATE=FAIL"; exit 1
fi

# Every label the promotion runner reads must be present and correct for a
# genuine pre-0133 database. A missing label silently becomes an empty string in
# the runner's comparison, so presence is checked as well as value.
preval(){ grep -m1 "^$1=" "$PRE_OUT" | cut -d= -f2-; }
PRE_FAIL=0
for pair in MIGRATION_0130_COUNT=1 MIGRATION_0131_COUNT=1 MIGRATION_0132_COUNT=1 \
            MIGRATION_0133_COUNT=0 MIGRATIONS_AFTER_0132=0 \
            ORIGIN_NAMECOUNT=0 ORIGIN_SIGNATURE_PRESENT=false ORIGIN_ACL_ROWS=0 \
            PLAN_READ_PREDICATE_PRESENT=true PLANS_READER_PRESENT=true \
            IS_COMPANY_MEMBER_PRESENT=true LEDGER_TABLE_COUNT=3 \
            RETENTION_PRESENT=true RETENTION_FOUR_RELATIONS=4; do
  key=${pair%%=*}; expected=${pair#*=}
  grep -q "^$key=" "$PRE_OUT" || { say "[gate-d-r2]     MISSING PRE label: $key"; PRE_FAIL=1; continue; }
  actual=$(preval "$key")
  [ "$actual" = "$expected" ] || { say "[gate-d-r2]     PRE $key expected=$expected actual=$actual"; PRE_FAIL=1; }
done
for key in MIGRATION_HISTORY LEDGER_ACL_FINGERPRINT LEDGER_RLS_FINGERPRINT \
           DEVELOPMENT_POLICY_FINGERPRINT DEVELOPMENT_RLS_FINGERPRINT \
           DEVELOPMENT_ACL_FINGERPRINT RETENTION_BODY_FINGERPRINT; do
  grep -q "^$key=" "$PRE_OUT" || { say "[gate-d-r2]     MISSING PRE fingerprint: $key"; PRE_FAIL=1; }
done
if [ "$PRE_FAIL" -eq 0 ]; then PRE_CONTRACT=PASS; say "[gate-d-r2]     PRE_CONTRACT=PASS"
else say "[gate-d-r2]     PRE_CONTRACT=FAIL"; fi

# ---------------------------------------------------------------------------
# 3b. READ-ONLY PROOF — the PRE verifier itself must be unable to mutate.
#
# The property is about the VERIFIER'S OWN execution context, and an earlier
# version of this probe measured something else entirely. It ran
#
#     psql -c "set default_transaction_read_only = on; create table ..."
#
# which was wrong twice over, either reason sufficient on its own:
#
#   1. a NEW psql process opens a NEW server connection. A session GUC set in
#      the verifier's connection — a process that had already exited — has no
#      bearing on it. Whatever that probe observed was a fact about itself.
#
#   2. psql sends a multi-statement -c string as ONE simple query, which the
#      server runs in ONE implicit transaction. `default_transaction_read_only`
#      supplies the default for transactions started AFTER it takes effect; the
#      current transaction's read-only flag was already fixed at transaction
#      start, from `off`. So the CREATE TABLE ran read-write and the probe was
#      guaranteed to report failure on every database, forever.
#
# The verifier does not have that problem, and the difference is exactly why it
# has to be tested in its own context: it feeds psql from STDIN, where psql
# sends statements one at a time under autocommit. Its `set` commits in its own
# transaction, and every later statement starts a NEW transaction that inherits
# read-only. That is the context this probe must run in.
#
# So the proof below takes the verifier's OWN SQL document, byte for byte, feeds
# it to psql exactly as the verifier does, and appends two statements: one that
# measures the effective transaction state, and one that attempts a mutation and
# must be refused with SQLSTATE 25006. Deleting the `set` line from the verifier
# makes this proof fail, which is the point.
say "[gate-d-r2] 3b/5 proving the PRE verifier cannot mutate ..."
PROBE_SQL=$(mktemp -t dr2gateprobe.XXXXXX)
PROBE_OUT=$(mktemp -t dr2gateprobeout.XXXXXX)
READ_ONLY_PROOF=FAIL

awk "/<<'SQL'/{f=1;next} /^SQL\$/{f=0} f" "$PRE_VERIFIER" >"$PROBE_SQL"
if [ ! -s "$PROBE_SQL" ]; then
  say "[gate-d-r2]     could not extract the PRE SQL document — the proof cannot run"
elif ! grep -q '^set default_transaction_read_only = on;' "$PROBE_SQL"; then
  say "[gate-d-r2]     the PRE document does not open read-only"
else
  cat >>"$PROBE_SQL" <<'PROBE'
select 'PROBE_TRANSACTION_READ_ONLY=' || current_setting('transaction_read_only');
create table public.d_r2_gate_probe(id int);
PROBE
  # VERBOSITY=verbose makes psql print the SQLSTATE, so the refusal is identified
  # by code rather than by an error string that could change wording.
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 -v VERBOSITY=verbose --no-psqlrc -At \
    <"$PROBE_SQL" >"$PROBE_OUT" 2>&1
  EFFECTIVE=$(grep -m1 '^PROBE_TRANSACTION_READ_ONLY=' "$PROBE_OUT" | cut -d= -f2-)
  if [ "$EFFECTIVE" != "on" ]; then
    say "[gate-d-r2]     the verifier's own transaction is not read-only (transaction_read_only=${EFFECTIVE:-<unreported>})"
  elif grep -q '25006' "$PROBE_OUT"; then
    READ_ONLY_PROOF=PASS
    say "[gate-d-r2]     READ_ONLY_PROOF=PASS (transaction_read_only=on; mutation refused, SQLSTATE 25006)"
  elif grep -qi 'read-only transaction' "$PROBE_OUT"; then
    READ_ONLY_PROOF=PASS
    say "[gate-d-r2]     READ_ONLY_PROOF=PASS (transaction_read_only=on; mutation refused as read-only)"
  else
    say "[gate-d-r2]     the mutation was NOT refused in the verifier's own context:"
    tail -5 "$PROBE_OUT" | sed 's/^/                /'
  fi
fi

# Defensive: if the mutation somehow succeeded, do not leave the object behind.
psql_local -c "drop table if exists public.d_r2_gate_probe;" >/dev/null 2>&1

# ---------------------------------------------------------------------------
# 4. apply the canonical migration file verbatim — the payload the promotion
#    runner will send — and record it in the ledger exactly as a push would.
# ---------------------------------------------------------------------------
say "[gate-d-r2] 4/5 applying the canonical 0133 ..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
     -v ON_ERROR_STOP=1 --no-psqlrc -f "$MIGRATION" >>"$APPLY_LOG" 2>&1 \
   && psql_local -c "insert into supabase_migrations.schema_migrations(version,name) values ('0133','create_development_plan_origin_read_boundary') on conflict do nothing;" >>"$APPLY_LOG" 2>&1; then
  MIGRATION_APPLIES=PASS; say "[gate-d-r2]     MIGRATION_APPLIES=PASS"
else
  say "[gate-d-r2]     MIGRATION_APPLIES=FAIL"; sed 's/^/  /' "$APPLY_LOG" | tail -20
  say "D_R2_LOCAL_GATE=FAIL"; exit 1
fi

# ---------------------------------------------------------------------------
# 5. the REAL POST verifier, with the PRE fingerprints handed over exactly as the
#    promotion runner hands them over. A fingerprint that moved is a failure here
#    for the same reason it would be against Review.
# ---------------------------------------------------------------------------
say "[gate-d-r2] 5/5 executing the real POST verifier ..."
export PRE_LEDGER_ACL_FINGERPRINT="$(preval LEDGER_ACL_FINGERPRINT)"
export PRE_LEDGER_RLS_FINGERPRINT="$(preval LEDGER_RLS_FINGERPRINT)"
export PRE_POLICY_FINGERPRINT="$(preval DEVELOPMENT_POLICY_FINGERPRINT)"
export PRE_RLS_FINGERPRINT="$(preval DEVELOPMENT_RLS_FINGERPRINT)"
export PRE_ACL_FINGERPRINT="$(preval DEVELOPMENT_ACL_FINGERPRINT)"
export PRE_RETENTION_FINGERPRINT="$(preval RETENTION_BODY_FINGERPRINT)"

if bash "$POST_VERIFIER" >"$POST_OUT" 2>&1; then
  POST_SNAPSHOT=PASS; say "[gate-d-r2]     POST_SNAPSHOT=PASS"
else
  POST_SNAPSHOT=FAIL; say "[gate-d-r2]     POST_SNAPSHOT=FAIL:"
  grep -E "^FAIL|ERROR:|D_R2_POST=" "$POST_OUT" | head -20 | sed 's/^/  /'
fi
grep -E "^(ANON_ORIGIN_RPC|AUTHENTICATED_ORIGIN_RPC|ORIGIN_RESULT|ORIGIN_ARGUMENTS|D_R2_POST)=" "$POST_OUT" | sed 's/^/            /'

# ---------------------------------------------------------------------------
# summary
# ---------------------------------------------------------------------------
OVERALL=PASS
for v in "$DB_RESET" "$PRE_SNAPSHOT" "$PRE_CONTRACT" "$READ_ONLY_PROOF" "$MIGRATION_APPLIES" "$POST_SNAPSHOT"; do
  [ "$v" = PASS ] || OVERALL=FAIL
done

say ""
say "D_R2_LOCAL_GATE=$OVERALL"
say "DB_RESET=$DB_RESET"
say "PRE_SNAPSHOT=$PRE_SNAPSHOT"
say "PRE_CONTRACT=$PRE_CONTRACT"
say "READ_ONLY_PROOF=$READ_ONLY_PROOF"
say "MIGRATION_APPLIES=$MIGRATION_APPLIES"
say "POST_SNAPSHOT=$POST_SNAPSHOT"
say "MIGRATION_0133_SHA256=$ACTUAL_S133"
say "REVIEW_ACCESSED=NO"
say "REVIEW_DB_0133=NOT_APPLIED"
say ""
say "Logs: reset=$RESET_LOG pre=$PRE_OUT probe=$PROBE_OUT apply=$APPLY_LOG post=$POST_OUT"
say "NOTE: the LOCAL database is left with 0133 applied, which is its canonical state."

[ "$OVERALL" = PASS ] || exit 1
exit 0
