#!/usr/bin/env bash
#
# Shared PostgREST embedding probe — ONE implementation, two consumers.
#
#   source scripts/local/lib/postgrest-embed-probe.sh   # bash runners
#   bash   scripts/local/lib/postgrest-embed-probe.sh <spec>   # CLI, for tests
#
# WHY THIS FILE EXISTS
#
# The F-DB1b runner first shipped a false PASS: two greps over a TypeScript file
# printed POSTGREST_NAMES=PASS, asserting a relational guarantee nothing had
# measured. The fix added real HTTP, but to make that logic falsifiable without a
# Supabase stack it was duplicated into a self-test path — and two copies of a
# safety check drift, which is a slower version of the same defect.
#
# So the logic lives here once. The runner sources it; the regression suite
# executes it as a CLI. A test sabotages THIS file and asserts the runner's
# verdict changes, which proves the runner really invokes it rather than merely
# mentioning it.
#
# CONTRACT (identical for both consumers)
#
#   postgrest_embed_probe <api_url> <key_var_name> <embed_spec> <work_dir> [direct]
#     echoes exactly one verdict token on stdout:
#       PASS | CONNECTION_FAILED | PGRST201_AMBIGUOUS
#       POSTGREST_ERROR_PGRST<n> | HTTP_<status> | INVALID_JSON
#       NON_LOOPBACK_TARGET | MISSING_CREDENTIAL
#     returns 0 only for PASS.
#
# SECURITY
#
# The credential is passed by VARIABLE NAME, never by value: a value would land
# in argv, which is world-readable in the process list, and OPERATING-METHOD §8
# forbids that. curl receives it through `-K -` on stdin for the same reason.
# Nothing here echoes the key, and the caller is expected not to either.
#
# TARGET
#
# Loopback is asserted inside the probe, so no consumer can opt out and no
# environment variable can redirect it at a remote host. A non-loopback target
# returns NON_LOOPBACK_TARGET *before* any request is issued.

postgrest_embed_probe() {
  local api_url="${1:-}" key_var="${2:-}" spec="${3:-}" work="${4:-}" route="${5:-gateway}"
  local key url body code pgrst host base

  [ -n "$api_url" ] && [ -n "$key_var" ] && [ -n "$spec" ] && [ -n "$work" ] || {
    printf 'MISSING_CREDENTIAL'; return 1; }

  # Indirect expansion: the secret is read from the named variable, never passed.
  key="${!key_var-}"
  [ -n "$key" ] || { printf 'MISSING_CREDENTIAL'; return 1; }

  host=$(printf '%s' "$api_url" | sed -nE 's#^https?://([^:/]+).*#\1#p')
  case "$host" in
    localhost|127.0.0.1|::1|'[::1]') : ;;
    *) printf 'NON_LOOPBACK_TARGET'; return 1 ;;
  esac
  case "$api_url" in *supabase.co*|*supabase.com*) printf 'NON_LOOPBACK_TARGET'; return 1 ;; esac

  # limit=0 makes PostgREST RESOLVE the relationship and return an empty array,
  # so resolution is proven without depending on any row existing.
  case "$route" in
    gateway) base="${api_url%/}/rest/v1" ;;
    direct)  base="${api_url%/}" ;;
    *) printf 'INVALID_ROUTE'; return 1 ;;
  esac
  url="$base/assessment_responses?select=id,${spec}(id)&limit=0"
  body="$work/embed-$(printf '%s' "$spec" | tr -c 'a-zA-Z0-9' '_').json"

  code=$(printf 'header = "apikey: %s"\nheader = "Authorization: Bearer %s"\nsilent\nshow-error\nmax-time = 20\noutput = "%s"\nwrite-out = "%%{http_code}"\nurl = "%s"\n' \
           "$key" "$key" "$body" "$url" \
         | curl -K - 2>"$work/curl.err")

  if [ -z "$code" ] || [ "$code" = 000 ]; then printf 'CONNECTION_FAILED'; return 1; fi

  # PGRST201 is the ambiguous-embedding error a composite-FK migration could
  # plausibly introduce, so it is named rather than folded into a generic code.
  if grep -q '"code":"PGRST201"' "$body" 2>/dev/null; then printf 'PGRST201_AMBIGUOUS'; return 1; fi
  pgrst=$(grep -oE '"code":"PGRST[0-9]+"' "$body" 2>/dev/null | head -1)
  if [ -n "$pgrst" ]; then printf 'POSTGREST_ERROR_%s' "${pgrst//[^A-Z0-9]/}"; return 1; fi

  [ "$code" = 200 ] || { printf 'HTTP_%s' "$code"; return 1; }

  # 200 alone is not evidence: a proxy or login page answers 200 too. The body
  # must parse as JSON and be an array.
  node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));if(!Array.isArray(j))throw 0' \
    "$body" >/dev/null 2>&1 || { printf 'INVALID_JSON'; return 1; }

  printf 'PASS'
}

# CLI mode when executed rather than sourced. The regression suite drives this
# path; the runner drives the function. Same code either way.
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  set -uo pipefail
  PROBE_WORK=$(mktemp -d -t pgrstprobe.XXXXXX)
  trap 'rm -rf "$PROBE_WORK"' EXIT
  : "${POSTGREST_PROBE_URL:?POSTGREST_PROBE_URL is required}"
  : "${POSTGREST_PROBE_KEY:?POSTGREST_PROBE_KEY is required}"
  VERDICT=$(postgrest_embed_probe "$POSTGREST_PROBE_URL" POSTGREST_PROBE_KEY "${1:?embed spec required}" "$PROBE_WORK")
  RC=$?
  printf '%s\n' "$VERDICT"
  exit "$RC"
fi
