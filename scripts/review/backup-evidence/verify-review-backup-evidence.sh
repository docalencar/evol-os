#!/usr/bin/env bash
set -uo pipefail
ROOT=$(cd "$(dirname "$0")/../../.." && pwd) || exit 1
[ "$#" -eq 7 ] || { echo 'usage: verify-review-backup-evidence.sh MANIFEST MANIFEST_SIG PROOF PROOF_SIG BUNDLE_COPY_A BUNDLE_COPY_B RUNNER_SHA256'; exit 1; }
for v in EXPECTED_SOURCE_COMMIT EXPECTED_OPERATION_ID EXPECTED_LEDGER_FROM EXPECTED_LEDGER_TO EXPECTED_MIGRATION_SHA256; do [ -n "${!v:-}" ] || { echo "BACKUP_EVIDENCE=FAIL: $v required"; exit 1; }; done
unset BACKUP_EVIDENCE_KEYS ALLOW_TEST_KEY BACKUP_EVIDENCE_NOW
exec node "$ROOT/scripts/review/backup-evidence/review-backup-evidence.mjs" verify-and-claim "$@"
