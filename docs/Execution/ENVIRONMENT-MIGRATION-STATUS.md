# Environment Migration Status

> Operational snapshot, not deployment authorization. Update only from verified
> read-only evidence or after an explicitly approved promotion.

| Environment | Project ref | Purpose | Latest migration | Last verified | Status | Notes |
| --- | --- | --- | ---: | --- | --- | --- |
| Local | `evol-os` | Disposable development and local review | `0109` | 2026-08-21 | ALIGNED WITH COMMITTED MAIN | Clean replay and full pgTAP passed through 0109. |
| Review | `rwfvxvbzaosgcyfxdjpt` | Canonical shared remote validation | `0109` | 2026-08-21T23:34:17Z | ACTIVE / ALIGNED / REVIEW APPLIED | **Evol Review**, Free plan, Americas (`us-west-2` physical region). Migrations `0001`–`0109` applied in order, drift checker ALIGNED, disposable fixture created through Auth/trusted RPCs, security-boundary smoke passed, authenticated application smoke passed and Browser Human Validation passed on 2026-08-21. Hosted CLI pgTAP execution remains blocked because the generated login role cannot resolve the installed pgTAP functions; no out-of-band grant was added. |
| Production | `gzrrwyiqfbnyprkdeqvm` | Production per documented historical preflight | UNKNOWN | 2026-08-09 | REVERIFY BEFORE USE | Historical evidence says structures from 0070/0071 were absent; current history is unknown. |
| Legacy | `oudngmrdtgengilpqqnz` | Former remote; forensic/reference only | `0075` (previously observed) | 2026-08-21 | LEGACY / NOT A PROMOTION TARGET | CLI remains linked; grant drift requires separate audit. |

## Tracking rule

Track each environment's latest verified migration. Per-migration rows are not
needed because ordered history and checksums are checked from read-only evidence.
Record individual exceptions only for partial, blocked or deliberately delayed
promotion.

Canonical Review is provisioned and validated through `0109`. Any later schema
promotion remains a separate, explicitly authorized operation under the canonical
governance policy.
