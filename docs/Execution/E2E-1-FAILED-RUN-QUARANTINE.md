# E2E-1 — Failed hosted run 260905235830-c0b9ba: diagnosis and quarantine

```
E2E1_FIRST_HOSTED_RUN=13 PASS / 1 FAIL / 2 NOT RUN / 1 teardown error
TENANT_ISOLATION_CLASSIFICATION=APP_BEHAVIOR_BUG_NON_DISCLOSURE
FOREIGN_DATA_DISCLOSED=NO
QUARANTINE=PASS
E2E1_HOSTED_FINAL_VERDICT=PENDING_RERUN
```

The first hosted E2E-1 run against `https://evol-os-review.vercel.app`
(Supabase ref `rwfvxvbzaosgcyfxdjpt`) failed one spec and could not tear itself
down. Both outcomes had the same origin, and neither was a security failure.
This document exists so that the reasoning survives the code that was deleted.

---

## 1. What failed

`04-tenant-isolation.spec.ts` — *"tenant A's admin cannot reach a tenant B person"*.

| | |
| --- | --- |
| Expected URL | `/app/people` |
| Received URL | `/app/people/<tenant-B person id>` |

**No foreign data was disclosed.** The captured screenshot and accessibility
snapshot both show the generic People error boundary — *"Não foi possível
carregar Pessoas"* — with tenant A's own name in the header. Tenant B's company
name, its person's name, and every profile field were absent. The security
boundary held; the control flow did not.

### Root cause

`/app/people/[id]` launched fourteen reads in a single `Promise.all`. One of
them, `getCanonicalPersonCompetencyCoverage`, calls
`get_tenant_person_competency_expectations_v1` (migration 0123), which raises
one constant `42501` denial for a cross-tenant target and for a target that
exists nowhere — deliberately, so the endpoint cannot confirm which ids are real:

```sql
where target.id = p_person_id and target.company_id = p_company_id;
-- One safe denial for missing and cross-tenant targets: no existence oracle.
if not found then
  raise exception using errcode = '42501',
    message = 'PERSON_COMPETENCY_EXPECTATIONS_FORBIDDEN';
```

Its siblings (0118, 0119) raise the same shape and the TypeScript layer catches
them. This one did not, so `Promise.all` rejected and
`if (!employee) redirect("/app/people")` was never reached.

Every raise site involved emits a fixed literal with no interpolation — no ids,
no names — so the denial leaked nothing about the other tenant.

---

## 2. The immutable side effect

`read_assessment_administratively` (0062) writes an `activity_events` row through
`audit_secure_administrative_read` **before** it checks the target. A request for
an inaccessible person therefore left a permanent audit record of a read that
never happened.

`activity_events` is an intentionally immutable log (0039): a `BEFORE UPDATE` and
a `BEFORE DELETE` trigger that always raise. It also carries two foreign keys:

```
activity_events.company_id -> companies(id)   ON DELETE CASCADE
activity_events.actor_id   -> auth.users(id)  ON DELETE SET NULL   (an UPDATE)
```

So teardown could not remove company A — the cascade tried to delete the audit
row and the trigger refused — and could not remove the admin auth user, because
nulling `actor_id` is an update the same trigger refuses. Exactly one company and
exactly one auth user were affected, and they were precisely the tenant and the
actor of that single audited read. The other three auth users and tenant B were
deleted normally.

**The test created the row that blocked its own cleanup.** E2E-0 cleaned
successfully only because it never opened a person profile.

---

## 3. The fix

The correction is ordering, not error handling. Catching the rejection would
have fixed the error page and still written the audit row.

`/app/people/[id]` now resolves the target person **inside the current tenant**
alone, redirects if absent, and only then issues the derived reads — which remain
parallel behind that gate.

`get-canonical-person-competency-coverage.ts` additionally classifies its
failures: `PersonCompetencyExpectationsDeniedError` for a `42501` domain denial,
`PersonCompetencyCoverageUnavailableError` otherwise. Coverage is never
fabricated on refusal — `CanonicalPersonCompetencyCoverage` carries an
`assignmentState`, so returning an empty object would assert a position state the
database never confirmed.

A structural regression test
(`src/features/people/profile/person-profile-read-ordering.test.ts`) fails if any
audited or denial-raising read is issued before the redirect gate.

No schema change. No authorization weakening. Legitimate same-tenant
administrative reads still audit exactly as before.

---

## 4. Quarantine of the residual tenant

Physical deletion was not a valid domain operation, so the run was **retired, not
erased**.

| Resource | Action | Result |
| --- | --- | --- |
| 3 people | `status -> terminated` | done |
| company A | `status -> inactive` | done |
| admin auth user | `ban_duration = 876000h` | done |
| owner membership | **deliberately unchanged** | still `active` |
| `activity_events` | **never read for content, never written** | 1 row, unchanged |
| tenant B, 3 other auth users | already absent | unchanged |

Preconditions PASS, postconditions PASS. The journal was archived redacted to the
gitignored run directory and the operational path freed.

### Why the owner membership is still active

`enforce_company_member_owner_invariants` (0071) raises `23514
LAST_ACTIVE_OWNER_REQUIRED` when deactivating a tenant's only owner, and `42501
OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER` for a service-role caller whose
`auth.uid()` is null. Both refusals are correct: a tenant may not be left
ownerless. The only routes around them are weakening the invariant or minting a
second synthetic owner in order to retire the first. Neither is acceptable, so
the membership remains — and an active membership on an account nobody can
authenticate as grants nothing.

---

## 5. Policy

- **Healthy runs still clean physically**: exact journal-owned domain graph
  first, auth users last. That is unchanged, and the fixed journey emits no audit
  event for a denied target, so deletion stays valid.
- **Quarantine is exceptional.** Cleanup now classifies an immutable-audit
  refusal as `REQUIRES_QUARANTINE` and reports that retrying will fail
  identically. It never quarantines automatically.
- **Audit immutability is never weakened** to make cleanup convenient.
- The run-id-bound quarantine command was deleted after use rather than published
  (`chore(e2e): retire completed quarantine runner`). This document is its
  record.

---

## 6. What is still not proven

`E2E1_HOSTED_FINAL_VERDICT=PENDING_RERUN`. Canonical Review still serves
published `main`, not this branch, so the fix is not yet the deployed version and
E2E-1 cannot be re-run meaningfully. Until a green hosted run exists, none of the
following may be reported as passing:

- the corrected redirect contract for a foreign or nonexistent person id,
  observed in a browser rather than asserted in a spec;
- cross-tenant denial (SEC-1);
- session and tenant-context persistence;
- onboarding through the real UI end to end.

Also unproven, and out of scope for this slice: signup e-mail confirmation
delivery (`EMAIL_CONFIRMATION_DELIVERY=NOT_TESTED_IN_BASELINE_HARNESS`), password
recovery, recruitment, career, development, assessment privacy, direct-report
anonymity, organization planning, navigation completeness, Production.

## 7. Residual debt

- `CI_NODE_ALIGNMENT=REQUIRED` — CI pins Node 20, Review runs 22.x. Non-blocking.
- `TEST_DISCOVERY_DEBT=PRE_EXISTING` — `tsx --test` treats `[id]` in a path as a
  glob character class, so `.test.ts` files inside dynamic route folders match
  nothing and never execute. Several pre-existing tests are affected. The E2E-1
  ordering test was deliberately placed outside such a folder so that it runs.
  Repository-wide relocation is a separate slice.
- Company `4324eada-975a-4602-9a8b-d8d6b604d540` remains on Review, inactive and
  inaccessible, retained because it is referenced by immutable audit history.
- The retired journal archive under the gitignored `.run/archive/` still contains
  the synthetic passwords of that run. They are inert — three of those accounts
  were deleted and the fourth is banned — and the file is never committed.
