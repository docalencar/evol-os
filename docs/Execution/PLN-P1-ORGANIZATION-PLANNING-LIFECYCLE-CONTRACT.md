# PLN-P1 — Organization Planning Lifecycle Contract

**Status:** Accepted. **Baseline:** `b3d419bafe6c34ce70d352f34bebaf552aad4eed`.
**Scope:** MVP lifecycle, authorization, concurrency, durable readback and audit
contract for Organization Planning scenarios. This record authorizes later
implementation slices; it does not change the database or product.

## 1. Decision

The Organization Planning MVP uses an explicit, tenant-local lifecycle:

```text
draft -> submitted -> approved -> published
                   \-> rejected -> draft
```

`owner`, `admin` and `hr` may submit, approve, reject, return a rejected
scenario to draft, and publish. Self-approval is allowed. `manager` and
`employee` remain read-only. Planning does not integrate with the generic
Approval feature in this MVP and does not require author/approver segregation.

Publication remains a separate operation after approval. A published scenario
is terminal and immutable. UI capability presentation may hide unavailable
operations, but browser state and caller-supplied role or tenant identifiers are
never authorization.

This contract specializes the Planning foundation described by
[ADR-0007](../adr/0007-planning-snapshot-lineage.md),
[ADR-0008](../adr/0008-deterministic-planning-projection.md),
[ADR-0009](../adr/0009-planning-comparison-insights-ai-boundary.md), and the
[Organization Planning architecture](../Architecture/organization-planning.md).

## 2. Actor matrix

Every `ALLOW` is conditional on an authenticated active membership in the
scenario tenant and all transition-specific invariants.

| Capability | Owner | Admin | HR | Manager | Employee | Foreign actor |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| Read scenario and lifecycle history | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | DENY |
| Edit draft content | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY |
| Submit draft | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY |
| Approve submitted scenario | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY |
| Reject submitted scenario | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY |
| Return rejected scenario to draft | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY |
| Publish approved scenario | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY |

Holding more than one allowed role does not add a segregation constraint.
The submitting actor may also approve the same scenario.

## 3. Transition contract

| From | To | Preconditions | Durable effect | Reversible |
| --- | --- | --- | --- | :---: |
| `draft` | `submitted` | authorized actor; current expected version; scenario is valid for review | status and version advance; transition audit is appended | no direct reversal |
| `submitted` | `approved` | authorized actor; current expected version | status and version advance; transition audit is appended | no |
| `submitted` | `rejected` | authorized actor; current expected version; bounded nonblank reason | status and version advance; reason is retained in the private transition audit | yes, only to `draft` |
| `rejected` | `draft` | authorized actor; current expected version | status and version advance; revision transition audit is appended | no |
| `approved` | `published` | authorized actor; current expected version; deterministic publication validation passes | scenario becomes terminal and the canonical projection snapshot is created atomically | no |

No other lifecycle edge is part of the MVP. In particular:

- `draft` cannot be published;
- `submitted` cannot be edited, published or returned directly to draft;
- `approved` cannot be edited, rejected or returned to draft;
- `rejected` cannot be published or edited until explicitly returned to draft;
- `published` cannot be edited, deleted, archived or transitioned;
- archive/restore compatibility behavior is not a substitute for rejection and
  revision, and must not create an alternate approval path.

Returning a rejected scenario to draft preserves identity, branch lineage,
baseline and prior audit. Subsequent draft edits use the existing editing rules
and create newer versions; rejection never discards or rewrites historical
facts.

The rejection reason is required, trimmed, private to authorized tenant actors,
and bounded to 500 characters. It belongs to durable audit evidence rather than
the mutable scenario row.

## 4. Durable facts and canonical readback

Each successful transition durably commits, in one transaction:

- scenario identity, tenant and lineage unchanged;
- previous and resulting status;
- incremented positive scenario version;
- server-derived transition time;
- server-derived authenticated actor identity;
- an append-only transition audit fact;
- the bounded rejection reason when applicable.

The trusted boundary returns canonical state read after the write, including at
least scenario ID, status, version and `updated_at`. Application actions must use
that durable result and re-read/revalidate affected canonical views; they must
not predict a successful status or version in the browser.

Publication additionally preserves the existing atomic contract: validation of
the approved scenario and expected version, canonical change-set fingerprint,
scenario transition to `published`, immutable projection snapshot creation and
publication readback either all commit or all roll back.

## 5. Authorization contract

- Authorization is enforced at the server and trusted PostgreSQL boundary.
- Tenant and actor are derived from the authenticated session and active
  membership, not accepted as authority from form data.
- Only active same-tenant `owner`, `admin` or `hr` membership authorizes a
  lifecycle mutation.
- `manager`, `employee`, anon, inactive members and foreign actors cannot mutate
  lifecycle state.
- Missing, foreign and unauthorized scenario selectors use non-oracular denial
  behavior where distinguishing them would expose tenant data.
- Existing direct table ACL closure remains intact. Implementation must not add
  table grants to make lifecycle transitions work.
- Existing RLS remains defense in depth. Purpose-bound trusted functions are the
  mutation boundary.
- Generic Approval requests, policies, stages and assignments are explicitly
  outside this MVP contract.

## 6. Audit contract

Lifecycle evidence is append-only and durable. Each transition records:

- stable event identity and idempotency identity;
- tenant and scenario identity;
- actor identity and membership role at decision time;
- previous status, resulting status and resulting scenario version;
- server-derived occurrence time;
- rejection reason only for rejection.

Audit persistence and the scenario transition are atomic. A committed scenario
transition without its audit fact, or an audit fact without its transition, is
invalid. Retrying the same idempotent command must not create duplicate audit or
advance the version twice. Audit records are readable only under the Planning
tenant authorization contract and are not rewritten when membership changes.

The existing `PlanningDomainEventCollector` is an in-memory collector and is not
durable audit evidence. A later implementation may reuse the canonical Activity
infrastructure or introduce a Planning-specific append-only store, but it must
not integrate Planning with the generic Approval lifecycle merely to satisfy
audit persistence.

## 7. Concurrency contract

Every mutation command carries the scenario's `expected_version`. The trusted
database boundary locks or conditionally updates the selected same-tenant row,
verifies the exact source state and exact expected version, increments version
once, and returns the committed row.

Stale, duplicated, illegal-state, unauthorized or foreign commands fail without
changing scenario state, audit history, change sets or snapshots. Concurrent
approve/reject attempts from the same submitted version yield at most one
successful transition. Publication retains its existing change-set fingerprint
check and all-or-nothing snapshot behavior.

## 8. Reconciliation with the current repository

Already aligned:

- scenario statuses include `draft`, `submitted`, `approved`, `rejected` and
  `published`;
- domain transitions include submit, approve, reject and approved-only publish;
- application validation, UI copy and PostgreSQL publication require
  `approved`;
- publish permission belongs to `owner`, `admin` and `hr`, while manager and
  employee are read-only;
- publication already accepts `expected_version`, validates the canonical
  change-set fingerprint and creates its snapshot atomically;
- published scenario and snapshot immutability are enforced in PostgreSQL.

Implementation gaps:

1. Add `rejected -> draft` to the domain; do not reuse archive restoration.
2. Add purpose-bound trusted PostgreSQL transition mutation(s) with server
   identity, role checks, expected-version enforcement, idempotency and atomic
   audit persistence.
3. Add application commands/handlers, repositories and server actions for
   submit, approve, reject and revise-to-draft, always returning durable state.
4. Add capability-aware UI controls and rejection-reason input without treating
   UI filtering as authorization.
5. Render canonical status/version and authorized lifecycle history after every
   mutation.
6. Add real-PostgreSQL tests for the actor matrix, tenant isolation, every legal
   and illegal edge, stale concurrency, idempotency, audit atomicity and terminal
   immutability; add focused application/component tests for wiring and
   capability presentation.
7. Reconcile the active archive/restore surface so it cannot bypass this frozen
   lifecycle; preserve compatibility only where it does not advertise an
   alternate approval transition.

## 9. Minimum implementation slices

1. **PLN-DB1 — trusted lifecycle and audit boundary.** Implement and prove the
   authorized, durable, concurrent PostgreSQL transitions and canonical
   readback without widening table ACLs.
2. **PLN-P2 — application and UI lifecycle cutover.** Wire the trusted boundary
   through commands, repositories, actions and capability-aware controls;
   reconcile archive/restore compatibility; prove durable readback.
3. **PLN-P3 — focused lifecycle closure.** Recheck the frozen matrix and only
   then decide readiness for a hosted Planning journey contract.

These slices do not reopen projection, publication determinism, snapshot
lineage, the generic Approval feature or actor segregation.
