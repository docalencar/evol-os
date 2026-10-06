# T-P1 — Minimum Turnover Contract

Status: **FROZEN / PRODUCT-APPROVED**
Baseline: `d9a830456499f4acccd3d5b503c0a1c8ec376c89`

## Purpose

Turnover is a factual, company-level indicator for the authorized Executive
audience. It must not infer missing employment history, invent separation causes,
or expose person-level facts.

## Actors and scope

- Only authenticated active `owner`, `admin`, and `hr` members may read Turnover.
- Actor and tenant identity are derived from the server session.
- `manager` and `employee` are denied; membership or browser filtering grants no
  authority.
- The MVP returns only a company-total aggregate. Department, team, manager,
  position, person, and other cohort breakdowns are out of scope.
- Same-tenant unauthorized and foreign-tenant access fail closed and disclose no
  Turnover facts.

## Metric contract

For each supported calendar month:

```text
turnover_percent =
  canonical_terminations / ((headcount_at_start + headcount_at_end) / 2) * 100
```

- The numerator counts only canonical transitions from a non-terminal status to
  `terminated` within the period.
- `inactive` is neither headcount nor a termination.
- Headcount includes `active` and `on_leave`; it excludes `inactive` and
  `terminated`.
- If average headcount is zero, or any required fact is unavailable or
  incomplete, the metric is `unavailable`, never zero or estimated.
- The MVP exposes the current calendar month and the immediately preceding
  calendar month, using half-open intervals `[start, next_start)`.
- Period boundaries use UTC. This is an explicit temporary MVP limitation until
  a canonical company timezone exists.

## Historical completeness

Only factually reliable history may contribute. Any period before trustworthy
coverage is `unavailable`; the MVP performs no backfill, interpolation, inference,
or reconstruction from mutable current-state timestamps.

Rehire and repeated employment are outside the MVP until a canonical employment
episode model exists. Name, email, user identity, or another heuristic must not
reconcile separate records or infer an employment episode.

## Privacy and presentation

- Output is purpose-bound and aggregate-only; no person identity, event payload,
  separation reason, or other PII is returned.
- No small-cohort suppression threshold applies to this company-total aggregate,
  because it is restricted to `owner`, `admin`, and `hr`.
- The MVP reports total Turnover only. It must not label a termination voluntary
  or involuntary when that fact does not exist canonically.
- Source failure and incomplete history remain explicit `unavailable` states and
  must not become empty success, zero, or a healthy interpretation.

## T-DB1 boundary discovery

T-DB1 must discover and design the smallest durable, purpose-bound structure that
can prove the numerator and both headcount boundaries for exactly the two MVP
periods. It must preserve closed direct-table ACLs, tenant isolation, server-side
authorization, and aggregate-only output.

This contract does **not** predetermine a broad historical model, a new employment
episode model, or a specific RPC/schema shape. T-DB1 must first determine whether
existing immutable facts provide complete coverage and add only the minimum
durable structure that the frozen metric requires.

## Out of scope

- breakdowns or person-level drill-down;
- voluntary/involuntary classification;
- rehire or repeated-employment semantics;
- historical backfill or inferred history;
- configurable windows or company-local timezone;
- predictive attrition, flight risk, scores, benchmarks, targets, or alerts;
- product, database, RPC, migration, hosted E2E, Review, Production, or Legacy
  changes in T-P1.
