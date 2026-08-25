# Environment Migration Status

> Operational snapshot, not deployment authorization. Update only from verified
> read-only evidence or after an explicitly approved promotion.

| Environment | Project ref | Purpose | Latest migration | Last verified | Status | Notes |
| --- | --- | --- | ---: | --- | --- | --- |
| Local | `evol-os` | Disposable development and local review | `0118` | 2026-08-24 | ALIGNED WITH COMMITTED MAIN | Clean replay `0001 → 0118` plus the full official local gates passed: focused DB 386/386, full DB 61 files / 2092 tests / 0 failures, TypeScript, lint, projection 126/126 and production build. Committed and Local both end at 0118; lag is zero. |
| Review | `rwfvxvbzaosgcyfxdjpt` | Canonical shared remote validation | `0118` | 2026-08-25T10:36:37Z | ACTIVE / APPLIED / POST-PROMOTION VALIDATION PENDING | **Evol Review**, Free plan, Americas (`us-west-2` physical region), confirmed `ACTIVE_HEALTHY` through `supabase projects list --output json`. Migration `0118_create_tenant_person_assessment_result_directory.sql`, SHA-256 `cfc4935ebd2185f002f2561678fa3a864948921ad67cc87889de7319ea2a8089`, was applied by the operator-run promotion via `supabase migration up --linked --yes` between **2026-08-25T10:36:29Z and 10:36:37Z**; the immediately following `supabase db push --linked --dry-run` reported `Remote database is up to date`. Version-level state is therefore Local `0118`, Committed `0118`, Review `0118`, lag zero, drift **ALIGNED**. **Schema-content validation is not yet done:** the post-promotion readback of the deployed function bodies and ACLs, the transactional authorization/audit matrix and the authenticated application smoke are all **NOT EXECUTED** and remain open — see the note below. |
| Production | `gzrrwyiqfbnyprkdeqvm` | Production per documented historical preflight | UNKNOWN | 2026-08-09 | REVERIFY BEFORE USE | Historical evidence says structures from 0070/0071 were absent; current history is unknown. |
| Legacy | `oudngmrdtgengilpqqnz` | Former remote; forensic/reference only | `0075` (previously observed) | 2026-08-21 | LEGACY / NOT A PROMOTION TARGET | Not linked or mutated during the 0110/0111 Review promotion; historical grant drift still requires a separate audit. |

## Tracking rule

Track each environment's latest verified migration. Per-migration rows are not
needed because ordered history and checksums are checked from read-only evidence.
Record individual exceptions only for partial, blocked or deliberately delayed
promotion.

Canonical Review is provisioned through `0118` and validated through `0117`. Any
later schema promotion remains a separate, explicitly authorized operation under
the canonical governance policy.

## Migration 0118 — applied, validation still open

`0118` introduces the trusted administrative Person Assessment Result directory:
purpose-bound `owner`/`admin`/`hr` access to one Person's official Results, with
`direct_report` intentionally excluded pending the B2-C anonymity policy. The
scoring projection was extracted into the shared private helper
`compute_assessment_scored_result_v1`, which remains the single scoring
authority and is closed to every application role; the existing public scorer
and the evaluatee wrapper delegate to it and keep their observable contracts.

These properties are proven **locally**, against a clean `0001 → 0118` replay:
single formula implementation, single `formulaVersion` emitter, exactly one
audit call per directory invocation, no evaluator identity in the directory
body, snapshot Model authority, and no live-authoring fallback.

The equivalent checks against the **deployed** Review schema are **NOT EXECUTED**:

- deployed function-body and ACL readback;
- transactional authorization / tenant-isolation / audit-cardinality matrix;
- authenticated application smoke.

Until those run, `0118` on Review is recorded as **applied**, not as validated.
No governance claim of remote functional or security verification is made here.
