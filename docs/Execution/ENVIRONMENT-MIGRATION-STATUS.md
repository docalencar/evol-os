# Environment Migration Status

> Operational snapshot, not deployment authorization. Update only from verified
> read-only evidence or after an explicitly approved promotion.

| Environment | Project ref | Purpose | Latest migration | Last verified | Status | Notes |
| --- | --- | --- | ---: | --- | --- | --- |
| Local | `evol-os` | Disposable development and local review | `0119` | 2026-08-27 | ALIGNED WITH COMMITTED MAIN | Committed `main`/HEAD `865badd2` ends at `0119`; the official local gate `supabase db reset && supabase test db` replayed `0001 → 0119` and passed the full pgTAP suite (**Files=62, Tests=2142, Result: PASS**, `tenant_person_direct_report_aggregate.test.sql … ok`). Committed and Local both end at `0119`; lag is zero. (The `0118` gates — focused DB 386/386, full DB, TypeScript, lint, projection 126/126, production build — remain valid from the prior track.) |
| Review | `rwfvxvbzaosgcyfxdjpt` | Canonical shared remote validation | `0119` | 2026-08-27T12:22:59Z | ACTIVE / VALIDATED / PASS | **Evol Review**, Americas (`us-west-2`), confirmed `ACTIVE_HEALTHY` via `supabase projects list --output json`. Migration `0119_create_tenant_person_direct_report_aggregate.sql`, SHA-256 `9f55cdcbe47bba48a78dbe5ace2caf93bb43b90fce94bb10bb74f466db622c16`, applied by the operator-run promotion via `supabase migration up --linked --yes` at **2026-08-27T11:46:45Z**; the following `db push --linked --dry-run` reported `Remote database is up to date`. Local, Committed and Review end at `0119`; lag zero, drift **ALIGNED**. Post-promotion validation complete (read-only + one transactional matrix): migration history **PASS** (`0119` present exactly once in `supabase_migrations.schema_migrations`); `pg_proc` existence/parity **PASS** (`public.get_tenant_person_direct_report_aggregate_v1(uuid,uuid)` found exactly once, args `p_company_id uuid, p_person_id uuid`, `RETURNS TABLE(cycle_id uuid, cycle_name text, model_name text, cycle_date date, aggregate_score numeric, is_qualitative boolean, suppressed boolean)`, byte-identical `prosrc` md5 `07312ce60208f7304a9bb1b8fb98b791`, 3534 bytes); ACL/security **PASS** (`SECURITY DEFINER`, `search_path = public, pg_temp`, EXECUTE granted to `authenticated` only, `anon`/`PUBLIC` revoked); live functional/threat-model matrix **PASS** inside `BEGIN … ROLLBACK` (states A/B/C/D, sub-threshold indistinguishability, `visibility = none` excluded, no cross-cycle accumulation, owner/admin/hr allow, manager/employee/cross-tenant deny, `AUTH_REQUIRED`, no-oracle, ≤1 audit per read), **zero `COMMIT`, zero persistence**. Scope: this row validates the **DB boundary** of Slice 0115-B2-C Phase 1. The application integration (Phases 2–5: read boundary `853dfb44`, presenter/ViewModel `de166e0`, People UX `ff2ba6db`) is now **CLOSED / PASS**, validated by static architecture + no-leak audits, 73 deterministic tests, `tsc`/`lint`/build (build PASS on Mac); its authorization/anonymity invariants were validated **live** by this Phase-1 transactional matrix. Residual debt (accepted): the remote authenticated end-to-end **app smoke is NOT DEMONSTRATED (gated)** — it would require a temporary Confirm-email toggle and persisted disposable fixtures in Review. (Migration `0118` and its own validation remain recorded in the section below.) |
| Production | `gzrrwyiqfbnyprkdeqvm` | Production per documented historical preflight | UNKNOWN | 2026-08-09 | REVERIFY BEFORE USE | Historical evidence says structures from 0070/0071 were absent; current history is unknown. |
| Legacy | `oudngmrdtgengilpqqnz` | Former remote; forensic/reference only | `0075` (previously observed) | 2026-08-21 | LEGACY / NOT A PROMOTION TARGET | Not linked or mutated during the 0110/0111 Review promotion; historical grant drift still requires a separate audit. |

## Tracking rule

Track each environment's latest verified migration. Per-migration rows are not
needed because ordered history and checksums are checked from read-only evidence.
Record individual exceptions only for partial, blocked or deliberately delayed
promotion.

Canonical Review is provisioned and validated through `0119`. Any later schema
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

## Migration 0119 — applied and validated

`0119` (Slice 0115-B2-C Phase 1, commit `865badd2`) adds the trusted
**direct-report anonymous aggregate boundary**
`get_tenant_person_direct_report_aggregate_v1(uuid, uuid)`. It exposes the
`direct_report` (upward) perspective only in aggregate, per PD-022 / ADR-0018:
threshold `k = 4` per `(company, Person, Cycle)`; four public states — suppressed
(`eligible < 4`), quantitative (`eligible ≥ 4 ∧ scored ≥ 4`), qualitative
(`eligible ≥ 4 ∧ scored = 0`), and suppressed again for a sub-threshold
quantitative subset (`eligible ≥ 4 ∧ scored ∈ {1,2,3}`), the last **publicly
indistinguishable** from the first; no cross-cycle accumulation; `visibility =
none` excluded; scoring reuses the canonical `compute_assessment_scored_result_v1`;
the public contract carries **no** cardinality (`respondent_count`/`scored_count`),
evaluator identity, response id or raw score.

Promotion: operator-run `supabase migration up --linked --yes` at
**2026-08-27T11:46:45Z**; SHA-256
`9f55cdcbe47bba48a78dbe5ace2caf93bb43b90fce94bb10bb74f466db622c16`; the following
`db push --linked --dry-run` reported `Remote database is up to date`.

Verified against the deployed Review schema (read-only, authoritative):
`supabase_migrations.schema_migrations` shows `0119` exactly once; `pg_proc`
discovery finds the function exactly once with args `p_company_id uuid,
p_person_id uuid`, `RETURNS TABLE(cycle_id uuid, cycle_name text, model_name text,
cycle_date date, aggregate_score numeric, is_qualitative boolean, suppressed
boolean)`, `SECURITY DEFINER`, `search_path = public, pg_temp`, byte-identical
`prosrc` md5 `07312ce60208f7304a9bb1b8fb98b791` (3534 bytes), EXECUTE granted to
`authenticated` only (`anon`/`PUBLIC` revoked).

Verified in execution, transactionally: live matrix against Canonical Review
inside `BEGIN … ROLLBACK` with `ON_ERROR_STOP=1`, **zero `COMMIT`, zero
persistence** — the four k=4 states, sub-threshold indistinguishability, real
mean aggregation, `visibility = none` non-participation, no cross-cycle
accumulation, `owner`/`admin`/`hr` allowed, `manager`/`employee`/cross-tenant
denied, `AUTH_REQUIRED` on null auth, foreign vs non-existent Person denied with
the identical message (no existence oracle), and exactly one audit Activity per
authorized read.

Scope: this is the **DB boundary** of B2-C Phase 1. The application/read-model,
presenter and People/Assessments UI integration are a later phase and are **NOT**
validated here.
