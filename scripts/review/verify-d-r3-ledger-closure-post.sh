#!/usr/bin/env bash
# Read-only POST verifier for D-R3 Review promotion (migration 0134).
set -uo pipefail
: "${DB_HOST:?}" "${DB_PORT:?}" "${DB_USER:?}" "${DB_NAME:?}" "${PGPASSWORD:?}"
: "${PRE_LEDGER_RLS_FINGERPRINT:?}" "${PRE_LEDGER_POLICY_FINGERPRINT:?}"
: "${PRE_TRUSTED_BOUNDARY_FINGERPRINT:?}" "${PRE_ORIGIN_FINGERPRINT:?}" "${PRE_RETENTION_FINGERPRINT:?}"
export PGPASSWORD PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}"
OUT=$(mktemp -t dr3post.XXXXXX); ERR=$(mktemp -t dr3posterr.XXXXXX); trap 'rm -f "$OUT" "$ERR"' EXIT
if ! bash "$(dirname "$0")/verify-d-r3-ledger-closure-pre.sh" >"$OUT" 2>"$ERR"; then cat "$ERR" >&2; echo D_R3_POST=FAIL; exit 1; fi
val(){ grep -m1 "^$1=" "$OUT" | cut -d= -f2-; }
fail=0
expect(){ actual=$(val "$1"); if [ "$actual" != "$2" ]; then echo "FAIL $1 expected=$2 actual=${actual:-<missing>}"; fail=1; fi; }
expect MIGRATION_0134_COUNT 1; expect MIGRATIONS_AFTER_0133 1; expect AUTH_SELECT_COUNT 0
expect OTHER_CLIENT_PRIV_COUNT 0; expect AUTH_NONSELECT_PRIV_COUNT 0; expect LEDGER_TABLE_COUNT 4
expect SELECT_POLICY_COUNT 4; expect TRUSTED_BOUNDARY_COUNT 4
expect LEDGER_RLS_FINGERPRINT "$PRE_LEDGER_RLS_FINGERPRINT"
expect LEDGER_POLICY_FINGERPRINT "$PRE_LEDGER_POLICY_FINGERPRINT"
expect TRUSTED_BOUNDARY_FINGERPRINT "$PRE_TRUSTED_BOUNDARY_FINGERPRINT"
expect ORIGIN_FINGERPRINT "$PRE_ORIGIN_FINGERPRINT"
expect RETENTION_FINGERPRINT "$PRE_RETENTION_FINGERPRINT"
expect ORIGIN_RESULT 'TABLE(plan_id uuid, template_id uuid, template_version_id uuid, template_name text, template_version_number integer)'
expect RETENTION_RELATIONS 'development_template_application_attempts,development_template_application_lineage,development_template_application_snapshots,development_template_applications'
if [ "$fail" -ne 0 ]; then echo D_R3_POST=FAIL; exit 1; fi
grep -E '^(MIGRATION_0134_COUNT|MIGRATIONS_AFTER_0133|AUTH_SELECT_COUNT|OTHER_CLIENT_PRIV_COUNT|AUTH_NONSELECT_PRIV_COUNT|SELECT_POLICY_COUNT|TRUSTED_BOUNDARY_COUNT|RETENTION_RELATIONS)=' "$OUT"
echo D_R3_POST=PASS
