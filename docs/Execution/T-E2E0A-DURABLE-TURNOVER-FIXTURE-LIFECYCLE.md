# T-E2E0A — Durable Turnover Fixture Lifecycle

Status: **FROZEN FOR IMPLEMENTATION / NOT BOOTSTRAPPED**
Owner: `T-E2E0A`
Target: canonical Review `rwfvxvbzaosgcyfxdjpt` only

## Purpose

One synthetic, isolated tenant may be retained across temporal boundaries so the
unchanged `0142` boundary can acquire factual coverage naturally. This is an
operational evidence fixture, never product data. This contract authorizes
versioned tooling only; it does not authorize credentials, remote bootstrap,
hosted Playwright, or any Review mutation.

## Invariants

- Exactly one journal and one company carry the marker
  `evol-turnover-durable-fixture-v1` and owner slice `T-E2E0A`.
- The target ref is exactly `rwfvxvbzaosgcyfxdjpt`; Production
  `gzrrwyiqfbnyprkdeqvm` and Legacy `oudngmrdtgengilpqqnz` are refused.
- All users, people and the company are synthetic and recorded by full UUID
  before any later mutation may target them. Passwords and keys never enter the
  journal or evidence.
- Existing tenants are never adopted. A remote company may be bound only during
  the initial bootstrap operation, while the journal is `PLANNED`, and only when
  its synthetic marker and journal identity agree exactly.
- There is no direct write to `company_turnover_monthly_facts`, no backfill, no
  coverage timestamp manipulation, no local Turnover formula, and no historical
  reconstruction.
- People changes use the canonical product mutation path. The future controlled
  termination uses the trusted archive boundary, never direct People DML.

## Lifecycle

```text
PLANNED
  → BOOTSTRAPPED
  → COVERAGE_STARTED
  → MTD_ELIGIBLE
  → CLOSED_PERIOD_ELIGIBLE
  → POSITIVE_FACT_READY
  → HOSTED_PROVEN
  → RETIRED
```

Transitions are monotonic and single-step. `RETIRED` is terminal. The positive
hosted proof is refused before `POSITIVE_FACT_READY`; retirement is refused
before `HOSTED_PROVEN` unless a separately authorized quarantine/abort decision
is recorded outside this happy-path state machine.

## Canonical observations and time

Time passing does not write database state. Migration `0142` materializes state
only when one of these already-canonical observations reaches
`ensure_company_turnover_period_v1`:

1. a People insert/update/delete, through the trigger
   `capture_company_turnover_people_delta_v1`; or
2. an authorized read through `get_company_turnover_v1`, which also emits its
   immutable administrative-read audit.

Bootstrap in October 2026 starts coverage at the real observation instant, not at
October 1, so October is permanently incomplete. After 2026-11-01 UTC, a
canonical observation may close October and create November with
`headcount_at_start`; November MTD is eligible only when the returned/catalogued
facts prove coverage at or before November 1 and a non-null start headcount.
After the following UTC boundary, another canonical observation may close
November. Only then may November qualify as the previous closed period. Tooling
derives month boundaries from UTC instants; it contains no fixed eligibility date
and never simulates time.

## Durable ownership journal

The unversioned, mode-0600 journal contains no secret and records:

- schema version, marker, owner slice, Review ref, lifecycle state and revision;
- company UUID plus immutable synthetic name/slug marker;
- synthetic actor and employee UUIDs with non-PII role/kind only;
- creation/observation timestamps, coverage start and observed UTC periods;
- canonical mutation receipts (kind, occurred-at and owned target UUID);
- factual MTD/closed eligibility observations;
- hosted evidence identity; and
- retirement state and timestamp.

Every mutation-capable phase must first reload and validate the journal, compare
the remote marker/UUIDs read-only, and recheck target identity. A missing,
malformed, duplicated or contradictory journal fails closed.

## Phase policy

- **Bootstrap:** exactly one synthetic company and minimum actors/employees;
  journal ownership before the next mutation; first canonical People observation
  starts coverage.
- **Rollover observation:** authorized boundary read or a necessary canonical
  People mutation, only after the UTC period has advanced. Merely waiting is not
  accepted as rollover evidence.
- **Positive fact:** only after factual MTD/closed eligibility. One run-owned
  employee is transitioned through the trusted archive path, then the trusted
  boundary and Analytics UI must render the resulting fact. The harness never
  calculates the expected percentage.
- **Hosted proof:** exactly one authorized run, zero automatic retry. Failure
  consumes the run and preserves journal/evidence.
- **Retirement:** only owned UUIDs are neutralized. Immutable audit is preserved;
  if retention prevents deletion, existing canonical `RETIRED` semantics apply.

## Stop conditions

Stop before mutation on wrong target, a second journal/company, ownership drift,
non-adjacent transition, premature temporal eligibility, premature hosted proof
or retirement, accumulator/backfill/coverage-write intent, direct People DML,
missing deployment binding, or any request to infer facts not returned by the
trusted boundary.
