# Environment Migration Status

> Operational snapshot, not deployment authorization. Update only from verified
> read-only evidence or after an explicitly approved promotion.

| Environment | Project ref | Purpose | Latest migration | Last verified | Status | Notes |
| --- | --- | --- | ---: | --- | --- | --- |
| Local | `evol-os` | Disposable development and local review | `0116` | 2026-08-24 | ALIGNED WITH COMMITTED MAIN | Clean replay and the full local DB/application gates passed through 0116. Committed and Local both end at 0116; lag is zero. |
| Review | `rwfvxvbzaosgcyfxdjpt` | Canonical shared remote validation | `0116` | 2026-08-24T15:52:14Z | ACTIVE / ALIGNED / REVIEW APPLIED | **Evol Review**, Free plan, Americas (`us-west-2` physical region). Migration 0115 was applied but entered **SECURITY HOLD** after discovery of a cross-tenant NULL fail-open in the scored-result trusted read. Forward-only migration 0116 closed that authorization path. The mandatory remote exploit reproduction now returns denial for cross-tenant owner/admin/member and no-membership actors; same-tenant authorization, visibility, scoring, snapshot authority, grants and authenticated runtime smokes passed. Review is considered safe and aligned only at 0116. Local, Committed and Review end at 0116; lag is zero and drift is **ALIGNED**. Hosted CLI pgTAP remains unable to resolve the protected `extensions` schema, so the equivalent remote assertions ran transactionally through the Management API and rolled back without retained fixture data or out-of-band grants. |
| Production | `gzrrwyiqfbnyprkdeqvm` | Production per documented historical preflight | UNKNOWN | 2026-08-09 | REVERIFY BEFORE USE | Historical evidence says structures from 0070/0071 were absent; current history is unknown. |
| Legacy | `oudngmrdtgengilpqqnz` | Former remote; forensic/reference only | `0075` (previously observed) | 2026-08-21 | LEGACY / NOT A PROMOTION TARGET | Not linked or mutated during the 0110/0111 Review promotion; historical grant drift still requires a separate audit. |

## Tracking rule

Track each environment's latest verified migration. Per-migration rows are not
needed because ordered history and checksums are checked from read-only evidence.
Record individual exceptions only for partial, blocked or deliberately delayed
promotion.

Canonical Review is provisioned and validated through `0116`. Any later schema
promotion remains a separate, explicitly authorized operation under the canonical
governance policy.
