# L-P1 — Leadership MVP Contract

**Status:** Accepted. **Baseline:** `71c0df749d92ad64a34349774a41b6dae3d3bd7e`.
**Scope:** minimum Jornada 5 product, actor, attention, privacy and hosted-proof
contract. This record authorizes later design and implementation slices; it does
not change the database, application, browser harness or any hosted environment.

## 1. Decision and normative context

The Leadership MVP helps an authenticated manager act on current direct-report
needs by composing facts from the already-approved Assessment, formal
assessment-originated Feedback and Development contracts.

For this MVP:

- **alerts are a deterministic live-derived attention queue**, not durable
  Leadership records;
- **team means current direct reports only**; company role `manager`, team or
  department membership, and historical reporting relationships do not expand
  that scope;
- **feedback means the closed formal assessment-originated Feedback journey**;
  recognition, standalone feedforward, check-ins and one-on-ones remain outside
  the Leadership contract;
- Leadership introduces no write model. Every mutation continues through its
  owning domain's trusted boundary.

This contract specializes Jornada 5 in
[USER_JOURNEYS.md](../Product/USER_JOURNEYS.md) and preserves the closed
Assessment, Feedback and Development contracts. It does not reinterpret an
adjacent type, route or prototype as a supported Leadership capability.

## 2. Actors and subject eligibility

| Concept | Canonical identity | Eligibility |
| --- | --- | --- |
| Leadership actor | authenticated user mapped server-side to an active person in the selected active tenant membership | may use Leadership only for people who currently report directly to that person |
| Direct-report subject | active or on-leave same-tenant person whose current `manager_id` is the actor person ID | included while that current relationship remains true |
| Same-tenant unrelated person | person whose current `manager_id` is not the actor person ID | excluded, even when the actor has role `manager` |
| Foreign person | person outside the actor's authorized tenant | excluded without revealing existence |

The actor's Auth identity, active membership, tenant and person identity are
resolved and validated on the server/trusted boundary. Client-supplied actor,
role, manager or subject IDs are selectors at most and never authority. A
`manager` membership role without the current `people.manager_id` relationship
grants no subject access.

Relationship changes take effect on the next canonical read. A former direct
report disappears; a new current direct report becomes eligible. Leadership
does not preserve historical manager access.

## 3. Alert model

The queue is a read projection evaluated from canonical state at request time.
It has no Leadership alert ID, acknowledgement, snooze, dismissal, assignment,
resolution, audit stream or persistence lifecycle.

Each attention item identifies:

- the eligible subject and one enumerated reason;
- a categorical priority derived by the rule in this contract;
- the canonical source domain and source identity needed for navigation;
- the source status/version or update timestamp exposed by that domain;
- a factual explanation assembled from those fields.

It does not contain a generic health, intelligence or decision score. It does
not contain a canned summary or priority. Ordering is deterministic by priority
(`high`, then `medium`, then `low`), source due date with nulls last, reason key,
subject name and stable subject ID.

## 4. Canonical attention inputs and derivation

Only the following MVP reasons may be emitted. All facts must come from the
canonical trusted read contract of the owning domain after actor and subject
authorization.

| Reason | Required canonical facts | Priority rule | Destination |
| --- | --- | --- | --- |
| `assigned_assessment_overdue` | an open manager-perspective response assigned to the actor for the subject, in an active cycle whose canonical end date is before the server date | `high` | that exact Assessment response |
| `assigned_assessment_pending` | the same assigned open response, not overdue | `medium` | that exact Assessment response |
| `formal_feedback_pending` | an eligible submitted/completed manager-perspective response evaluated by the actor, with no formal assessment Feedback yet | `medium` | the finalized Assessment response and its formal Feedback initiation surface |
| `development_follow_up_overdue` | an authorized active subject PDI with a nonterminal action or plan due date before the server date | `high` | that exact PDI |
| `development_follow_up_due` | the same canonical due date from the server date through the next 30 calendar days | `medium` | that exact PDI |
| `development_plan_missing` | the complete authorized Development read proves the subject has no `draft` or `active` PDI | `low` | Development's existing template-consumption/application flow with that direct report selected only after canonical eligibility revalidation |

An open Assessment response is one the closed Assessment execution contract
allows the assigned evaluator to continue. A nonterminal Development action is
one the closed Development contract has not placed in `completed` or `skipped`.
The server date, not the browser clock, determines overdue and 30-day windows.

Multiple independently true reasons may produce separate items for one subject;
they are not collapsed behind a synthetic score. Within the same source
identity and reason, the projection emits one item.

Competency gaps may be rendered inside an already-authorized domain destination,
but do not independently create an MVP Leadership attention item: no canonical
Leadership severity threshold or manager-purpose competency attention contract
is currently frozen.

### Absence and uncertainty

- No source fact means no corresponding item. Missing data is never converted
  into a risk, score, recognition or positive conclusion.
- Failure or denial from a source boundary does not mean zero records. The
  Leadership read fails safely rather than presenting a false empty state.
- `development_plan_missing` is emitted only after an authoritative complete
  read for that eligible subject, not after an error or partial response.
- If no reason is true for any eligible subject, the product presents a factual
  empty state such as "Nenhuma pendência derivada dos dados disponíveis". It
  must not claim that the team is healthy, stable or fully developed.
- A reason ceases to appear only when a fresh canonical read no longer satisfies
  its rule. The browser does not predict removal after a mutation.

## 5. Action routing and canonical readback

Every item routes to the exact existing domain object or purpose-specific flow
that generated it. A generic employee profile is not the primary action for an
Assessment, Feedback or Development reason.

Leadership never performs the domain mutation itself:

1. the manager follows the item into Assessment, Feedback or Development;
2. the owning domain reauthorizes the actor and performs any mutation through
   its trusted boundary;
3. the owning domain returns and rereads canonical durable state under its
   existing contract;
4. on return to Leadership, the entire live projection is read again;
5. changed, removed or remaining items are explained only by the new canonical
   facts.

No optimistic queue mutation, client-predicted progress or client-retained
priority is canonical readback.

## 6. Minimum purpose-bound read boundary

L-P2 requires one authenticated-only, purpose-bound Leadership read capability
that returns the current actor's eligible direct reports and the minimum facts
needed to construct the reason rows in section 4. It may be one composed RPC or
an equivalently atomic server composition of purpose-bound trusted reads, but it
must have one externally testable contract.

The boundary must:

- derive `auth.uid()`, active tenant membership and actor person identity on the
  server;
- treat a selected company, if required by multi-tenant context, only as a
  selector validated against the active membership;
- derive subjects with current same-tenant `people.manager_id = actor_person_id`;
- reapply the owning Assessment, Feedback and Development authorization and
  lifecycle predicates rather than bypassing them;
- return only minimal subject presentation fields, reason/source identities,
  canonical statuses, due dates and source version/update timestamps required by
  sections 3–4;
- exclude Assessment answers/scores, Feedback message content and Development
  review text from the queue projection;
- use non-oracular behavior for inaccessible, foreign and nonexistent source
  selectors;
- be deterministic for a fixed canonical database state and server date;
- fail closed on incomplete source reads;
- grant execution only to `authenticated`; `PUBLIC` and `anon` receive no
  execution;
- preserve RLS and all existing direct-table ACL closures.

The application may present and sort the returned factual reason rows, but may
not broaden subjects, invent facts, override priority or infer authorization.
Direct client or server-repository SELECT from `public.people` for this journey
is prohibited. Review ACL drift does not legalize such a dependency.

## 7. Privacy and isolation contract

- A manager sees Leadership rows only for current direct reports.
- A same-tenant unrelated employee is absent from lists, counts, empty-state
  explanations and source-derived items.
- A foreign tenant's people and domain resources are absent and non-oracular.
- Manager role, team leadership, department leadership and company membership
  alone do not grant subject access.
- Browser filtering is presentation only and cannot be the isolation boundary.
- Domain destinations independently reauthorize every read and mutation; a
  Leadership item is not an access token.
- Formal Feedback remains participant-private under PD-020. Leadership may
  expose only the factual eligible/existing state required for routing, never
  message content or universal administrative visibility.
- Development participant, owner, current-manager and administrative rules
  remain authoritative within Development and are not widened by Leadership.
- Assessment evaluator/subject privacy and result visibility remain
  authoritative within Assessment.

## 8. Feedback and Development specialization

### Feedback

The MVP supports exactly one formal Feedback conversation originating from an
eligible finalized manager-perspective Assessment response, as frozen by
PD-020 and the closed Assessment Feedback journey. Leadership may direct its
manager-evaluator to initiate or open that conversation. Recognition,
standalone feedforward, check-in and one-on-one behavior is not implied by
labels or historical enum values.

### Development

Leadership reuses the closed Development contract. A current manager may reach
the existing published-template application flow for an eligible direct report,
read/manage an authorized PDI and append a periodic review. Canonical
server-derived progress, action state, review history and terminal semantics
remain unchanged. Leadership creates no alternative PDI progress formula or
review record.

## 9. Minimum hosted Leadership journey

A single governed Review execution must prove:

1. a run-scoped current manager authenticates;
2. the manager enters Leadership through normal product navigation;
3. only current direct reports appear;
4. at least one attention item is backed by canonical state and exactly matches
   a section 4 rule;
5. an unrelated same-tenant person and a foreign-tenant person are absent;
6. the item routes to the correct existing domain workflow;
7. the manager completes an assigned manager Assessment;
8. the manager creates formal assessment-originated Feedback and canonically
   rereads it;
9. the manager reaches/manages the direct report's PDI and records canonical
   progress or a periodic review;
10. the manager returns to Leadership;
11. the rederived queue/insight state reflects the durable domain changes
    without an optimistic local prediction;
12. isolation and the absence of direct-table or broadened access are proven.

The harness must provision its own tenant, manager, current direct report,
same-tenant unrelated person and foreign tenant/person. It must prove source
facts and durable readback rather than seed a Leadership result.

## 10. Success evidence

Leadership is hosted-proven only when one execution establishes:

- normal-navigation reachability and authenticated manager identity;
- current-direct-report inclusion and both same-tenant and foreign exclusion;
- exact source fact, reason, priority and domain destination for every asserted
  attention item;
- durable Assessment completion, formal Feedback creation/readback and
  Development progress/review under their existing contracts;
- rederived post-action state from canonical reads;
- no Leadership-specific write, generic score, direct `public.people` access,
  legacy/broadened RPC or browser-only authorization;
- healthy run-scoped teardown without deleting retained domain evidence that
  existing contracts require to remain immutable.

## 11. Out of scope

- durable Leadership alerts and acknowledge/snooze/dismiss/resolve behavior;
- indirect reports, department-wide scope, team-lead inference or organizational
  roll-ups;
- generic health, intelligence or decision scores;
- standalone recognition, feedforward, check-ins or one-on-ones;
- new Assessment, Feedback, Development or Competency lifecycle semantics;
- a competency-gap attention rule without a separately frozen severity contract;
- Leadership-specific mutations or audit entities;
- generic Approval integration;
- global Review ACL-drift correction;
- implementation, migration, product UI, fixtures or hosted E2E in L-P1.

## 12. Implementation boundary and conflicts

The current `/app/manager` prototype is not an implementation of this contract:
it reads company-wide People through a direct table repository, supplies no real
Assessment/Feedback/Development inputs, assigns canned priority/summary values
and routes to a generic person profile. L-P2 must replace that active dependency,
not preserve it as compatibility behavior.

No unresolved product contradiction prevents this contract. The implementation
must still determine, without widening scope, whether the smallest secure read
is a single composed PostgreSQL function or a server composition over new or
existing purpose-bound functions. That is an engineering design decision whose
result must satisfy section 6 and be proven against real PostgreSQL before the
product cutover.

## 13. Minimum implementation slices

1. **L-DB1 — trusted Leadership attention read boundary.** Implement and prove
   actor/tenant derivation, current-direct-report scope, factual reason rows,
   source authorization, ACL posture and isolation without direct table grants.
2. **L-P2 — Leadership product cutover.** Make the surface navigable, consume
   only the trusted read contract, present deterministic reasons and route to the
   existing domain workflows with canonical reread.
3. **L-E2E0 — hosted Leadership contract freeze.** Translate section 9 into the
   governed run-owned actor/fixture and evidence contract only after L-DB1 and
   L-P2 are published and promoted where required.
