# Environment Governance — Local → Review → Production

This policy governs schema promotion; it does not authorize deployment. Remote
migration application remains an explicit Human Reviewer action under
`AGENTS.md`.

## Environment roles

| Environment | Responsibility | Data and schema contract |
| --- | --- | --- |
| Local | Iteration, clean replay, pgTAP, local Human Review | Resettable, disposable data; uncommitted migrations allowed but never promotable |
| Review | Canonical shared remote validation | Disposable review data; committed `main` migrations only; target is alignment with `main` |
| Production | Real customer/production operation | Reviewed migrations already verified in Review; explicit approval and recovery preparation |
| Legacy | Forensic/reference use | Never a promotion target without a separate deliberate decision |

There is currently no canonical Review project. Provisioning one is a separate,
explicitly authorized operation.

## Migration lifecycle

```text
LOCAL ONLY → COMMITTED → REVIEW APPLIED → PRODUCTION APPLIED
```

1. Implement one additive migration locally.
2. Run clean replay, focused pgTAP, full DB/application regressions and local
   Human Review when applicable.
3. Commit migration and compatible application code together.
4. Positively identify Review and compare its history read-only.
5. With explicit human authorization, apply the complete committed chain.
6. Run Review DB tests, smoke and remote Human Review.
7. Record `REVIEW APPLIED` in `ENVIRONMENT-MIGRATION-STATUS.md`.
8. Promote separately to Production only after all production gates pass.
9. Record `PRODUCTION APPLIED` after production smoke.

No migration may skip a state or be applied out of order. Applied migrations are
immutable; corrections use a new forward migration.

## Drift policy

Universal hard failures:

- environment identity differs from the explicitly expected project ref;
- remote-only, duplicate or missing-number migrations;
- changed historical migration checksum;
- uncommitted migration presented for promotion.

Local migrations absent from Git are `LOCAL ONLY`. They may be tested locally,
but cannot be promoted.

Review targets the latest committed migration on `main`:

- 1 behind: warning and prompt promotion;
- 2–3 behind: elevated warning; avoid accumulating further DB work;
- more than 3 behind: block another DB-heavy slice.

Production may intentionally lag Review only when the lag and reason are
recorded. There is no automatic production promotion. Remote-only history or
checksum drift always blocks.

## Pre-DB-work guard and permanent Codex rule

Before creating a migration:

1. identify latest local and committed migrations;
2. positively identify canonical Review;
3. obtain read-only Review migration evidence;
4. run the drift checker for Review;
5. confirm Review lag is at most three.

If Review is absent, identity is uncertain, or lag exceeds three, stop and request
provisioning/promotion before another DB-heavy slice. After a migration is
committed and Human Reviewed, the normal next DB action is Review promotion,
verification and status update—not accumulation of more migrations.

## Read-only drift checker

The checker never connects to Supabase, pushes migrations or repairs history:

```bash
node scripts/check-migration-drift.mjs --target LOCAL

node scripts/check-migration-drift.mjs \
  --target REVIEW \
  --expected-project-ref <review-project-ref> \
  --history-file /secure/path/review-history.json \
  --require-committed
```

Evidence schema:

```json
{
  "projectRef": "abcdefghijklmnopqrst",
  "verifiedAt": "2026-08-21T12:00:00Z",
  "migrations": [
    { "version": "0001", "sha256": "<committed-file-sha256>" }
  ]
}
```

Checksums should be captured when application is verified. Missing checksums warn;
mismatches block. Keep evidence outside Git if it contains operational metadata.

## Fresh canonical Review plan

1. Human creates/selects a dedicated Review project.
2. Record ref and Review-only purpose in the status document.
3. Configure credentials outside Git and verify identity positively.
4. Confirm absence of production business data.
5. Replay committed migrations `0001` through `0109` in order.
6. Compare history/checksums with committed `main`.
7. Run full DB regression and application smoke.
8. Seed minimal disposable fixtures through trusted boundaries.
9. Verify Auth, tenant isolation, organization, People and Competencies.
10. Mark Review applied through `0109` and retain evidence.
11. Make its drift check the preflight for later DB-heavy work.

Project creation and remote application are intentionally not executed here.

## Production promotion

Required: explicit approval naming the project ref; Review already verified at the
target; green Review tests/Human Review; backup/snapshot or documented forward
recovery; read-only identity/history comparison; migration-specific data/lock
preflight; ordered application; post-deploy authorization/application smoke; and
status update.

Stop for identity mismatch, missing recovery, Review lag, remote-only history,
checksum drift, unexpected data, insufficient authorization or failed checks.
Never repair migration history during promotion.

## Incident handling

Stop promotion, preserve read-only evidence, and do not edit applied migrations.
Prepare a reviewed forward migration or application revert. Schema rollback uses
a human-approved compensating migration and recovery plan.

## Known remotes

- `oudngmrdtgengilpqqnz`: currently linked locally and previously observed at
  `0075`; role was never canonical and security-significant grant drift exists.
  Recommendation: **LEGACY — forensic/read-only** until a separate human decision
  retires or deliberately migrates it. Catch-up alone does not prove grant repair.
- `gzrrwyiqfbnyprkdeqvm`: documented historically as **PRODUCTION**. Revalidate
  identity and current state before any future operation.

## Prohibited actions

- automatic remote migration application from this checker or CI;
- project creation/deletion without explicit authorization;
- inferring Production from a local link or project name;
- editing applied migrations, out-of-order apply or history repair;
- committing credentials or secret-bearing evidence.
