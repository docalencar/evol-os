#!/usr/bin/env bash
# Parse one Supabase dry-run without treating unknown/partial output as success.
set -uo pipefail
: "${1:?expected migration}" "${2:?exit status}" "${3:?stdout file}" "${4:?stderr file}"
EXPECTED=$1; STATUS=$2; STDOUT_FILE=$3; STDERR_FILE=$4
[[ "$STATUS" =~ ^[0-9]+$ ]] || { echo 'PENDING_SET_INVALID_STATUS'; exit 1; }
for file in "$STDOUT_FILE" "$STDERR_FILE"; do [ -f "$file" ] || { echo 'PENDING_SET_MISSING_EVIDENCE'; exit 1; }; done
PENDING=$(grep -hoE '0[0-9]{3}_[a-z0-9_]+\.sql' "$STDOUT_FILE" "$STDERR_FILE" 2>/dev/null | sort -u | paste -sd, -)
printf 'PENDING_SET=%s\n' "$PENDING"
[ "$STATUS" = 0 ] || exit 1
[ -n "$PENDING" ] || exit 1
[ "$PENDING" = "$EXPECTED" ] || exit 1
