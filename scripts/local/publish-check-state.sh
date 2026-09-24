#!/usr/bin/env bash
#
# Select the state of ONE named CI check from `gh pr checks` output.
#
#   printf '%s\n' "$CI" | bash scripts/local/publish-check-state.sh <exact-check-name>
#
# stdin  : lines of "<STATE>\t<NAME>", exactly what
#          `gh pr checks --json name,state --jq '.[]|[.state,.name]|@tsv'` emits.
# stdout : that check's state, or nothing.
# exit 0 : the named check was reported.
# exit 1 : it was not — the caller must treat that as missing evidence and block.
#
# WHY THIS IS A SEPARATE SCRIPT
#
# The gate's own step 4/9 cannot run without `gh` and a live PR, so the selection
# rule could not be tested where it is written. Here it is a pure stdin->stdout
# filter with no network, so every case — success, pending, failure, absent,
# unrelated-but-green — is provable in the test suite.
#
# WHY THE MATCH IS EXACT
#
# The previous matcher was `grep -iE "$m_require_check"` over the whole line. That
# is a case-insensitive REGEX over both columns, so it could match the STATE
# column, match a different job whose name merely contains the required string,
# or interpret regex metacharacters in a check name. A required check must be
# satisfied by the check that was actually named, and by nothing else.

set -uo pipefail

[ $# -eq 1 ] || { printf 'usage: publish-check-state.sh <exact-check-name>\n' >&2; exit 2; }
[ -n "$1" ]  || { printf 'publish-check-state.sh: check name must not be empty\n' >&2; exit 2; }

awk -F'\t' -v want="$1" '
  $2 == want { print $1; found = 1; exit }
  END        { exit(found ? 0 : 1) }
'
