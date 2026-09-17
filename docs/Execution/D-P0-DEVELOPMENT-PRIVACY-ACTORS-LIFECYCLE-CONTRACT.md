# D-P0 — Development Privacy, Actors and Lifecycle Contract

**Status:** Accepted. **Baseline:** `60e7931443bea1553714ba06928b7f1a1283fb7b`.
**Scope:** first Development MVP journey; product, privacy, actor/capability and
lifecycle contract. This record authorizes design of D-DB1, not implementation,
database changes, a browser harness or a hosted run.

## 1. Decision and normative context

A Development Plan (PDI) is private participant data between its subject and its
operational owner, under administrative governance. It is not company-wide
employee information. The first MVP journey starts with explicit authorized
assignment from a published template and ends with a terminal historical plan
after execution and a final review.

This contract specializes, without replacing:

- [PD-018](../Product/PRODUCT_DECISIONS.md), for global concepts and tenant
  mappings;
- [ADR-0002](../adr/0002-development-domain.md) and
  [ADR-0003](../adr/0003-development-templates.md), for the Development domain;
- [ADR-0012](../adr/0012-tenant-owned-referential-integrity-strategy.md), for
  tenant-owned integrity;
- [ADR-0013](../adr/0013-platform-global-authority-and-trusted-execution.md), for
  human authority versus technical execution;
- [ADR-0014](../adr/0014-deterministic-development-template-application-and-snapshots.md),
  for versioned deterministic template application.

The current tenant-wide read behavior is historical implementation, not the
approved privacy model. It is classified `PRIVACY_DECISION_REQUIRED`, not an
already-proven security-contract failure. D-DB1 must replace it before the
Development journey can be considered implementation-ready.

## 2. Actors and identities

| Concept | Persisted identity | Meaning |
| --- | --- | --- |
| Subject employee | `development_plans.employee_id` | person developing and executing the plan |
| Operational owner | `development_plans.owner_id` | active same-tenant person responsible for follow-up; user-facing label: **responsável pelo PDI** |
| Author | `development_plans.created_by` | authenticated historical author; never a substitute for ownership |
| Administrative actor | active company membership role `owner`, `admin` or `hr` | tenant-wide administrative governance |
| Ordinary nonparticipant | active member with none of the approved relationships | no protected PDI content |
| Foreign actor | actor without an authorized membership in the plan tenant | no read or mutation |

The company `owner` role and the PDI `owner_id` are different concepts and must
not share an ambiguous user-facing label.

An authorized operational relationship exists when the current actor person is
the plan's active `owner_id`, or is the subject's current manager. Administrative
membership is a separate authority. Every relationship is revalidated by the
trusted boundary; UI filtering and caller-provided company, role or person IDs
are not authority.

## 3. Privacy and ownership contract

- A subject reads only their own plans, goals, actions, reviews and derived
  progress.
- An operational owner or current manager reads and manages only plans covered
  by an authorized relationship.
- Active `owner`/`admin`/`hr` memberships may read and administer Development
  tenant-wide for legitimate operation.
- An ordinary same-company nonparticipant receives no participant content.
- A foreign tenant receives no content and cannot mutate any entity.
- Inaccessible, foreign and nonexistent selectors are externally
  indistinguishable wherever distinguishing them would disclose protected
  existence.
- Lists are scoped projections of the same rules, not tenant-wide data later
  filtered in the browser.

For manager-created plans, `owner_id` defaults to the manager. An administrative
creator may select any active same-tenant person as operational owner. A current
manager is preferred when one exists, but is not mandatory for administrative
assignment. The subject cannot create a formal self-owned PDI in this MVP.

## 4. Normative capability matrix

`ALLOW` is always conditional on active authentication, same tenant, the
relationship described above and operation-specific invariants. A person who
holds multiple roles receives the union of their approved capabilities.

| Capability | Subject | Operational owner / manager | Company owner | Admin | HR | Same-tenant nonparticipant | Foreign tenant |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| list | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY |
| read | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY |
| create | DENY | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY |
| assign | DENY | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY |
| edit structure | DENY | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY |
| start action | ALLOW | DENY | DENY | DENY | DENY | DENY | DENY |
| complete action | ALLOW | DENY | DENY | DENY | DENY | DENY | DENY |
| skip action | DENY | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY |
| read progress | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY |
| record review | DENY | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY |
| read review | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY |
| complete plan | DENY | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY |
| cancel plan | DENY | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY |
| reopen plan | NOT_IN_MVP | NOT_IN_MVP | NOT_IN_MVP | NOT_IN_MVP | NOT_IN_MVP | NOT_IN_MVP | NOT_IN_MVP |
| author template | DENY | DENY | ALLOW | ALLOW | ALLOW | DENY | DENY |
| publish template | DENY | DENY | ALLOW | ALLOW | ALLOW | DENY | DENY |
| obsolete template | DENY | DENY | ALLOW | ALLOW | ALLOW | DENY | DENY |
| apply template | DENY | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY |

For `create`, `assign` and `apply template`, manager authority is limited to a
current direct report; being owner of another existing PDI does not authorize
creation of a new plan for that subject. Subject action execution applies only to
an action in their own active plan. Administrative actors do not impersonate the
subject to start or complete work; they use the explicit skip or plan-management
operations instead.

## 5. Structural editing

An authorized operational owner/manager or administrative actor may edit the
structure of a `draft` or `active` plan. Editable structure is limited to the
fields and child structure deliberately exposed by a purpose-bound mutation.
The subject may not mutate subject, owner, template lineage, goals, actions,
target levels, plan state or completion rules.

Template application lineage and snapshots are immutable. Editing an applied
plan never rewrites the source version or snapshot. Completed and cancelled
plans are read-only historical records.

## 6. State and transition contract

### 6.1 Plan

| From | To | Actor | Preconditions | Server-derived fields | Audit | Terminal | Reversible |
| --- | --- | --- | --- | --- | --- | :---: | :---: |
| none | draft | manager or administrative actor | authorized subject and owner; eligible published version when template-backed | company, author, timestamps, lineage | private create event | no | no |
| draft | active | operational owner/manager or administrative actor | structure valid; at least one action; owner and subject eligible | activation timestamp/event metadata | private activation event | no | no |
| active | completed | operational owner/manager or administrative actor | every action terminal; at least one action completed; final review recorded after the last action transition | `completed_at` | private completion event | yes | no |
| active | cancelled | operational owner/manager or administrative actor | mandatory bounded reason | cancellation timestamp and actor | private cancellation event including reason | yes | no |

`completed → active` and `cancelled → active` are removed from the MVP contract.
Reopen is `NOT_IN_MVP`; a future explicit, audited capability requires a new
decision. Zero-action plans cannot be activated or completed.

### 6.2 Action

| From | To | Actor | Preconditions | Server-derived fields | Audit | Terminal | Reversible |
| --- | --- | --- | --- | --- | --- | :---: | :---: |
| pending | in_progress | subject | own active plan | transition timestamp | private action event | no | no |
| pending | completed | subject | own active plan | `completed_at` and transition timestamp | private action event | yes | no |
| in_progress | completed | subject | own active plan | `completed_at` and transition timestamp | private action event | yes | no |
| pending | skipped | operational owner/manager or administrative actor | authorized active plan; mandatory bounded reason | transition timestamp | private action event including reason | yes | no |
| in_progress | skipped | operational owner/manager or administrative actor | authorized active plan; mandatory bounded reason | transition timestamp | private action event including reason | yes | no |

The reason may live in the private mutation audit rather than the operational
action row. It must not be copied to a company-wide timeline. Employee self-skip
and all action reopen transitions are excluded from the first MVP.

### 6.3 Goal

Goal status is derived from its actions and is not a user mutation:

- zero actions: `not_started`;
- all actions are `pending`: `not_started`;
- the set is not terminal and any action is `in_progress`, `completed` or
  `skipped`: `in_progress`;
- a nonempty set in which every action is `completed` or `skipped`: `completed`.

The terminal label means the goal has no remaining executable action; completed
and skipped counts remain separately visible so it does not claim that skipped
work succeeded. The trusted action transition updates or validates the persisted
goal status atomically. There is no independent goal-status command.

### 6.4 Template version

| From | To | Actor | Preconditions | Server-derived fields | Audit | Terminal | Reversible |
| --- | --- | --- | --- | --- | --- | :---: | :---: |
| none | draft | owner/admin/hr | company authority and valid template identity | company, author, version identity | private authoring event | no | no |
| draft | draft | owner/admin/hr | unpublished version; valid content | update timestamp | private edit event | no | yes |
| draft | published | owner/admin/hr | complete valid immutable content and references | publisher and `published_at` | private publish event | no | no |
| published | obsolete | owner/admin/hr | same tenant; historical applications preserved | obsoleting actor and time | private obsolete event | yes for new use | no |

Published content is immutable. A change creates a new draft version. Legacy
`development_templates.active` remains compatibility state pending later
retirement and is not publication authority.

### 6.5 Development review

| From | To | Actor | Preconditions | Server-derived fields | Audit | Terminal | Reversible |
| --- | --- | --- | --- | --- | --- | :---: | :---: |
| none | periodic record | operational owner/manager or administrative actor | authorized active plan; bounded summary and next step | company, reviewer, `reviewed_at`, `created_at` | record event | yes/append-only | no |
| none | final record | operational owner/manager or administrative actor | authorized active plan; all actions terminal; at least one completed; review occurs after the latest action transition; bounded summary | company, reviewer, `reviewed_at`, `created_at` | final-review event | yes/append-only | no |

Reviews are append-only. They are not edited or deleted in the MVP. Multiple
chronological periodic reviews are supported; scheduling and cadence automation
are not.

## 7. Progress and completion

Plan progress is deterministic:

```text
terminal actions = completed actions + skipped actions
progress percent = floor(100 * terminal actions / total actions)
```

For zero actions, progress is `0%`; such a plan cannot activate or complete. UI
and read contracts expose total, completed and skipped counts alongside the
percentage. No subjective percentage input exists.

Plan completion requires all of the following in one trusted transaction:

1. plan is active and actor is authorized;
2. action set is nonempty and every action is terminal;
3. at least one action is completed, preventing an all-skipped plan from being
   reported as completed;
4. an append-only `final` Development review exists and was recorded after the
   latest action transition;
5. completion timestamp and private audit are persisted atomically.

The subject executes actions but cannot complete or cancel the formal PDI.

## 8. Development review model

D-DB1 may materialize one small Development-specific review aggregate with this
logical contract:

| Field | Contract |
| --- | --- |
| `id` | immutable identity |
| `company_id` | same tenant as plan; server-derived |
| `development_plan_id` | authorized active plan |
| `reviewer_id` | current actor person; server-derived |
| `type` | `periodic` or `final` |
| `reviewed_at` | server-derived transaction time |
| `summary` | required, bounded private narrative |
| `next_step` | required for periodic; optional for final; bounded private narrative |
| `created_at` | server-derived |

Subject/reviewee is derived through the immutable plan relationship; it is not
duplicated. The same entity represents periodic and final evidence. Employee
acknowledgement, coauthoring, notifications, scheduling, editing and deletion are
not in the first MVP.

This schema belongs inside D-DB1 because review persistence, privacy, plan
completion and transaction design form one coherent boundary; a separate
schema-design slice would leave the mutation contract incomplete.

## 9. Historical relationship rules

- Plans, reviews, lineage and authorship remain durable when reporting lines or
  employment states change.
- A manager change never rewrites `created_by` or historical reviews.
- Current-manager authorization follows the current canonical reporting line.
- A former manager loses manager-derived access immediately.
- A former manager who remains the active explicit `owner_id` retains access
  through that distinct ownership relationship.
- An inactive operational owner loses active owner capabilities and must be
  explicitly reassigned by an administrative actor before owner operations can
  continue.
- An inactive/terminated subject loses active employee capabilities; authorized
  administrative actors retain historical access.
- Owner reassignment is explicit, same-tenant, eligibility-checked and audited;
  it does not rewrite earlier audit evidence.

## 10. Template contract

Company template authoring, publication and obsolescence belong to
`owner/admin/hr`. Managers cannot author or publish company templates in the
first MVP, but may apply an eligible published version to a current direct
report. Employees cannot author, publish or apply formal templates.

Existing deterministic template application remains canonical: exact published
version, atomic plan/goal/action materialization, snapshot, lineage,
idempotency, audit and tenant validation. D-DB1 extends actor authorization to a
manager only after revalidating the direct-report relationship. It does not
weaken the existing administrative path or permit service role to represent
human authority.

Global template publication remains governed by platform-global authority under
ADR-0013/ADR-0014. Tenant roles consume eligible published global content but do
not gain global authoring authority.

## 11. Audit and timeline privacy

Every Development mutation has transactionally durable private operational
audit containing only what is necessary: operation/event type, actor, tenant,
entity IDs, timestamp, state transition, correlation/idempotency metadata where
applicable, and a bounded reason for skip/cancellation.

Review `summary`, `next_step`, plan/goal/action narrative and other participant
content never enter company-wide activity metadata. The first MVP does not emit
Development events to the company-wide timeline. A later privacy-reviewed
projection may expose lifecycle-safe events, but private audit is mandatory now.

## 12. Trusted mutation requirements

All operations derive the authenticated user and current actor person, derive or
resolve company from the selected aggregate, revalidate active membership and
relationship, use same-tenant selectors, fail closed, persist audit in the same
transaction and return a small stable result for canonical readback.

| Semantic operation | Authority and allowed input | Atomic/server-owned invariants | Idempotency and durable result |
| --- | --- | --- | --- |
| create/assign plan | manager: direct-report subject; admin actors: tenant subject; eligible owner/version, priority/dates | tenant, author, initial draft, ownership, child structure/snapshot where applied, audit | required for materialization; plan ID/state |
| update plan structure | authorized owner/manager/admin; bounded editable fields | draft/active only, same-tenant children, immutable lineage, audit | conflict/version guard; updated state |
| activate plan | authorized owner/manager/admin; plan selector | valid structure and nonempty actions, audit | retry-safe; active state |
| cancel plan | authorized owner/manager/admin; bounded reason | active only, terminal timestamp and audit | retry-safe; cancelled state |
| complete plan | authorized owner/manager/admin; plan selector | terminal actions, one completed action, qualifying final review, timestamp/audit | retry-safe; completed state |
| start action | subject; action selector | own active plan, pending only, goal recomputation, audit | retry-safe; action/goal/progress |
| complete action | subject; action selector | own active plan, pending/in-progress only, server `completed_at`, goal recomputation/audit | retry-safe; action/goal/progress |
| skip action | owner/manager/admin; action and bounded reason | active authorized plan, pending/in-progress only, goal recomputation/audit | retry-safe; action/goal/progress |
| record review | owner/manager/admin; plan, type, bounded summary/next step | active authorized plan; final prerequisites; reviewer/time and append-only audit | idempotency key required; review ID/type/time |
| reassign owner | admin actor; plan and eligible person | active same-tenant person, no history rewrite, audit | conflict/version guard; owner ID |
| create/edit template draft | owner/admin/hr; bounded content | tenant authority, draft only, version integrity/audit | conflict/version guard; version ID |
| publish template | owner/admin/hr; version selector | complete draft to immutable published version, actor/time/audit | retry-safe; published version ID |
| obsolete template | owner/admin/hr; version selector | published only, historical use preserved, actor/time/audit | retry-safe; obsolete state |
| apply published template | manager for direct report or admin actor | reuse ADR-0014 resolution and trusted persistence; add relationship revalidation | preserve existing idempotency; application/plan IDs |

Stable external error classes must distinguish validation/conflict where safe,
while inaccessible, foreign and nonexistent entity selectors share one
non-oracular unavailable result. Raw database errors and protected existence are
not returned.

## 13. Read boundary requirements

D-DB1 replaces tenant-wide active-member reads with purpose-scoped logical
projections. It may implement multiple RPCs rather than one giant function:

- subject plan list/detail with own goals, actions, progress and review history;
- operational-owner/manager authorized list/detail, using current-manager or
  active explicit-owner relationship;
- administrative tenant list/detail;
- privacy-aware review history;
- published template catalog visible to eligible consumers;
- administrative template authoring/version views.

Plan detail authorizes before returning child content. Lists return only rows the
actor can open. Review narrative follows the plan privacy contract. Direct table
reads remain closed. Foreign/nonparticipant/nonexistent detail selectors produce
the same empty/unavailable contract, and count/metadata fields cannot act as an
existence oracle.

## 14. Frozen first Development product journey

The first MVP product shape is:

1. `owner/admin/hr` authors and publishes a Development template;
2. a manager or administrative actor selects an eligible employee;
3. the actor applies the published version and assigns a responsible person;
4. plan, goals, actions, snapshot, lineage and audit persist atomically;
5. the employee reads their own PDI;
6. the responsible manager reads the authorized PDI;
7. same-company nonparticipants cannot read participant content;
8. foreign tenants cannot read or mutate it;
9. the employee starts and completes actions;
10. progress changes deterministically with durable readback;
11. the responsible manager observes progress;
12. the manager records an append-only periodic review;
13. the employee reads that review;
14. another review can be appended without overwriting history;
15. after all actions are terminal, at least one is completed, and a final review
    is recorded, an authorized manager/admin completes the PDI;
16. the completed PDI remains a terminal private historical record.

This freezes product shape, not Playwright properties or an E2E number. Hosted
Development contract remains `NOT_FROZEN`.

## 15. Explicitly deferred

- employee-created formal PDI;
- automatic competency-gap to PDI;
- assessment-result to PDI;
- Feedback to PDI/action;
- persisted AI-generated PDI;
- employee skip or self-reopen;
- plan/action reopen;
- employee review acknowledgement or coauthoring;
- review editing/deletion;
- automated cadence, scheduling or notifications;
- manager template authoring/publication;
- company-wide Development timeline events;
- detailed browser/hosted contract and E2E numbering.

Existing gap context and suggestions remain informational.

## 16. Logical acceptance examples

| Probe | Result |
| --- | --- |
| employee reads another employee's PDI | DENY |
| manager reads an unrelated employee's PDI | DENY unless also administrative actor |
| HR reads a tenant PDI | ALLOW |
| employee completes an action in own active PDI | ALLOW |
| employee completes the formal PDI | DENY |
| manager publishes a company template | DENY |
| manager applies a published template to current direct report | ALLOW |
| same-tenant nonparticipant reads a review | DENY |
| foreign tenant reads any protected PDI entity | DENY |
| any actor casually reopens completed/cancelled plan | NOT_IN_MVP |

## 17. Consequences and next gate

D-P0 removes the blocking product decisions. Development becomes
`READY_FOR_TRUSTED_BOUNDARY_IMPLEMENTATION`, not product-complete and not ready
for hosted proof.

The next coherent slice is **D-DB1 — Development Trusted Read/Mutation
Boundary**. It includes privacy-aware reads, review persistence, trusted
operational mutations, relationship validation, transition enforcement,
private audit, retention classification and database security tests. Review
schema is included because separating it would make plan completion and privacy
transactions incomplete.

No application UI, harness or hosted run begins until the required DB contracts
are implemented and locally validated.
