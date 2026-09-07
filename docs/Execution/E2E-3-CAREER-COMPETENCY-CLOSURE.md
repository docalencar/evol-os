# E2E-3 — Career, seniority and competencies: hosted closure

```
E2E3_STATUS=CLOSED/PASS
HOSTED_RUN=260907195352-b20ffd
TESTS=39/39 PASS  (0 failed, 0 flaky)
E2E3_SLICE=10/10 PASS
DURATION=6.1m
TERMINAL_STATE=RETIRED
QUARANTINED=NO
PRIOR_FAILED_RUN=260907184219-ec1320  (ENVIRONMENTAL)
PRODUCT_REGRESSION=NO
```

E2E-3 is closed because a green run exists against canonical hosted Review — not
because the specs pass locally. This document records what that run proved, the
terminal state it reached, why the run before it does **not** count as a product
failure, and what deliberately remains open.

| | |
| --- | --- |
| Canonical Review | `https://evol-os-review.vercel.app` |
| Supabase Review ref | `rwfvxvbzaosgcyfxdjpt` |
| Deployment / `main` SHA | `c555a9839eab50e73d9b15b62c812e0dac653da8` |
| Last PR in the slice | `#89` — merged |
| `main` push CI | `#256` SUCCESS |

---

## 1. What the hosted run proved

Playwright reported `39 passed` across eleven spec files, single worker, no
retries consumed, in 6.1 minutes. The E2E-3 slice is ten of those:

| Spec | Result |
| --- | --- |
| `08-career-competency-expectation.spec.ts` | 4/4 |
| `09-person-competency-gap.spec.ts` | 3/3 |
| `10-career-tenant-isolation.spec.ts` | 3/3 |

The other twenty-nine are the E2E-0/1/2 suites, re-proven unchanged on this SHA.

### The twenty properties this run establishes

```
 1  Review target identity                    11  Cross-tenant Organization isolation
 2  Auth / session boundary                   12  Competency creation + readback
 3  First-access onboarding + tenant create   13  Seniority creation + readback
 4  Tenant persistence                        14  Seniority applied to a Position
 5  Cross-tenant person non-disclosure        15  Position x Seniority expectation
 6  Department creation + readback            16  Person seniority assignment
 7  Position creation + linkage               17  Evidence below expectation -> +gap
 8  Team creation + readback                  18  Evidence raised -> status flips
 9  Person linked to Position + Team          19  Cross-tenant career isolation
10  Person Organization card readback         20  RETIRED teardown, audit retained
```

### The career journey, end to end in a browser

```
Competency (catalog)
  Seniority (catalog)
    -> Seniority applied to a Position
      -> Position x Seniority competency expectation     (the contextual level)
        -> Person assigned that Seniority
          -> Current competency evidence below expectation  -> positive gap
            -> Evidence raised to the expectation           -> derived status flips
```

Every step went through the rendered UI — catalogs, the seniority matrix, the
person profile — not through a service-role write. The expectation is read back
after a reload, so the assertion is about persisted state rather than client
memory.

### The gap is derived by the product, not by the test

Properties 17 and 18 are the point of the slice. The spec asserts the value the
page renders (`+2`, then `0`) and the taxonomy label beside it
(`Gap de desenvolvimento`, then `Atende ao esperado`). It performs no arithmetic
of its own: a spec that computed `expected − current` and asserted its own
result would look identical when green and would prove nothing.

Expectations come only from `position_seniority_competencies`, never from
`competencies.expected_level`. That factual boundary is what makes the
expectation *contextual* — the same competency can be expected at different
levels for different seniorities of the same position.

### Tenant isolation across the career domain

Spec 10 extends the E2E-2 property to competencies, seniorities and positions:
tenant B sees none of tenant A's catalog, and a direct URL to tenant A's
resource is denied in a way indistinguishable from an id that exists nowhere. A
denial that differed between *"exists but is not yours"* and *"does not exist"*
would be an existence oracle over a competitor's career model.

---

## 2. Terminal lifecycle: RETIRED

Teardown classified the run before mutating anything, measured real retention
pressure — `activity_events = 50` — and therefore retired rather than deleted.

| Resource | Action | Count |
| --- | --- | --- |
| Companies | `status -> inactive` | 2 |
| Run-owned people | `status -> terminated` | all |
| Non-owner memberships | `status -> inactive` | all |
| **Owner memberships** | **deliberately unchanged** | still `active` |
| Run-owned auth users | `ban_duration = 876000h` | 4 |
| `activity_events` | never written, never deleted | 50, unchanged |

Postconditions PASS, and the journal was finalized only after they passed. The
reasoning behind each row — why the owner membership survives, why retention
counts must be *identical* rather than merely non-zero — is unchanged from
[`E2E-RUN-TERMINAL-STATES.md`](./E2E-RUN-TERMINAL-STATES.md) and is not restated
here.

The journalled graph was ten owned resources: 2 companies, 2 memberships,
2 people, 4 auth users.

---

## 3. Chronology: three hosted attempts, one product defect, one machine

E2E-3 needed four hosted attempts. Only the first exposed a product defect; the
next two were harness faults, and the one immediately before closure was the
operator's laptop.

1. **`260907120642-8774b5`** — the person-profile control was looked up as
   `role="link"`. Base UI's render-prop `Button` emits an anchor carrying an
   explicit `role="button"`, so the lookup matched nothing. Spec 06 had already
   found and documented this exact trap; spec 09 reintroduced it. The run also
   produced **no trace at all**, because `trace: "on-first-retry"` never fires
   for an operator running without CI retries. Fixed in `b6973fc` and `ec47470`:
   `trace: "retain-on-failure"`, and the locator pinned by a guard.

2. **`260907175655-ecd9b6`** — a write→reload race. In spec 08 the reload fired
   1.6 ms after the server action's POST began and aborted it in flight
   (trace status `-1`); in spec 09 it fired 2.7 ms after, so the navigation
   fetched server-rendered HTML from before the write committed. Neither was a
   product fault, and neither test noticed for thirty seconds. Fixed in
   `471c9b4`, with a structural guard that scans *every* spec for the signature
   rather than pinning the two instances.

3. **`260907184219-ec1320` — ENVIRONMENTAL.** See below.

4. **`260907195352-b20ffd`** — executed under `caffeinate`, completed normally,
   `39/39 PASS`.

Product code was touched exactly once in the whole slice, by `b47cd81`: the
first Position×Seniority expectation was unreachable because the zero state
offered no way to create one. That is a genuine product defect found by E2E-3
and fixed inside it, without a migration, a new RPC or new data semantics.

### Why `260907184219-ec1320` is classified ENVIRONMENTAL

The forensic read of that run's trace shows the machine suspended mid-run:
`net::ERR_NETWORK_IO_SUSPENDED` in spec 05, and a wall clock of 1053 s —
17.5 minutes — on a step whose timeout is 30 s. A timeout that outlives its own
budget by a factor of thirty-five is not a slow application; it is a clock that
kept running while the process did not. No product assertion failed on its
merits.

That run also exposed a **secondary harness defect worth fixing on its own**:
spec 08's create steps waited on a *secondary* effect — a label appearing in a
list — instead of the *primary* signal the product emits. When the create POST
hung, the spec spent its whole budget hunting for a row and then reported a
misleading "not found". `a711cd4` closed that class: both catalog creates now
assert the exact success message the action returns and the dialog closing,
before any list readback. The messages are read from `createCompetencyAction`
and `createSeniorityLevelAction`; the dialog closes only on success, because the
forms toast the error and return on failure.

**The final run closes the ambiguity.** The same specs, on the same Review
deployment, against the same Supabase project, with the machine kept awake,
passed 39/39. The failure of `260907184219-ec1320` is therefore attributed to
the environment and not to the application, and the attribution is backed by a
green run rather than by an argument.

---

## 4. Methodology conclusions

- **E2E-3 is closed only because hosted Review evidence exists.** Local green is
  a precondition, never the verdict.
- **A failing hosted run is not evidence of a product defect until it is
  classified.** Of four attempts, one was a product defect, two were harness
  faults and one was the machine. Reporting any of the last three as a product
  regression would have been false.
- **An expensive run must explain itself the first time it fails.** Retaining
  the trace on failure cost nothing on green runs and turned two of these
  diagnoses into millisecond-level readings instead of another paid run.
- **Fix the class, not the instance.** Every harness fault in this slice was
  closed with a structural guard that scans all specs, because the previous
  round of "fix the two occurrences" left a third behind — and the guard caught
  it immediately.
- **Assert the primary signal before the secondary one.** A submit must prove
  the product's own success contract before waiting on a list, a reload or any
  other downstream effect. Immediate feedback proves the write was *accepted*;
  the durable readback still proves it *persisted*. Neither replaces the other.
- **Hosted runs are executed under `caffeinate`.** Suspension is now a known,
  preventable failure mode, not a mystery.
- **Immutable audit is never weakened**, and `RETIRED` remains a healthy
  terminal state chosen by measured retention pressure.

---

## 5. Explicitly not part of this closure

These are known, non-blocking, and deferred to separate slices:

1. **Legacy sign-inverted gap adapter.** `calculateCompetencyGap` in
   `features/talent` computes `current − expected`, the opposite sign of the
   canonical derivation, and feeds two summary cards on the same person page.
   Spec 09 never asserts against those surfaces, and a guard enforces that it
   cannot start doing so. The debt itself is untouched.
2. **Specs 05 and 06 have no primary success assertions.** They create
   departments, positions, teams and people without asserting the product's
   success contract, so they carry the same latent risk that `a711cd4` closed
   for spec 08. The limitation is stated in the guard's own source; closing it
   is adding those controls to one list.
3. **Gap → PDI persistence** is not exercised. This slice proves the gap is
   derived and displayed, not that it drives a development plan.
4. **Department-detail redirect**, carried over from E2E-2: the detail route
   redirects to a list route that does not exist. Spec 07 accommodates it
   without masking the isolation property being tested.
5. **`scripts/review/` promotion and verification runners** remain untracked and
   outside this slice.

---

## 6. What is still not proven

- Every domain outside Organization, People and Career: recruitment,
  development plans, assessments, feedback, planning, KPI execution, executive
  surfaces.
- Signup e-mail confirmation delivery and password recovery.
- Direct-report anonymity and assessment privacy under hosted conditions.
- Navigation completeness beyond the routes these eleven specs traverse.
- **Production (`gzrrwyiqfbnyprkdeqvm`) — UNKNOWN. Reverify before use.**
  Untouched throughout E2E-3 and out of scope by governance. Nothing in this
  document is evidence about Production.
- **Legacy (`oudngmrdtgengilpqqnz`) — not a promotion target.** Untouched.

---

## 7. Operational evidence (not committed)

Referenced for traceability only; the run directory is gitignored and no part of
it is in this commit.

| Artifact | Location |
| --- | --- |
| Retired run archive | `apps/web/e2e/.run/archive/260907195352-b20ffd.retired.json` |
| Operational journal, renamed on finalize | `apps/web/e2e/.run/archive/260907195352-b20ffd.run.json.retired` |

The archive is written through `redactJournalForArchive`, so every synthetic
password in it reads `<redacted>`. The renamed operational journal still holds
the real values — it is preserved rather than deleted so recovery authority
survives, and `apps/web/e2e/.run/` is gitignored in full. Those accounts are
banned.
