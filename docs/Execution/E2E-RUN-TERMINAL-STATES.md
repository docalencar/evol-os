# E2E run terminal states

```
CLEANED      healthy — run-owned graph physically removed
RETIRED      healthy — immutable audit retention forbids deletion; capability neutralised
QUARANTINED  exceptional — failed or inconsistent run, needs a human
```

**AUDIT IMMUTABILITY WINS.** No trigger, constraint, RLS policy or domain
invariant is ever weakened to make teardown convenient. When the domain says a
row must survive, it survives and the harness adapts.

---

## 1. Why a second healthy state exists

Organization and People creation writes an immutable `activity_events` row on
every single create, via `append_people_organization_activity` (0089:59). That
table cascades from `companies` and carries `BEFORE UPDATE`/`BEFORE DELETE`
triggers that raise unconditionally (0039:158,168), so **one "Novo Departamento"
click makes its tenant permanently undeletable.**

That is correct product behaviour. What was wrong was the harness treating it as
a cleanup failure. A healthy run that legitimately produced audit history is not
a failed run, and it is not a quarantine case either — quarantine is for graphs
that are *inconsistent*, not for graphs the domain is deliberately preserving.

## 2. Classification happens before the first mutation

The previous teardown attempted `DELETE FROM companies`, caught the immutability
error, and read its message. That is exception-as-control-flow: it performs a
destructive action in order to ask a read-only question, and it can only ever
recognise the first blocker Postgres happens to name.

The sequence is now:

```
inspect (read-only) -> classify -> plan -> TOCTOU reread -> mutate -> verify -> finalize
```

The inspect step counts rows in a registry of company-scoped retention tables
using plain PostgREST `count` with `head: true`. It never calls an RPC —
several administrative *read* RPCs append an `activity_events` row through
`audit_secure_administrative_read` (0062:55), so classifying with one would
create the very evidence it is trying to detect.

## 3. The retention registry is not just `activity_events`

`activity_events` is merely the table the org/people flows happen to write. A
full migration audit found others that block a company delete just as hard —
five notification tables (0063), the approval ledger (0046), planning snapshots
(0048), tenant-access audit (0070) — plus three `ON DELETE RESTRICT` FKs straight
to `companies` from the development-template domain (0068), which need no trigger
at all. All are in `e2e/lifecycle/retention-registry.ts` with migration evidence.

Two auth-side traps are recorded there too: `activity_events.actor_id` and
`notification_events.actor_id` are both `ON DELETE SET NULL` into an
update-immutable table, so deleting such an actor is refused as firmly as
deleting the row.

## 4. What RETIRED does, and does not

| | |
| --- | --- |
| people of each run-owned company | `status -> terminated` |
| each run-owned company | `status -> inactive` |
| each **journalled** auth identity | `ban_duration = 876000h` (reversible with `'none'`) |
| owner membership | **untouched, deliberately** |
| every retention table | **untouched — verified identical afterwards** |

People are targeted **by company**: the company id is journalled as a full UUID
and every row scoped by that `company_id` is transitively run-owned, which is the
same argument physical cleanup already relies on when it lets a delete cascade.
Auth identities get the opposite treatment — only exact journalled UUIDs, never
discovered — because an auth user is not company-scoped and a discovery predicate
there could reach somebody else's account.

**The owner membership stays active.** `enforce_company_member_owner_invariants`
(0071) raises `LAST_ACTIVE_OWNER_REQUIRED` for a tenant's only owner and
`OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER` for a service-role caller whose
`auth.uid()` is null. Both refusals are correct; the only ways around them are
weakening the invariant or minting a second synthetic owner to retire the first.
The plan therefore does not include the step, states so in `notAttempted`, and
the postconditions assert the membership is unchanged rather than pretending it
was handled. An active membership on an account nobody can authenticate as grants
nothing.

## 5. Postconditions, and what failure means

RETIRED is not partial cleanup. It is verified: company exists and is inactive,
every person terminated, every surviving run-owned identity banned, the sole-owner
invariant intact, and **every retention count identical to the pre-retirement
snapshot** — not merely non-zero. A count that moved would mean the harness itself
wrote audit noise while claiming to preserve the trail.

A retirement that stops partway is reported as **QUARANTINED**, never RETIRED, and
the journal is kept so recovery authority survives. Calling a partial mutation a
healthy terminal state would be the single most damaging lie this subsystem could
tell.

## 6. CLEANED remains the default

If no retention table holds a row, deletion is still valid and still what happens.
We do not want to accumulate tenants, and E2E-0 / E2E-1 healthy runs must not
silently start retiring. If classification says CLEANED and the delete then fails,
that is an inconsistency — the graph moved, or the registry is incomplete — and it
is reported as QUARANTINED rather than quietly downgraded to RETIRED.

## 7. Journal lifecycle

The active journal is operational authority and nothing else. On a verified
terminal state it is archived redacted (passwords stripped) into the gitignored
`.run/archive/`, and the operational file is renamed rather than deleted, freeing
the path for the next run without destroying anything. Nothing is finalized before
postconditions pass.
