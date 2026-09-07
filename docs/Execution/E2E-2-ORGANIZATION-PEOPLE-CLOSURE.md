# E2E-2 — Organization and People: hosted closure

```
E2E2_STATUS=CLOSED/PASS
HOSTED_RUN=260907005557-a00133
TESTS=29/29 PASS  (0 failed, 0 flaky)
E2E2_SLICE=13/13 PASS
TERMINAL_STATE=RETIRED
QUARANTINED=NO
RETIRED_HOSTED_PROVEN=YES
```

E2E-2 is closed because a green run exists against canonical hosted Review — not
because the specs pass locally. This document records what that run proved, the
terminal state it reached, and what deliberately remains open.

| | |
| --- | --- |
| Canonical Review | `https://evol-os-review.vercel.app` |
| Supabase Review ref | `rwfvxvbzaosgcyfxdjpt` |
| Deployment / `main` SHA | `63c621af51606635d1107f0248c21f54c15f3182` |
| PR | `#81` — PR CI `#240` PASS |
| `main` push CI | `#241` PASS |

---

## 1. What the hosted run proved

Playwright reported `29 passed` across eight spec files, single worker, no
retries consumed. The E2E-2 slice is thirteen of those:

| Spec | Result |
| --- | --- |
| `05-organization-structure.spec.ts` | 4/4 |
| `06-people-org-linkage.spec.ts` | 4/4 |
| `07-organization-tenant-isolation.spec.ts` | 5/5 |

### The organization journey, end to end in a browser

```
Department
  -> Position linked to that Department
    -> Team
      -> Person linked to that Position and that Team
        -> profile "Organização" card reads all three back
```

Every step went through the rendered UI — the wizard, the lists, the profile —
not through a service-role write. The linkage was then re-read after a reload
and after navigating away and back, so the assertion is about persisted state
rather than about client memory.

The person-profile selector is exercised through `getByRole("button")`. Base UI's
render-prop `Button` emits an anchor carrying an explicit `role="button"`, so a
`getByRole("link")` lookup cannot match it. The spec asserts the role the DOM
actually exposes.

### Tenant isolation, proven non-oracular

| Property | Result |
| --- | --- |
| Tenant B's company hub shows none of tenant A's departments | PASS |
| Tenant B's positions and teams lists show none of tenant A's | PASS |
| Tenant B's people list shows none of tenant A's people | PASS |
| A direct URL to tenant A's department is denied | PASS |
| The denial is indistinguishable from a random UUID that exists nowhere | PASS |

The last row is the one that matters. A denial that differs between *"exists but
is not yours"* and *"does not exist"* is an existence oracle, and enumerating it
maps a competitor's org chart. Foreign and random ids produce the same
observable outcome.

---

## 2. Terminal lifecycle: RETIRED, and why that is healthy

Teardown classified the run before mutating anything and found real retention
pressure — `activity_events = 16`. Physical deletion was therefore not a valid
domain operation, and the run was **retired, not erased**.

| Resource | Action | Count |
| --- | --- | --- |
| Companies | `status -> inactive` | 2 |
| Run-owned people | `status -> terminated` | all |
| Non-owner memberships | `status -> inactive` | all |
| **Owner memberships** | **deliberately unchanged** | still `active` |
| Run-owned auth users | `ban_duration = 876000h` | 4 |
| `activity_events` | never written, never deleted | 16, unchanged |

Postconditions PASS. The journal was finalized *only after* they passed, and
archived redacted to the gitignored run directory.

### The extended retirement model, now hosted-proven

Retirement previously neutralised the tenant and banned the identities but left
non-owner memberships `active`. That was survivable only because the accounts
were banned; the membership rows still asserted access that no longer existed.
The model was extended so retirement deactivates every non-owner membership, in
this order:

```
people -> non-owner memberships -> company     (per owned company)
then: ban run-owned auth users
```

This run is the first **hosted** evidence that the extended step executes
correctly against real Review data, on both tenants, rather than only against
127 local unit tests.

### Why the owner membership stays active

`enforce_company_member_owner_invariants` (migration 0071) raises `23514
LAST_ACTIVE_OWNER_REQUIRED` when deactivating a tenant's only owner, and `42501
OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER` for a service-role caller whose
`auth.uid()` is null. Both refusals are correct: a tenant may not be left
ownerless. The trigger returns early for rows that do not touch an owner, which
is precisely what makes non-owner deactivation legal.

The only ways around it are weakening the invariant or minting a second
synthetic owner in order to retire the first. Neither is acceptable. An active
membership on an account nobody can authenticate as grants nothing.

---

## 3. Chronology

The first hosted E2E-2 attempt failed teardown and is recorded separately. In
brief:

1. The run could not read four `development_template_application*` tables to
   measure retention pressure. Migration `0069:89` revokes all privileges on them
   from `service_role`; `BYPASSRLS` does not bypass table privileges, so the probe
   returned `403`.
2. Migration `0126` added `get_company_retention_pressure_v1` — a `SECURITY
   DEFINER`, `STABLE`, `search_path = ''` function over a closed relation list with
   no dynamic SQL, returning **counts only**. `EXECUTE` is granted to `service_role`
   alone. `SELECT` was *not* restored and `0069` was *not* weakened.
3. The residual run `260906201436-5ecd5f` was reclassified read-only, then
   finalized `RETIRED` (blocked by `activity_events = 4`) once the extended model
   was implemented and committed as `63c621a`.
4. That commit was published via PR `#81` and integrated by fast-forward,
   preserving the exact SHA. Canonical Review then served it, and this run
   followed.

The new run reuses nothing from the retired one: the two archived journals share
**zero** of their ten owned resources.

This supersedes the E2E-1 quarantine document's policy line that *"healthy runs
still clean physically"*. Physical cleaning remains healthy when nothing
immutable was retained; it is no longer the only healthy outcome.

---

## 4. Methodology conclusions

- **E2E-2 is closed only because hosted Review evidence exists.** Local green is
  a precondition, never the verdict.
- **`RETIRED` is a hosted-proven healthy terminal state**, not a theoretical one.
- **`CLEANED` and `RETIRED` are both valid healthy outcomes**, chosen by measured
  retention pressure. Neither is forced.
- **`QUARANTINED` remains an exceptional failure/recovery state.** It keeps the
  journal so recovery authority survives, and it is never reported as success.
- **Immutable audit is never weakened** to let teardown delete everything. When
  the audit trail and physical deletion conflict, the audit trail wins.
- **Journal ownership, classify-before-mutate, a TOCTOU re-read against a
  baseline fingerprint, and fail-closed postconditions remain mandatory.** A plan
  built for an observed world is refused if that world moved.
- Teardown and the standalone recovery command share **one** implementation, so
  the lifecycle cannot drift between them.

---

## 5. Explicitly not part of this closure

These are known, non-blocking, and deferred to separate slices:

1. **Empty diagnostic reason.** `describeProbeFailure` renders `(UNREADABLE: )`
   with no cause for the four privileged-count tables. The classification is
   correct; only the explanatory text is missing.
2. **Stale success message.** The `RETIRED` summary reports companies, people and
   bans but omits the non-owner memberships it now deactivates. The postconditions
   do enforce that state; the sentence has not caught up.
3. **Department-detail redirect.** The detail route redirects to a list route
   that does not exist. Spec 07 accommodates it without masking the isolation
   property being tested, so foreign-vs-random equivalence is still genuinely
   asserted. Fixing it inside this slice would have changed app behaviour under
   cover of a test gate.
4. **`scripts/review/` promotion and verification runners** remain untracked and
   outside this slice.

---

## 6. What is still not proven

- Every domain outside Organization and People: recruitment, career, development,
  assessments, feedback, planning, KPI execution, executive surfaces.
- Signup e-mail confirmation delivery and password recovery.
- Direct-report anonymity and assessment privacy under hosted conditions.
- Navigation completeness beyond the routes these three specs traverse.
- **Production.** Untouched throughout, and out of scope by governance.

---

## 7. Operational evidence (not committed)

Referenced for traceability only; both are gitignored or live outside the
repository, and neither is part of this commit.

| Artifact | Location |
| --- | --- |
| Retired run archive | `apps/web/e2e/.run/archive/260907005557-a00133.retired.json` |
| Hosted execution log | `e2e2-hosted-rerun-20260907T005554Z.log` (outside the repo) |

The archives contain the synthetic passwords of their runs. Those accounts are
banned, the files are never committed, and the run directory is gitignored.
