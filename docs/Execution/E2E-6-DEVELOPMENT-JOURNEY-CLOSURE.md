# E2E-6 — Development journey: hosted closure

> Closure record for the hosted Development end-to-end journey, against the
> frozen contract in
> [`D-E2E0-HOSTED-DEVELOPMENT-E2E-CONTRACT.md`](./D-E2E0-HOSTED-DEVELOPMENT-E2E-CONTRACT.md).
>
> This document records a result. It does not restate the contract, does not
> create product or architecture, and does not authorise re-running a closed
> slice.

| | |
| --- | --- |
| Canonical Review | `https://evol-os-review.vercel.app` |
| Supabase Review ref | `rwfvxvbzaosgcyfxdjpt` |
| Deployment / `main` SHA | `44b61e613c7e0ae4386670103bbea8fce627e425` |
| Final run | `260921200250-49c266` |
| Result | **13/13 PASS**, single attempt each — no retry and no isolated rerun |
| Frozen contract | **29/29 PROVEN** |
| Terminal state | **RETIRED / HEALTHY** |
| Production / Legacy | `NOT_ACCESSED` |

## 1. Purpose and scope

D-E2E0 froze *what* the Development journey must prove. This records that it was
proved, once, against canonical Review, on a named `main` SHA.

Freezing a contract is not a PASS. This document is the PASS.

The run exercised three specs: the Review target-identity gate (4), the
first-access onboarding journey that creates the foreign tenant (3), and the
Development journey itself (6). All thirteen are `expected` on a single attempt,
so no result is a retry outcome.

## 2. Frozen contract — 29/29

The spec's six blocks carry the contract's own step numbers, so a failure would
have named the clause it broke rather than a line of test code.

| Block | Steps | Substance | Result |
| --- | --- | --- | --- |
| A | 1–4 | `company_admin` creates a draft, adds the goal and both actions, publishes; the version becomes immutable and the container reads published | PASS |
| B | 5–10 | `manager` reaches the consumption surface independently, discovers the published template, selects the eligible direct report, readiness succeeds, application is confirmed, and the canonical PDI is reachable showing its historical origin | PASS |
| C | 11–14 | `employee` and `manager` read the PDI; `unrelated` and `foreign_owner` are denied | PASS |
| D | 15–17 | `employee` starts and completes an action with durable re-read, progress moves server-derived to 50% then 100%, `manager` skips the remainder with a mandatory bounded reason | PASS |
| E | 18–22 | periodic review by `company_admin`, history read by `employee`, second review appended by `manager` with the first unchanged, no edit or delete affordance, final review after the last action transition | PASS |
| F | 23–25 | prerequisites visible and server-derived; `company_admin` completes; canonical `completed` re-read | PASS |
| G | 26–29 | the completed plan stays readable to its participants, no reopen capability, terminal-invalid mutation controls absent, and both denied actors remain denied | PASS |

## 3. Negative contract (§6)

Every negative is an authorization outcome or an absent control — never an
inference from UI visibility.

| # | Property | How it was proved |
| ---: | --- | --- |
| 1 | `manager` gains no authoring capability | authoring and application run as different actors; the manager never touches the authoring surface |
| 2 | `unrelated` cannot read the PDI, its actions, reviews or origin | denied, and the refusal body carries none of the plan's strings |
| 3 | `foreign_owner` cannot cross the tenant boundary | denied as the **owner of a real second tenant**, created by the onboarding journey in the same run and asserted by its own company name at login |
| 4 | `employee` cannot record a review, skip, or complete | each control absent for that actor |
| 5 | `company_admin` cannot perform subject-only transitions | start/complete remain the subject's |
| 6 | a terminal plan cannot be reopened | no reopen control exists for any actor |
| 7 | review history is append-only | no edit or delete affordance; three reviews read back in order |

### Non-oracular denial

§6 requires unauthorized and nonexistent to be **indistinguishable**. That is a
relation between two observations, so each denied actor probed the real plan id
**and** a nonexistent one, through the browser, and the two outcomes were
compared on status, route and body — with the id masked out of the route so the
comparison could not succeed trivially. `404` is asserted on both sides, so
"equal" cannot be satisfied by both being something else.

The same comparison was re-run **after completion**, with the leak check widened
to the three review summaries and the private skip reason — the strings that only
exist by then, and exactly what a terminal state must not begin to disclose.

No negative was proved with a privileged read.

## 4. Mutation evidence

Every state change asserted a browser-visible outcome **and** an independent
re-read of canonical state through the service-role client, because a toast is a
claim and a row is a fact: template version `published`; the plan's
`employee_id`, `owner_id` and `status`; each action's `pending → in_progress →
completed` and `skipped`; three reviews in order with the last typed `final`;
and the plan's terminal `completed`.

Ownership deserves its own line: the owner control is derived and disabled for a
manager, so the spec proves the resolved owner rather than setting it, and then
re-proves it from `development_plans.owner_id`.

## 5. Application ledger

The four ledger relations closed by `0069` and `0134` were **never read
directly**. That the application happened is proved by the plan existing with its
historical origin, and by movement in the counts-only retention boundary
(`get_company_retention_pressure_v1`). A direct read here would have re-opened,
in test code, the surface D-SEC1 closed in the product.

## 6. Retention and teardown

The journey necessarily writes immutable retained evidence, so physical deletion
is correctly refused and the run's terminal state is **RETIRED**, not CLEANED —
`RETIRED` is a success state with its own postconditions, not partial cleanup.

The archived journal records the ownership graph the run retired: **7**
`auth.user`, **2** `company` (the tenant plus the foreign tenant), 5 `membership`
and 5 `person`. The journal moved to the run archive under `.retired` with no
live run record remaining, and by the harness's own rule a partial mutation is
never `RETIRED` — the journal is retained while retirement is incomplete, so its
archival is the no-partial-retirement evidence.

Retained evidence was asserted to have survived rather than assumed: application
snapshots and lineage counts both greater than zero, and three reviews still
readable, after the plan reached its terminal state.

## 7. What this closure does not claim

- Nothing about **Production** or **Legacy**; both were `NOT_ACCESSED`. Production's
  DB version remains `UNKNOWN / REVERIFY BEFORE USE`.
- Nothing about idempotency and replay, which D-E2E0 §7 deliberately excludes
  from the hosted journey and proves against a real server in the SQL suites.
- Nothing about `cancel_development_plan_v1`, which has no application caller and
  stays outside the frozen journey.
- The run's own artifacts live under `apps/web/e2e/.run/`, which is **not
  versioned**. They carry operational material, so this record cites them rather
  than importing them.

## 8. Method note

The journey reached PASS after nine corrective slices (D-E2E2A…D-E2E2J), every
one of them a **harness** defect and not one a product defect. Each was diagnosed
from preserved runtime evidence before any code changed, corrected at the
smallest scope that closed its class, and protected by a guard demonstrated red
before green. The recurring lesson is recorded in
[`../engineering/OPERATING-METHOD.md`](../engineering/OPERATING-METHOD.md): a
selector that exists is not a selector that is reachable, and a proof that cannot
fail is not a proof.
