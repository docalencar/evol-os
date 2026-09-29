#!/usr/bin/env bash
set -euo pipefail

readonly REVIEW_URL="https://evol-os-review.vercel.app"
readonly REVIEW_REF="rwfvxvbzaosgcyfxdjpt"
readonly PRODUCTION_REF="gzrrwyiqfbnyprkdeqvm"
readonly LEGACY_REF="oudngmrdtgengilpqqnz"

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [[ "${E2E_BASE_URL:-}" != "$REVIEW_URL" ]]; then
  echo "E_E2E0_TARGET_REJECTED: E2E_BASE_URL must be canonical Review" >&2
  exit 1
fi

supabase_ref=""
if [[ "${E2E_SUPABASE_URL:-}" =~ ^https://([a-z0-9]{20})\.supabase\.co/?$ ]]; then
  supabase_ref="${BASH_REMATCH[1]}"
fi

if [[ "$supabase_ref" == "$PRODUCTION_REF" || "$supabase_ref" == "$LEGACY_REF" ]]; then
  echo "E_E2E0_TARGET_FORBIDDEN: Production and Legacy are never valid targets" >&2
  exit 1
fi

if [[ "$supabase_ref" != "$REVIEW_REF" ]]; then
  echo "E_E2E0_TARGET_REJECTED: Supabase target must be canonical Review" >&2
  exit 1
fi

if [[ "${E2E_ALLOW_NON_REVIEW_TARGET:-false}" != "false" ]]; then
  echo "E_E2E0_ESCAPE_HATCH_REJECTED: non-Review targeting is forbidden" >&2
  exit 1
fi

if [[ ! "${E2E_DEPLOYED_COMMIT_SHA:-}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "E_E2E0_DECLARED_SHA_REQUIRED: set the 40-hex canonical main SHA" >&2
  exit 1
fi

exec npm --workspace apps/web run e2e:review -- \
  --project=authenticated \
  e2e/specs/18-executive-journey.spec.ts
