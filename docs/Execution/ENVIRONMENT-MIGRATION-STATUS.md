# Environment Migration Status

> Operational snapshot, not deployment authorization. Update only from verified
> read-only evidence or after an explicitly approved promotion.

| Environment | Project ref | Purpose | Latest migration | Last verified | Status | Notes |
| --- | --- | --- | ---: | --- | --- | --- |
| Local | `evol-os` | Disposable development and local review | `0118` | 2026-08-24 | ALIGNED WITH COMMITTED MAIN | Clean replay `0001 → 0118` plus the full official local gates passed: focused DB 386/386, full DB 61 files / 2092 tests / 0 failures, TypeScript, lint, projection 126/126 and production build. Committed and Local both end at 0118; lag is zero. |
| Review | `rwfvxvbzaosgcyfxdjpt` | Canonical shared remote validation | `0118` | 2026-08-25T13:50Z | ACTIVE / VALIDATED / PASS | **Evol Review**, Free plan, Americas (`us-west-2` physical region), confirmed `ACTIVE_HEALTHY` through `supabase projects list --output json`. Migration `0118_create_tenant_person_assessment_result_directory.sql`, SHA-256 `cfc4935ebd2185f002f2561678fa3a864948921ad67cc87889de7319ea2a8089`, applied by the operator-run promotion via `supabase migration up --linked --yes` between **2026-08-25T10:36:29Z and 10:36:37Z**; the following `db push --linked --dry-run` reported `Remote database is up to date`. Local, Committed and Review end at `0118`; lag zero, drift **ALIGNED**. Post-promotion validation is now complete: remote function/schema parity **PASS** (5 functions, byte-identical `prosrc` md5, SECURITY DEFINER, `search_path = public, pg_temp`, volatility), ACL/security readback **PASS** (private scorer helper closed to `PUBLIC`/`anon`/`authenticated`/`service_role`; Person directory `authenticated`-only), and the live transactional matrix **PASS** with **27 assertions and zero failures**, ending in `ROLLBACK` with no committed statement. The authenticated application smoke remains **NOT EXECUTED**. |
| Production | `gzrrwyiqfbnyprkdeqvm` | Production per documented historical preflight | UNKNOWN | 2026-08-09 | REVERIFY BEFORE USE | Historical evidence says structures from 0070/0071 were absent; current history is unknown. |
| Legacy | `oudngmrdtgengilpqqnz` | Former remote; forensic/reference only | `0075` (previously observed) | 2026-08-21 | LEGACY / NOT A PROMOTION TARGET | Not linked or mutated during the 0110/0111 Review promotion; historical grant drift still requires a separate audit. |

## Tracking rule

Track each environment's latest verified migration. Per-migration rows are not
needed because ordered history and checksums are checked from read-only evidence.
Record individual exceptions only for partial, blocked or deliberately delayed
promotion.

Canonical Review is provisioned and validated through `0118`. Any later schema
promotion remains a separate, explicitly authorized operation under the canonical
governance policy.

## Migration 0118 — applied and validated

`0118` introduces the trusted administrative Person Assessment Result directory:
purpose-bound `owner`/`admin`/`hr` access to one Person's official Results, with
`direct_report` intentionally excluded pending the B2-C anonymity policy. The
scoring projection was extracted into the shared private helper
`compute_assessment_scored_result_v1`, which remains the single scoring
authority and is closed to every application role; the existing public scorer
and the evaluatee wrapper delegate to it and keep their observable contracts.

### Verified against the deployed Review schema

Remote readback, from `supabase db dump --linked`: the five relevant functions
are byte-identical to a clean `0001 → 0118` replay (`prosrc` md5 and length),
with matching signatures, `SECURITY DEFINER`, volatility and
`search_path = public, pg_temp`. Across all 199 deployed functions exactly one
implements the normalization formula and exactly one emits
`formulaVersion = response-scale-weighted-v1`. No live-authoring fallback.

### Verified in execution, transactionally

Live matrix against Canonical Review, run inside `BEGIN … ROLLBACK` with
`ON_ERROR_STOP=1` — **27 assertions, zero failures, one `ROLLBACK`, no
`COMMIT`**:

- `owner`, `admin`, `hr` allowed; `manager` and `employee` denied;
- cross-tenant `owner`, `admin` and ordinary member denied;
- absent and inactive membership denied;
- `auth.uid()` NULL denied by the internal `AUTH_REQUIRED` guard;
- foreign and non-existent target Person denied with the identical message, so
  existence cannot be inferred;
- only `submitted`/`completed` returned; `draft`, `in_progress` and `cancelled`
  omitted with no count or marker;
- `direct_report` completely omitted;
- `visibility = none` discoverable administratively, while the evaluatee-facing
  `0117` directory still omits it;
- scale 0–10 answer 8 → 80; scale 2–5 answer 4 → 66.666667 and explicitly **not**
  80, rejecting a `score / scale_max * 100` implementation;
- qualitative-only Result keeps `overall_score` NULL, never zero;
- frozen snapshot Model name survives a live-authoring rename;
- exactly one audit Activity per authorized invocation regardless of row count,
  with no private payload in its metadata;
- the returned contract is the minimized 10-column shape, with no evaluator
  identity, Answers, Questions, comments or raw score.

### Still open

The **authenticated application smoke against Review is NOT EXECUTED**. No
governance claim is made about runtime behaviour of the application layer.

Two coverage notes recorded for honesty: the remote matrix carries no
`legacy_unknown` fixture — that perspective is covered by the repository pgTAP
suite against a local `0001 → 0118` database, and was not fabricated remotely;
and the residual-fixture count was measured locally (zero across eight tables)
rather than re-queried on Review, where the `ROLLBACK` makes residue structurally
impossible.
