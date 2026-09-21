# D-E2E0 — Hosted Development E2E: frozen contract

> **Specification, not a run.** This document freezes what the hosted Development
> journey must prove before any browser test is written or executed. No Review
> access, no fixture creation and no hosted run occurred in the slice that
> authored it.
>
> Method: [`../engineering/OPERATING-METHOD.md`](../engineering/OPERATING-METHOD.md).
> Product contract:
> [`D-P0-DEVELOPMENT-PRIVACY-ACTORS-LIFECYCLE-CONTRACT.md`](./D-P0-DEVELOPMENT-PRIVACY-ACTORS-LIFECYCLE-CONTRACT.md).
> Terminal states: [`E2E-RUN-TERMINAL-STATES.md`](./E2E-RUN-TERMINAL-STATES.md).

## 0. Readiness basis

Frozen against canonical `main` as verified from Git, not from a summary. Of the
eighteen D-P0 journey capabilities probed in the application source, **seventeen
are present**: template draft/goal/action authoring, publish, obsolete, manager
application with readiness and confirmation, action start/complete/skip, review
recording and reading, plan activate and complete, historical plan origin, and a
server-derived capabilities service.

`cancel_development_plan_v1` has **no application caller**. Cancellation is
therefore outside this contract; it is not a journey step and its absence does not
block the freeze. Recorded so a future slice does not mistake it for a regression.

## 1. Environment contract

| | |
| --- | --- |
| Canonical target | Review — `https://evol-os-review.vercel.app` |
| Supabase project ref | `rwfvxvbzaosgcyfxdjpt` |
| Production | `gzrrwyiqfbnyprkdeqvm` — **never accessed or mutated** |
| Legacy | `oudngmrdtgengilpqqnz` — **not a promotion or E2E target** |

Before the first fixture write, the future runner reuses the established
identity gate (`e2e/specs/00-target-identity.spec.ts`,
`e2e/helpers/target-identity.ts`) and must prove: the base URL resolves to the
Review deployment; the deployment's Supabase ref is `rwfvxvbzaosgcyfxdjpt`; and the
canonical application SHA under test is the one expected by hosted methodology.

**Fail closed.** If identity cannot be positively proven the run aborts before any
mutation and reports `ENVIRONMENTAL`. Inferring the target from a project name, a
local link or a previously cached value is prohibited.

## 2. Actor model

Five deterministic, run-scoped actors. This is the minimum that proves the
contract: the authoring and application capabilities must sit on *different*
actors, or the "manager gains no authoring capability" assertion is unprovable.

| Actor | Role | Relationship | Exercises | Must be denied |
| --- | --- | --- | --- | --- |
| `company_admin` | owner/admin/hr | tenant administrator | template authoring, publish, record reviews, complete plan | subject-only action start/complete |
| `manager` | manager | manager of `employee` | template application to a direct report, skip action with reason, record review | template authoring and publish surfaces |
| `employee` | employee | subject of the plan, direct report of `manager` | read own PDI, start action, complete action, read review history | record review, skip, complete plan, authoring |
| `unrelated` | employee | same company, no relationship to the plan | nothing | read the PDI, its actions, its reviews, its origin |
| `foreign_owner` | owner | **separate tenant** | own tenant only | any read or mutation across the boundary |

Capability is never inferred from UI visibility. Every positive is confirmed by
durable readback (§5); every negative is confirmed by an authorization outcome —
`notFound`, zero rows, or a refusal — and not merely by an absent button.

## 3. Fixture model

Run-scoped and unique, built with the established harness
(`e2e/helpers/run-context.ts`, `e2e/fixtures/tenant-fixture.ts`,
`e2e/fixtures/synthetic-identity.ts`). Every identity carries the run id so the
run can distinguish its own state from pre-existing Review data. No long-lived
manually created Review records are used.

Required graph:

- one **tenant** plus one **foreign tenant** for the isolation assertions;
- memberships for the five actors, all `active`;
- `people` rows with `employee.manager_id = manager`;
- one **competency** in the tenant with an `expected_level`, and an
  `employee_competencies` row giving the subject a **current level below target** —
  the deterministic resolver validates competency name, expected level and the
  subject's current level at application time, so this is not optional;
- one **template**, one **published immutable version**, one **goal**, and
  **exactly two actions**.

Two actions is the minimum that proves the whole execution contract without an
artificial branch: the subject completes one (progress becomes 50%), management
skips the other with a bounded reason (progress becomes 100%), and completion
becomes legitimately available. A single action cannot prove skip; three add
nothing.

## 4. Journey contract

Numbered, ordered, all mandatory.

**A — Template authoring** (`company_admin`)
1. reach `/app/development/templates`; create a draft.
2. add the goal to the draft version.
3. add both actions to the version goal.
4. publish; the version becomes immutable and the container appears published.

**B — Manager application** (`manager`)
5. reach `/app/development` independently of the authoring surface.
6. discover the published template as consumable.
7. select the eligible current direct report.
8. readiness check succeeds.
9. confirm application.
10. the canonical resulting PDI is reachable at `/app/development/plans/[id]` and
    shows the historical template origin.

**C — Privacy** (§6 carries the full negative contract)
11. `employee` reads own PDI.
12. `manager` reads the PDI they are responsible for.
13. `unrelated` is denied.
14. `foreign_owner` is denied.

**D — Action execution**
15. `employee` starts an eligible action; durable state re-read.
16. `employee` completes that action; canonical progress moves to 50% from
    server-derived state, never recomputed in the browser.
17. `manager` skips the remaining action with a mandatory bounded reason;
    progress moves to 100%.

**E — Reviews**
18. `company_admin` records a `periodic` review.
19. `employee` reads the review history.
20. `manager` appends a second review; the first remains present and unchanged.
21. no edit or delete affordance exists for any review.
22. a `final` review is recorded after the last action transition.

**F — Completion**
23. completion prerequisites are visible and server-derived.
24. `company_admin` completes the plan.
25. the canonical `completed` state is re-read.

**G — Terminal history**
26. the completed plan remains readable to `employee`, `manager` and
    `company_admin`.
27. no reopen capability exists anywhere.
28. mutation controls invalid for a terminal plan are absent.
29. `unrelated` and `foreign_owner` remain denied after completion.

## 5. Browser assertions vs durable readback

Every mutation asserts **both**. A toast, a redirect or an optimistic row is never
sufficient — the run must re-read canonical state from the server.

Durable readback uses the service-role admin client
(`e2e/helpers/admin-client.ts`) against relations it is still permitted to read
after `0134`:

| Fact | Durable source |
| --- | --- |
| plan existence, status, template origin, canonical progress | `development_plans` |
| goals | `development_goals` |
| action status transitions and skip reason | `development_actions` |
| review append-only history | `development_reviews` |
| privileged operation trail | `development_private_audit` |
| that a template application happened | `get_company_retention_pressure_v1` — **counts only** |

**The application ledger is never read directly.** `0069` revoked it from
`service_role` and `0134` revoked it from `authenticated`; it is internal evidence
reached only through purpose-bound boundaries. The run proves the application
occurred by the plan's existence with its origin plus the retention counts, and by
nothing else. Any future temptation to add a direct ledger read is a contract
violation, not a convenience.

## 6. Authorization and privacy negative contract

Mandatory, each with a durable or authorization-level confirmation:

1. `manager` reaches no template authoring or publish capability — application
   authority does not imply authoring authority.
2. `unrelated` cannot read the PDI, its actions, its reviews or its origin.
3. `foreign_owner` cannot read or mutate anything across the tenant boundary.
4. `employee` cannot record a review, skip an action, or complete the plan.
5. `company_admin` cannot perform the subject-only start/complete transitions.
6. a terminal plan cannot be reopened by any actor.
7. review history is append-only: no actor can edit or delete a recorded review.

Where the product contract is **non-oracular**, the assertion must be too:
unauthorized and nonexistent must be indistinguishable — identical `notFound`, or
zero rows. A test that distinguishes them has proved the wrong thing.

## 7. Idempotency and replay

Template application carries real idempotency semantics — an idempotency key, an
intent fingerprint, attempt rows and `idempotent_retry` handling in
`complete_development_template_application_v1`.

**It is deliberately not exercised in the hosted journey.** Those paths are proved
exhaustively by `supabase/tests/deterministic_template_application_infrastructure.test.sql`
and `development_template_trusted_persistence.test.sql` against a real server,
where fingerprint conflicts and attempt sequencing can be driven precisely. A
browser cannot reproduce them deterministically, and duplicating DB coverage in a
hosted run buys confidence that already exists while adding flakiness.

The hosted run proves the **single-application happy path only**. No replay, no
double-submit, no concurrent application.

## 8. Evidence contract

Following the existing E2E evidence conventions (`e2e/helpers/journal.ts`,
`e2e/helpers/run-context.ts`, `e2e/inspect-run.ts`). Minimum durable record:

run id · canonical `main` SHA under test · proven target identity (base URL and
Supabase ref) · fixture identities (tenant, company, people, template, version,
plan, action ids) · actor identities in **non-secret** form (run-scoped emails and
roles, never passwords or tokens) · outcome of each of the 29 numbered steps ·
browser assertion outcomes · durable readback outcomes · cleanup result ·
retained-evidence result · overall PASS/FAIL · failure classification when not
PASS.

**Never persisted:** passwords, service-role keys, access tokens, cookies, storage
state, or any raw credential. Evidence lives under the run directory and is
archived per existing convention; the closure document is committed, the raw run
artifacts are not.

## 9. Cleanup and retention

Classification happens **before the first mutation**, per
`E2E-RUN-TERMINAL-STATES.md` §2, using `e2e/lifecycle/retention-registry.ts`.

| Class | Data |
| --- | --- |
| **EPHEMERAL** — removed on success | synthetic users, memberships, people, competency and employee-competency rows, template container/version/goal/actions, plan, goals, actions |
| **RETAINED_EVIDENCE** — survives by design | `development_reviews` and `development_private_audit` (`intra-tenant-restrict-fk`); the four application-ledger relations (`immutable-trigger`: applications, attempts, snapshots, lineage) |
| **SHARED/CANONICAL** — never touched | every pre-existing Review tenant, user and record outside this run |

**The expected terminal state is `RETIRED`, not `CLEANED`.** The journey
necessarily writes immutable retained evidence — at minimum reviews, the private
audit trail and the full application ledger — and immutability triggers forbid
deletion. A runner that classifies this journey as `CLEANED` and then sends a
delete that must fail is the defect
`E2E-RUN-TERMINAL-STATES.md` §5 exists to prevent.

The run proves, in order: every EPHEMERAL relation is empty for the run scope;
every RETAINED_EVIDENCE relation still holds its rows, counted through
`get_company_retention_pressure_v1` for the ledger and read directly for reviews
and private audit; the tenant exists and is inactive with capability neutralised;
and no row outside the run scope changed. A retirement that stops partway is
reported `QUARANTINED`, never `RETIRED`.

Retention semantics are never weakened to make cleanup succeed. If the tooling
cannot satisfy them, the run stops and the gap is classified `HARNESS_DEFECT` or
`PRODUCT_GAP`.

## 10. Failure classification

Bound to `OPERATING-METHOD.md` §5. A failed browser step is **never** classified
`REGRESSION` without evidence that the product behaviour actually changed.

`REGRESSION` · `PRE_EXISTING` · `STALE_TEST` · `ENVIRONMENTAL` (target, network,
deployment, third-party) · `HARNESS_DEFECT` (selector, fixture, timing, the runner
measuring the wrong thing) · `DOWNSTREAM_CASCADE` · `PRODUCT_GAP` ·
`SECURITY_CONTRACT_FAILURE` (any §6 negative that passes when it must fail — the
most serious outcome available to this run) · `CONTRACT_CONFLICT` ·
`DB_CONTRACT_DEFICIENCY` · `UNKNOWN_REMOTE_OUTCOME`.

No blind retries. A step that failed once is diagnosed before it is run again.

## 11. Acceptance contract

`HOSTED_DEVELOPMENT_E2E = PASS` requires **all** of:

- target identity proven and the expected application SHA verified deployed;
- deterministic setup completed for all five actors and the full fixture graph;
- all 29 mandatory journey steps PASS;
- all 7 mandatory privacy/authorization negatives PASS;
- every durable readback PASS;
- terminal-history assertions PASS;
- cleanup PASS with terminal state `RETIRED` and its postconditions verified;
- retained evidence intact and shared Review data untouched;
- no unexplained partial state;
- no unresolved failure classification.

**No partial-green PASS.** One red assertion fails the run. A step that could not
execute is not a pass, and an `UNKNOWN` outcome is not a pass.

## 12. Open decisions

| Decision | Note |
| --- | --- |
| Gate number and spec filename | Gates `E2E-0 … E2E-5` are closed and specs run `00 … 14`, so this is `E2E-6` / `15-development-journey.spec.ts`. Prior state documents recorded that the journey "does not automatically receive the name E2E-6" — the Product Architect confirms or reassigns. |
| Foreign-tenant depth | The harness already proves cross-tenant isolation (specs 04, 07, 10, 13). This contract asserts denial at the Development surfaces; whether the run provisions a full second tenant or reuses the established isolation fixture is an implementation choice that must not weaken assertion 3. |
| Review count | Three reviews (two periodic, one final) is the minimum proving append-only plus the final-review requirement. If D-P0 requires a specific count before completion, that governs. |

## 13. Out of scope

Plan cancellation (no application caller). Template application replay and
idempotency (DB-tested). Obsolete-template lifecycle in the hosted run. Production
and Legacy. Any product change. Any migration. Any weakening of privacy or
retention.
