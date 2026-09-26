# L-E2E0 — Hosted Leadership E2E Contract

**Status:** Frozen and **EXECUTED** — closed by run `260926114143-bf6bb4`, 8/8 PASS,
steps 1–12 PASS; see
[`L-E2E11-LEADERSHIP-JOURNEY-CLOSURE.md`](./L-E2E11-LEADERSHIP-JOURNEY-CLOSURE.md).
The run is terminal and must not be repeated. **Baseline (unchanged):**
`40a410d485b5fd1cd8a6105fe3a87fad716044d7`. **Target:** canonical Review only.

This contract operationalizes the accepted
[L-P1 Leadership MVP contract](./L-P1-LEADERSHIP-MVP-CONTRACT.md). It does not
change its product semantics and does not authorize a hosted execution.

## Governed invocation

The journey is `apps/web/e2e/specs/17-leadership-journey.spec.ts`, executed by
the existing Playwright Review harness, global identity preflight, run manifest,
journal and teardown. It is serial and must run once after exact deployment
identity is proven:

```bash
cd apps/web
npm run e2e:review -- --project=authenticated e2e/specs/17-leadership-journey.spec.ts
```

No other spec is a prerequisite. A failed run is terminal: preserve its archive,
classify the first failure and do not retry blindly.

## Frozen 12-step journey

1. The run-owned manager authenticates through the normal product boundary.
2. The manager enters **Liderança** through normal authenticated navigation.
3. The queue includes only current active/on-leave direct reports.
4. At least one item is backed by an exact canonical reason, priority and source.
5. The same-tenant unrelated person and run-owned foreign tenant owner are absent.
6. Each exercised item navigates to its exact owning Assessment, Feedback or PDI flow.
7. The assigned manager Assessment is completed through Assessment.
8. Formal assessment Feedback is created and canonically reread through Feedback.
9. Missing-PDI application reaches Development; the manager applies a published
   template, then reaches the exact PDI and records canonical progress/review.
10. The manager returns to Leadership through normal navigation.
11. A fresh server render rederives the queue from the durable owning-domain facts.
12. Runtime isolation and static lineage prove no broadened/direct People read,
    browser authorization, generic score, canned summary or fake recognition path.

The reason rows remain independent. The run asserts the exact Assessment response
ID, Feedback eligibility source and PDI/application destination; a generic employee
profile is never accepted as routing proof.

## Run-owned fixtures

The existing global fixture owns tenant A and the manager, current direct report,
same-tenant unrelated employee and administrative author. This spec additionally:

- provisions tenant B with `ensureRunOwnedForeignTenant`, before the journey;
- creates one active manager-perspective Assessment through authenticated trusted
  Assessment RPCs and obtains its canonical generated response ID;
- creates one published Development template through authenticated trusted
  Development authoring RPCs; competency facts are fixture-only and use the
  established Development fixture helper;
- creates no Leadership record, alert or write.

Fixture identifiers and names carry the run ID. Setup fails closed; it never turns
a failed source read into an empty queue. The hosted browser performs the journey
mutations through the product, and evidence reads may use the runner's established
canonical readback client.

## Evidence and isolation

The run persists `leadership-journey-evidence.json` atomically under
`.run/archive/<run-id>/`. It records deployment/run identity, actor and subject
IDs, exact source IDs/reasons/priorities/routes, pre/post queue rows, Assessment
completion, formal Feedback readback, PDI/action/review readback, tenant-isolation
probes and the 12 step verdicts. It excludes Assessment answers, Feedback message
content beyond the run-owned expected marker, Development review private text and
credentials.

Tenant isolation requires all of the following, independent of transport status:

- tenant A manager sees the current direct report and not the unrelated employee;
- tenant B owner and foreign subjects never appear in tenant A queue evidence;
- a tenant B authenticated call using tenant A as selector is denied/non-oracular;
- no target subject/source identity or mutation control is exposed by that denial.

## Teardown

The normal governed teardown owns tenant A, tenant B and every journalled identity.
It is safe after partial setup and records `RETIRED` when immutable/retained domain
evidence prevents physical deletion. Absence of physical deletion is not failure;
unowned fixtures, active credentials or skipped retirement are. The spec neither
deletes durable Assessment/Feedback/Development history nor introduces a second
cleanup mechanism.
