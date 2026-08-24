# Environment Migration Status

> Operational snapshot, not deployment authorization. Update only from verified
> read-only evidence or after an explicitly approved promotion.

| Environment | Project ref | Purpose | Latest migration | Last verified | Status | Notes |
| --- | --- | --- | ---: | --- | --- | --- |
| Local | `evol-os` | Disposable development and local review | `0114` | 2026-08-24 | ALIGNED WITH COMMITTED MAIN | Clean replay, full pgTAP and local Human Review passed through 0114. |
| Review | `rwfvxvbzaosgcyfxdjpt` | Canonical shared remote validation | `0114` | 2026-08-24T02:26:18Z | ACTIVE / ALIGNED / REVIEW APPLIED | **Evol Review**, Free plan, Americas (`us-west-2` physical region). Migration `0114` was promoted alone after Human Review PASS. Two disposable, answerless, unreconstructible 0112 smoke Responses were removed through an explicitly approved targeted Review remediation before retry; no business data was involved. Fresh evidence covers `0001`–`0114` with no gaps, remote-only migration or checksum drift. Legacy snapshot backfill, hardened grants, trusted functional and authenticated application smokes passed; disposable cycles and models were archived through trusted RPCs, while immutable Response/Answer/snapshot history was retained. Hosted CLI pgTAP execution remains blocked because the generated login role cannot resolve the installed pgTAP functions; no out-of-band grant was added. |
| Production | `gzrrwyiqfbnyprkdeqvm` | Production per documented historical preflight | UNKNOWN | 2026-08-09 | REVERIFY BEFORE USE | Historical evidence says structures from 0070/0071 were absent; current history is unknown. |
| Legacy | `oudngmrdtgengilpqqnz` | Former remote; forensic/reference only | `0075` (previously observed) | 2026-08-21 | LEGACY / NOT A PROMOTION TARGET | Not linked or mutated during the 0110/0111 Review promotion; historical grant drift still requires a separate audit. |

## Tracking rule

Track each environment's latest verified migration. Per-migration rows are not
needed because ordered history and checksums are checked from read-only evidence.
Record individual exceptions only for partial, blocked or deliberately delayed
promotion.

Canonical Review is provisioned and validated through `0114`. Any later schema
promotion remains a separate, explicitly authorized operation under the canonical
governance policy.
