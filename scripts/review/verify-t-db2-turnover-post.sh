#!/usr/bin/env bash
# Read-only POST verifier for T-DB2 Review promotion (migration 0142).
set -uo pipefail
: "${DB_HOST:?}" "${DB_PORT:?}" "${DB_USER:?}" "${DB_NAME:?}" "${PGPASSWORD:?}"
: "${PRE_PEOPLE_POLICY_FINGERPRINT:?}" "${PRE_PEOPLE_ACL_FINGERPRINT:?}" "${PRE_PEOPLE_CLIENT_DML_COUNT:?}" "${PRE_ADMIN_AUDIT_FINGERPRINT:?}"
export PGPASSWORD PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}"
OUT=$(mktemp -t tdb2post.XXXXXX); ERR=$(mktemp -t tdb2posterr.XXXXXX); trap 'rm -f "$OUT" "$ERR"' EXIT
if ! bash "$(dirname "$0")/verify-t-db2-turnover-pre.sh" >"$OUT" 2>"$ERR"; then cat "$ERR" >&2; echo T_DB2_POST=FAIL; exit 1; fi
val(){ grep -m1 "^$1=" "$OUT" | cut -d= -f2-; }
fail=0
expect(){ actual=$(val "$1"); if [ "$actual" != "$2" ]; then echo "FAIL $1 expected=$2 actual=${actual:-<missing>}"; fail=1; fi; }
expect MIGRATION_0142_COUNT 1
expect MIGRATIONS_AFTER_0141 1
expect MIGRATIONS_AFTER_0142 0
expect TURNOVER_TABLE_COUNT 1
expect TURNOVER_NAME_COUNT 3
expect TURNOVER_EXACT_FUNCTION_COUNT 3
expect TURNOVER_TRIGGER_COUNT 1
expect TURNOVER_TABLE_RLS true
expect TURNOVER_TABLE_ROWS 0
expect TURNOVER_CLIENT_TABLE_PRIV_COUNT 0
expect TURNOVER_SECURITY_DEFINER_COUNT 3
expect TURNOVER_FIXED_SEARCH_PATH_COUNT 3
expect TURNOVER_AUTH_EXECUTE 1
expect TURNOVER_FORBIDDEN_EXECUTE_COUNT 0
expect TURNOVER_HELPER_CLIENT_EXECUTE_COUNT 0
expect PEOPLE_RLS true
expect PEOPLE_CLIENT_DML_COUNT "$PRE_PEOPLE_CLIENT_DML_COUNT"
expect PEOPLE_POLICY_FINGERPRINT "$PRE_PEOPLE_POLICY_FINGERPRINT"
expect PEOPLE_ACL_FINGERPRINT "$PRE_PEOPLE_ACL_FINGERPRINT"
expect ADMIN_AUDIT_FINGERPRINT "$PRE_ADMIN_AUDIT_FINGERPRINT"
expect TURNOVER_CONSTRAINTS 'company_turnover_closed_shape_check,company_turnover_counts_check,company_turnover_current_count_check,company_turnover_end_count_check,company_turnover_monthly_facts_company_id_fkey,company_turnover_monthly_facts_pkey,company_turnover_period_bounds_check,company_turnover_terminations_check'
expect TURNOVER_RPC_RESULT 'TABLE(period_kind text, period_start date, period_end_exclusive date, availability text, unavailable_reason text, headcount_at_start integer, headcount_at_end integer, headcount_as_of integer, canonical_terminations integer, turnover_percent numeric, coverage_started_at timestamp with time zone, headcount_as_of_at timestamp with time zone, generated_at timestamp with time zone)'
if [ "$(val TURNOVER_RPC_SOURCE_FINGERPRINT)" = absent ] || [ "$(val TURNOVER_TRIGGER_SOURCE_FINGERPRINT)" = absent ]; then echo 'FAIL turnover source fingerprint absent'; fail=1; fi
if [ "$fail" -ne 0 ]; then echo T_DB2_POST=FAIL; exit 1; fi
grep -E '^(MIGRATION_0142_COUNT|MIGRATIONS_AFTER_0142|TURNOVER_TABLE_COUNT|TURNOVER_TABLE_ROWS|TURNOVER_TRIGGER_COUNT|TURNOVER_AUTH_EXECUTE|TURNOVER_FORBIDDEN_EXECUTE_COUNT|TURNOVER_HELPER_CLIENT_EXECUTE_COUNT|TURNOVER_TABLE_RLS|TURNOVER_CLIENT_TABLE_PRIV_COUNT)=' "$OUT"
echo T_DB2_POST=PASS
