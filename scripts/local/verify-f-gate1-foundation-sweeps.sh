#!/usr/bin/env bash
#
# F-GATE1 LOCAL database gate — repo-wide Foundation sweeps over a RED baseline.
#
#   bash scripts/local/verify-f-gate1-foundation-sweeps.sh
#
# Run it as its own process. Never source it.
#
# WHAT IT PROVES
#
#   1. ADR-0012 — every tenant-owned FK in `public` is composite. Asked of the
#      catalog with no allow-list, so a table nobody listed cannot be silently
#      compliant.
#   2. Client-privilege posture — census and a deterministic baseline fingerprint
#      for the Review comparison that would close the ACL drift.
#   3. No committed migration EXECUTES `ALTER DEFAULT PRIVILEGES`.
#
# WHY THE SWEEPS LIVE IN supabase/gates AND NOT supabase/tests
#
# The ADR-0012 sweep remains RED by design: F-DB1b reduced the governed baseline
# from 37 to 32 by replacing exactly five Assessment execution FKs. Placing a
# permanently red file under `supabase/tests` would make `supabase test db` red
# forever, and every other gate in scripts/local asserts FULL_DB_SUITE=PASS — so
# one honest baseline would turn the whole harness fleet red and destroy the
# meaning of that signal everywhere. `supabase/historical-tests` is the existing
# precedent for pgTAP kept out of the default run; `supabase/gates` follows it.
# The assertion itself is NOT weakened, skipped or marked TODO.
#
# THE CLOSURE CONDITION
#
# This gate passes when the DETECTOR is correct over the known baseline:
# regression checks green, expected-set intact, and the offender count exactly
# equal to the recorded baseline. It therefore also works as a forward detector —
# the count moving in EITHER direction fails, so new debt cannot be added
# silently and a correction cannot be claimed without updating the baseline.
#
# LOCAL ONLY. No Review credential, no remote contact, no browser. It creates no
# migration and corrects no finding. `supabase db reset` rebuilds the LOCAL
# database — that is its purpose.

set -uo pipefail

# The baseline this gate was validated against. Changing it is a governance
# decision and must cite the slice that moved the number. F-DB1b: 37 -> 32.
readonly BASELINE_OFFENDERS=32
readonly EXPECTED_SLICE_CONSTRAINTS=30

say() { printf '%s\n' "$*"; }

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { say "STOP: cannot reach repository root"; exit 1; }

FK_SWEEP="supabase/gates/adr_0012_tenant_owned_fk_sweep.sql"
ACL_SWEEP="supabase/gates/client_privilege_posture_baseline.sql"

for tool in supabase psql shasum; do
  command -v "$tool" >/dev/null 2>&1 || {
    say "STOP: '$tool' not found. This gate needs the real toolchain; it cannot be simulated."
    say "F_GATE1_MAC_GATE=FAIL"; exit 1; }
done
for f in "$FK_SWEEP" "$ACL_SWEEP"; do
  [ -f "$f" ] || { say "STOP: missing $f"; say "F_GATE1_MAC_GATE=FAIL"; exit 1; }
done

SHA_FK=$(shasum -a 256 "$FK_SWEEP" | cut -d' ' -f1)
SHA_ACL=$(shasum -a 256 "$ACL_SWEEP" | cut -d' ' -f1)
WORK=$(mktemp -d -t fgate1.XXXXXX)

# ---------------------------------------------------------------------------
# 1. Static: no migration EXECUTES ALTER DEFAULT PRIVILEGES.
#
# The canonical prohibition (0121:18, 0126:36, 0127:76, and
# promotion-tooling-guards-0129.test.mjs:56) is about the SQL WE WRITE, not the
# database's state — the platform installs its own default privileges, which is
# exactly what 0121 had to revoke. Judged on the EXECUTABLE surface: the first
# version of this check matched the `--` comments in 0121/0126/0127 that promise
# NOT to use it, flagging three files for saying the right thing.
# ---------------------------------------------------------------------------
NO_DEFAULT_PRIVILEGES=PASS
ADP_HITS=""
for m in supabase/migrations/*.sql; do
  if sed -E 's/--.*$//' "$m" | tr '\n' ' ' | grep -qiE "alter[[:space:]]+default[[:space:]]+privileges"; then
    ADP_HITS="$ADP_HITS  $m"$'\n'
  fi
done
if [ -n "$ADP_HITS" ]; then
  NO_DEFAULT_PRIVILEGES=FAIL
  say "[f-gate1] STOP: a committed migration EXECUTES ALTER DEFAULT PRIVILEGES:"
  printf '%s' "$ADP_HITS"
fi
say "[f-gate1] 1/4 NO_MIGRATION_ALTERS_DEFAULT_PRIVILEGES=$NO_DEFAULT_PRIVILEGES"

# ---------------------------------------------------------------------------
# 2. Reset, then the fleet suite. The sweeps are NOT in supabase/tests, so this
#    must stay green: if it is red, something else broke and this gate must not
#    mask it.
# ---------------------------------------------------------------------------
DB_RESET=FAIL; FULL_DB_SUITE=FAIL; FULL_DB_FILES=UNKNOWN; FULL_DB_ASSERTIONS=UNKNOWN
say "[f-gate1] 2/4 supabase db reset ..."
if supabase db reset >"$WORK/reset.log" 2>&1; then
  DB_RESET=PASS
else
  say "[f-gate1]     DB_RESET=FAIL — migrations did not apply cleanly."
  grep -nE "ERROR:|CONTEXT:|DETAIL:|FATAL|duplicate key" "$WORK/reset.log" | head -20 | sed 's/^/  /'
  say ""
  say "If this is 'duplicate key value violates \"schema_migrations_pkey\"', look for"
  say "untracked \" 2.sql\"/\" 3.sql\" duplicates in supabase/migrations: the CLI"
  say "enumerates the DIRECTORY, not git, so two files sharing a version prefix are"
  say "applied twice. That is E-DB1-GATE1, not a migration defect."
  say ""
  say "F_GATE1_MAC_GATE=FAIL"; say "DB_RESET=FAIL"; say "REVIEW_ACCESSED=NO"; exit 1
fi

say "[f-gate1]     supabase test db (fleet suite, must stay green) ..."
if supabase test db >"$WORK/test.log" 2>&1; then FULL_DB_SUITE=PASS; else FULL_DB_SUITE=FAIL; fi
SUMMARY=$(sed -nE 's/^Files=([0-9]+), Tests=([0-9]+),.*/\1 \2/p' "$WORK/test.log" | tail -1)
if [ -n "$SUMMARY" ]; then FULL_DB_FILES=${SUMMARY%% *}; FULL_DB_ASSERTIONS=${SUMMARY#* }; fi
[ "$FULL_DB_SUITE" = PASS ] || {
  say "[f-gate1]     FULL_DB_SUITE=FAIL — not caused by this gate's sweeps, which do not live in supabase/tests."
  grep -nE "not ok|Failed test|Bail out|ERROR:" "$WORK/test.log" | head -20 | sed 's/^/  /'; }

# ---------------------------------------------------------------------------
# 3. The sweeps, run directly against the proven-local database.
# ---------------------------------------------------------------------------
DB_URL=$(supabase status -o env 2>/dev/null | sed -nE 's/^DB_URL="?([^"]*)"?$/\1/p' | tail -1)
[ -n "$DB_URL" ] || DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DB_HOST=$(printf '%s' "$DB_URL" | sed -nE 's#^[a-z+]+://[^@]*@([^:/]+).*#\1#p')
case "$DB_HOST" in
  localhost|127.0.0.1|::1|"[::1]") : ;;
  *) say "STOP: refusing a non-loopback database host: '${DB_HOST:-<unparsed>}'"
     say "F_GATE1_MAC_GATE=FAIL"; say "TARGET_PROVEN_LOCAL=NO"; exit 1 ;;
esac
case "$DB_URL" in *supabase.co*|*supabase.com*)
  say "STOP: the database URL names a hosted Supabase domain. Refusing."
  say "F_GATE1_MAC_GATE=FAIL"; say "TARGET_PROVEN_LOCAL=NO"; exit 1 ;;
esac

say "[f-gate1] 3/4 sweeps (target proven local: $DB_HOST) ..."
run_sweep() {  # $1 = file, $2 = log; echoes PASS or FAIL
  psql "$DB_URL" -v ON_ERROR_STOP=0 --no-psqlrc -f "$1" >"$2" 2>&1
  if grep -qE "^[[:space:]]*not ok|Bail out!|^[[:space:]]*psql:.*ERROR" "$2"; then printf 'FAIL'
  elif grep -qE "^[[:space:]]*ok 1" "$2"; then printf 'PASS'
  else printf 'FAIL'; fi   # no assertions ran at all is not a pass
}
ADR_0012_SWEEP=$(run_sweep "$FK_SWEEP" "$WORK/fk.log")
ACL_POSTURE=$(run_sweep "$ACL_SWEEP" "$WORK/acl.log")

# Detector health: the parts that must be green even while the contract is red.
SLICE_REGRESSION=PASS
grep -qE "^[[:space:]]*not ok.*every constraint created by the" "$WORK/fk.log" && SLICE_REGRESSION=FAIL
grep -qE "^[[:space:]]*not ok.*no constraint created by a hardening slice has regressed" "$WORK/fk.log" && SLICE_REGRESSION=FAIL
grep -qE "^[[:space:]]*not ok.*the expected set is the 30 surviving" "$WORK/fk.log" && SLICE_REGRESSION=FAIL
SWEEP_OBSERVES=PASS
grep -qE "^[[:space:]]*not ok.*the sweep observes tenant-owned" "$WORK/fk.log" && SWEEP_OBSERVES=FAIL

OFFENDERS=$(grep -oE "offenders: [^']*" "$WORK/fk.log" | head -1 | sed 's/^offenders: //')
OFFENDER_COUNT=$(printf '%s' "$OFFENDERS" | awk -F', ' '{print NF}')
[ -n "$OFFENDERS" ] || OFFENDER_COUNT=0

say ""
say "[f-gate1] ADR-0012 offenders ($OFFENDER_COUNT):"
printf '%s\n' "$OFFENDERS" | fold -w 100 -s | sed 's/^/  /'
say ""
say "[f-gate1] classification and baseline:"
grep -oE "census[^']*" "$WORK/fk.log" "$WORK/acl.log" | sed 's/^[^:]*:/  /' | head -14
say ""
grep -oE "baseline [A-Z_]+=[^ ']*" "$WORK/acl.log" | sed 's/^/  /'

# ---------------------------------------------------------------------------
# 4. Verdict. The ADR-0012 contract is RED by design; what must hold is that the
#    DETECTOR is correct and the baseline has not moved.
# ---------------------------------------------------------------------------
say ""
say "[f-gate1] 4/4 summary"
BASELINE_MATCH=PASS
[ "$OFFENDER_COUNT" = "$BASELINE_OFFENDERS" ] || BASELINE_MATCH=FAIL
DETECTOR=PASS
for v in "$NO_DEFAULT_PRIVILEGES" "$DB_RESET" "$FULL_DB_SUITE" "$ACL_POSTURE" \
         "$SLICE_REGRESSION" "$SWEEP_OBSERVES" "$BASELINE_MATCH"; do
  [ "$v" = PASS ] || DETECTOR=FAIL
done

say ""
say "F_GATE1_DETECTOR=$DETECTOR"
say "DB_RESET=$DB_RESET"
say "NO_MIGRATION_ALTERS_DEFAULT_PRIVILEGES=$NO_DEFAULT_PRIVILEGES"
say "FULL_DB_SUITE=$FULL_DB_SUITE"
say "FULL_DB_FILES=$FULL_DB_FILES"
say "FULL_DB_ASSERTIONS=$FULL_DB_ASSERTIONS"
say "ACL_POSTURE_BASELINE=$ACL_POSTURE"
say "SLICE_CONSTRAINT_REGRESSION=$SLICE_REGRESSION"
say "SWEEP_OBSERVES_CONSTRAINTS=$SWEEP_OBSERVES"
say "ADR_0012_FK_SWEEP=$ADR_0012_SWEEP   (RED BY DESIGN — pre-existing debt)"
say "ADR_0012_OFFENDERS=$OFFENDER_COUNT"
say "ADR_0012_BASELINE=$BASELINE_OFFENDERS"
say "ADR_0012_BASELINE_MATCH=$BASELINE_MATCH"
say "EXPECTED_SLICE_CONSTRAINTS=$EXPECTED_SLICE_CONSTRAINTS"
say "FK_SWEEP_SHA256=$SHA_FK"
say "ACL_SWEEP_SHA256=$SHA_ACL"
say "TARGET_PROVEN_LOCAL=YES"
say "MIGRATION_CREATED=NO"
say "FINDINGS_CORRECTED=NO"
say "REVIEW_ACCESSED=NO"
say "TURNOVER_FIXTURE_TOUCHED=NO"
say ""
say "Logs: $WORK"
if [ "$BASELINE_MATCH" != PASS ]; then
  say ""
  say "The offender count moved ($OFFENDER_COUNT vs baseline $BASELINE_OFFENDERS)."
  say "UP   = new ADR-0012 debt was introduced; classify before anything else."
  say "DOWN = debt was corrected; update BASELINE_OFFENDERS in this file and cite"
  say "       the slice that did it. Never adjust the baseline to silence a red."
fi

[ "$DETECTOR" = PASS ] || exit 1
exit 0
