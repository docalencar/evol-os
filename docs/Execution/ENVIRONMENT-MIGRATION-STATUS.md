# Environment Migration Status

> Operational snapshot, not deployment authorization. Update only from verified
> read-only evidence or after an explicitly approved promotion.

| Environment | Project ref | Purpose | Latest migration | Last verified | Status | Notes |
| --- | --- | --- | ---: | --- | --- | --- |
| Local | `evol-os` | Disposable development and local review | `0113` | 2026-08-23 | ALIGNED WITH COMMITTED MAIN | Clean replay, full pgTAP and local Human Review passed through 0113. |
| Review | `rwfvxvbzaosgcyfxdjpt` | Canonical shared remote validation | `0113` | 2026-08-24T01:17:00Z | ACTIVE / ALIGNED / REVIEW APPLIED | **Evol Review**, Free plan, Americas (`us-west-2` physical region). Migration `0113` was promoted alone after Human Review PASS. Fresh evidence covers `0001`–`0113` with no gaps, remote-only migration or checksum drift. Security-boundary, trusted functional and authenticated application smokes passed; disposable cycles and models were archived through trusted RPCs, while historical Response/Answer records were retained. Hosted CLI pgTAP execution remains blocked because the generated login role cannot resolve the installed pgTAP functions; no out-of-band grant was added. |
| Production | `gzrrwyiqfbnyprkdeqvm` | Production per documented historical preflight | UNKNOWN | 2026-08-09 | REVERIFY BEFORE USE | Historical evidence says structures from 0070/0071 were absent; current history is unknown. |
| Legacy | `oudngmrdtgengilpqqnz` | Former remote; forensic/reference only | `0075` (previously observed) | 2026-08-21 | LEGACY / NOT A PROMOTION TARGET | Not linked or mutated during the 0110/0111 Review promotion; historical grant drift still requires a separate audit. |

## Tracking rule

Track each environment's latest verified migration. Per-migration rows are not
needed because ordered history and checksums are checked from read-only evidence.
Record individual exceptions only for partial, blocked or deliberately delayed
promotion.

Canonical Review is provisioned and validated through `0113`. Any later schema
promotion remains a separate, explicitly authorized operation under the canonical
governance policy.
