# Environment Migration Status

> Operational snapshot, not deployment authorization. Update only from verified
> read-only evidence or after an explicitly approved promotion.

| Environment | Project ref | Purpose | Latest migration | Last verified | Status | Notes |
| --- | --- | --- | ---: | --- | --- | --- |
| Local | `evol-os` | Disposable development and local review | `0117` | 2026-08-24 | ALIGNED WITH COMMITTED MAIN | Clean replay and the full local DB/application gates passed through 0117. Committed and Local both end at 0117; lag is zero. |
| Review | `rwfvxvbzaosgcyfxdjpt` | Canonical shared remote validation | `0117` | 2026-08-24T18:58:55Z | ACTIVE / ALIGNED / REVIEW APPLIED | **Evol Review**, Free plan, Americas (`us-west-2` physical region). Migration 0117 adds the purpose-bound current-evaluatee Assessment Result directory. Remote transactional assertions verified same-tenant Self, Manager, normalized and NULL-score discovery; cross-tenant and anonymous denial; complete `visibility=none` metadata omission; terminal-status filtering; snapshot Model authority; and deliberate `direct_report` exclusion pending the B2-C anonymity policy. Local, Committed and Review end at 0117; lag is zero and drift is **ALIGNED**. The hosted CLI still cannot resolve the protected pgTAP schema, so equivalent assertions ran transactionally through the Management API and rolled back without retained product fixtures or out-of-band grants. |
| Production | `gzrrwyiqfbnyprkdeqvm` | Production per documented historical preflight | UNKNOWN | 2026-08-09 | REVERIFY BEFORE USE | Historical evidence says structures from 0070/0071 were absent; current history is unknown. |
| Legacy | `oudngmrdtgengilpqqnz` | Former remote; forensic/reference only | `0075` (previously observed) | 2026-08-21 | LEGACY / NOT A PROMOTION TARGET | Not linked or mutated during the 0110/0111 Review promotion; historical grant drift still requires a separate audit. |

## Tracking rule

Track each environment's latest verified migration. Per-migration rows are not
needed because ordered history and checksums are checked from read-only evidence.
Record individual exceptions only for partial, blocked or deliberately delayed
promotion.

Canonical Review is provisioned and validated through `0117`. Any later schema
promotion remains a separate, explicitly authorized operation under the canonical
governance policy.
