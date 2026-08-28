# Environment Migration Status

> Operational snapshot, not deployment authorization. Update only from verified
> read-only evidence or after an explicitly approved promotion.

| Environment | Project ref | Purpose | Latest migration | Last verified | Status | Notes |
| --- | --- | --- | ---: | --- | --- | --- |
| Local | `evol-os` | Disposable development and local review | `0121` | 2026-08-28 | ALIGNED WITH COMMITTED MAIN | Committed `main`/HEAD `cb6c68d` ends at `0121`; the official local gate `supabase db reset && supabase test db` replayed `0001 → 0121` and passed the full pgTAP suite (**Files=64, Tests=2210, Result: PASS**). Committed and Local both end at `0121`; lag is zero. (The earlier `0118`/`0119` gates remain valid from the prior track.) |
| Review | `rwfvxvbzaosgcyfxdjpt` | Canonical shared remote validation | `0121` | 2026-08-28T21:00:14Z | ACTIVE / VALIDATED / PASS | **Slice 4A promoted:** migrations `0120` (commit `7481a42`, SHA-256 `5ab8802d624fcc08a1e1ab0ef94a35df5d52ecea7bfa420f5ed3b3637b6e5831`) and `0121` (commit `cb6c68d`, SHA-256 `b67e5f19a82d13555cacbea4b0007e3205f64137647d0a40888105be58cc6d64`) are applied and validated on **Evol Review** (`us-west-2`, `ACTIVE_HEALTHY`). Post-validation: `supabase_migrations.schema_migrations` shows `HISTORY_0119=1 / 0120=1 / 0121=1 / GT_0121=0`; the closed-table hardening is confirmed (`POST_CLIENT_EXPOSED_PRIV_COUNT=0` — `anon`/`authenticated` hold zero SELECT/INSERT/UPDATE/DELETE on all three Career/Seniority tables; `service_role` unchanged; RLS=1 and POLICIES=2 on each; EXECUTE preserved for `authenticated` on the four trusted RPC boundaries); `0120` data integrity intact (`SOURCE=TARGET=3`, active `2/2`, archived `1/1`, `PARITY_MISMATCH=0`, `BASE_MAPPING_VIOLATION=0`). Runner verdict `REVIEW_PROMOTION=PASS` / `SLICE_0121_REVIEW_VALIDATION=PASS`; evidence log `~/Desktop/evol-docs/postvalidate-0121-20260828T210014Z.log`. Detail per migration in the sections below. Prior row content (Slice 0115-B2-C `0119`): **Evol Review**, Americas (`us-west-2`), confirmed `ACTIVE_HEALTHY` via `supabase projects list --output json`. Migration `0119_create_tenant_person_direct_report_aggregate.sql`, SHA-256 `9f55cdcbe47bba48a78dbe5ace2caf93bb43b90fce94bb10bb74f466db622c16`, applied by the operator-run promotion via `supabase migration up --linked --yes` at **2026-08-27T11:46:45Z**; the following `db push --linked --dry-run` reported `Remote database is up to date`. Local, Committed and Review end at `0119`; lag zero, drift **ALIGNED**. Post-promotion validation complete (read-only + one transactional matrix): migration history **PASS** (`0119` present exactly once in `supabase_migrations.schema_migrations`); `pg_proc` existence/parity **PASS** (`public.get_tenant_person_direct_report_aggregate_v1(uuid,uuid)` found exactly once, args `p_company_id uuid, p_person_id uuid`, `RETURNS TABLE(cycle_id uuid, cycle_name text, model_name text, cycle_date date, aggregate_score numeric, is_qualitative boolean, suppressed boolean)`, byte-identical `prosrc` md5 `07312ce60208f7304a9bb1b8fb98b791`, 3534 bytes); ACL/security **PASS** (`SECURITY DEFINER`, `search_path = public, pg_temp`, EXECUTE granted to `authenticated` only, `anon`/`PUBLIC` revoked); live functional/threat-model matrix **PASS** inside `BEGIN … ROLLBACK` (states A/B/C/D, sub-threshold indistinguishability, `visibility = none` excluded, no cross-cycle accumulation, owner/admin/hr allow, manager/employee/cross-tenant deny, `AUTH_REQUIRED`, no-oracle, ≤1 audit per read), **zero `COMMIT`, zero persistence**. Scope: this row validates the **DB boundary** of Slice 0115-B2-C Phase 1. The application integration (Phases 2–5: read boundary `853dfb44`, presenter/ViewModel `de166e0`, People UX `ff2ba6db`) is now **CLOSED / PASS**, validated by static architecture + no-leak audits, 73 deterministic tests, `tsc`/`lint`/build (build PASS on Mac); its authorization/anonymity invariants were validated **live** by this Phase-1 transactional matrix. Residual debt (accepted): the remote authenticated end-to-end **app smoke is NOT DEMONSTRATED (gated)** — it would require a temporary Confirm-email toggle and persisted disposable fixtures in Review. (Migration `0118` and its own validation remain recorded in the section below.) |
| Production | `gzrrwyiqfbnyprkdeqvm` | Production per documented historical preflight | UNKNOWN | 2026-08-09 | REVERIFY BEFORE USE | Historical evidence says structures from 0070/0071 were absent; current history is unknown. |
| Legacy | `oudngmrdtgengilpqqnz` | Former remote; forensic/reference only | `0075` (previously observed) | 2026-08-21 | LEGACY / NOT A PROMOTION TARGET | Not linked or mutated during the 0110/0111 Review promotion; historical grant drift still requires a separate audit. |

## Tracking rule

Track each environment's latest verified migration. Per-migration rows are not
needed because ordered history and checksums are checked from read-only evidence.
Record individual exceptions only for partial, blocked or deliberately delayed
promotion.

Canonical Review is provisioned and validated through `0121`. Any later schema
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

## Migration 0120 — applied and validated

`0120` (Career / Seniority Slice 4A, commit `7481a42`, SHA-256
`5ab8802d624fcc08a1e1ab0ef94a35df5d52ecea7bfa420f5ed3b3637b6e5831`) creates the
profile-based competency matrix `position_seniority_competencies` and performs a
**zero-loss, fail-closed backfill** from `position_competencies` to the **base
profile** (`seniority_level_id NULL`, active), preserving `expected_level`,
`weight`, `required`, `type`, `notes`, `archived_at` and timestamps exactly (the
backfill `RAISE`s on any UNMAPPABLE / CONFLICT / COUNT_MISMATCH; no `ON CONFLICT DO
NOTHING`). The old source `position_competencies` is **not** physically removed
(compatibility period, plan §5/§15); **no dual-write** is introduced.

Verified against the deployed Review schema (read-only, inside `BEGIN … ROLLBACK`,
`ON_ERROR_STOP=1`, zero `COMMIT`): `supabase_migrations.schema_migrations` shows
`0120` exactly once; row counts `SOURCE = TARGET = 3`, `SOURCE_ACTIVE =
TARGET_ACTIVE = 2`, `SOURCE_ARCHIVED = TARGET_ARCHIVED = 1`; every source row maps
to exactly one base-profile matrix row (`PARITY_MISMATCH = 0`) and every matrix row
maps back to an active base profile (`BASE_MAPPING_VIOLATION = 0`).

## Migration 0121 — applied and validated

`0121` (Career / Seniority Slice 4A, commit `cb6c68d`, SHA-256
`b67e5f19a82d13555cacbea4b0007e3205f64137647d0a40888105be58cc6d64`) is a
**revoke-only** closed-table privilege hardening. Discovered during Review
validation of `0120`: the three CLOSED Career/Seniority tables
(`seniority_levels`, `position_seniority_profiles`,
`position_seniority_competencies`) carried **client table grants** inherited from
the Supabase environment's default privileges — a **CLOSED TABLE / defense-in-depth
contract violation** (RLS was already enabled), **not** a proven data breach. `0121`
revokes all privileges from `public`, `anon` and `authenticated` on the three
tables (precedent `0076`) and touches nothing else — no data, columns, constraints,
indexes, RLS, policies, functions, RPC EXECUTE grants, triggers or history, and no
`ALTER DEFAULT PRIVILEGES`; `service_role`/`postgres` are intentionally untouched.

Promotion: operator-run `supabase db push --linked` (single mutating command),
followed by `db push --linked --dry-run` reporting `Remote database is up to date`.

Verified against the deployed Review schema (read-only, inside `BEGIN … ROLLBACK`,
`ON_ERROR_STOP=1`, zero `COMMIT`): history `HISTORY_0119=1 / 0120=1 / 0121=1 /
GT_0121=0`; `POST_CLIENT_EXPOSED_PRIV_COUNT = 0` (`anon` and `authenticated` each
hold `SELECT/INSERT/UPDATE/DELETE = 0` on all three tables); `service_role`
privileges remained present and unchanged; RLS enabled (`=1`) with two policies
(`POLICIES=2`) on each table; and the four trusted boundaries
(`get_tenant_position_seniority_profiles_v1`, `create_tenant_seniority_level_v1`,
`create_tenant_position_with_seniorities_v1`,
`update_tenant_position_with_seniorities_v1`) still `EXECUTE` for `authenticated`;
`0120` data integrity re-checked identical to the section above.

Operational note (non-blocking): after applying `0121` the Supabase CLI emitted a
pg-delta catalog-cache warning because a `pgdelta` certificate file was
unavailable. This is **not** a migration failure — `0121` was applied, `db push`
completed, the subsequent dry-run reported `Remote database is up to date`,
`HISTORY_0121=1`, and independent post-validation passed every gate.

Scope: this validates the **DB privilege posture** of the three Career/Seniority
tables. **No authenticated application smoke against Review was executed**, and **no
Production validation was performed** — Production remains `UNKNOWN / REVERIFY
BEFORE USE`; Legacy remains `NOT A PROMOTION TARGET`.
