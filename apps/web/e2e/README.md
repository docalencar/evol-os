# Authenticated Review E2E harness

Browser evidence for MVP closure, run against the canonical hosted Review
deployment. Everything here is **runner-only**: no module under `e2e/` may be
imported by application code in `src/`.

## Running

```bash
cp apps/web/.env.e2e.example apps/web/.env.e2e.local   # then fill in the two keys
npm --workspace apps/web run e2e:review
```

`e2e:review` is the single entry point: it makes sure the Chromium build is present
(a fast no-op once installed) and then runs the suite, which does target-identity
preflight, fixture setup, the authenticated smoke and teardown in that order.
`npm run e2e` skips the browser check if you know it is installed;
`npm run e2e:report` opens the HTML report afterwards.

`.env.e2e.local` is gitignored. Variables may equally be exported in the runner
environment instead of using the file — CI should do that.

## What it guarantees

**It fails closed on the wrong target.** `helpers/env.ts` rejects the Production
(`gzrrwyiqfbnyprkdeqvm`) and Legacy (`oudngmrdtgengilpqqnz`) refs outright, and
refuses anything that is not the canonical Review host unless
`E2E_ALLOW_NON_REVIEW_TARGET=true` is set explicitly. Then
`helpers/target-identity.ts` proves the binding from the assets the deployment
actually serves — the Supabase ref is inlined in the client bundle because
`NEXT_PUBLIC_SUPABASE_URL` is public, so no credential is needed to verify it.
Both run **before** any fixture exists.

**The service-role key never reaches a browser.** It is read only in
`helpers/admin-client.ts`, inside the Node runner process. It is not passed to
`page.evaluate`, not injected into storage, and `video` is off so a typed password
is never recorded. `redact()` in `helpers/env.ts` is the last-resort scrub for
anything that would otherwise be written out.

**Every resource is run-owned.** A run id tags the company slug, the synthetic
e-mail addresses and the manifest. Teardown deletes by exact id and never widens a
predicate on failure — an orphan is reported instead.

## Fixture boundary

| | |
| --- | --- |
| **Bootstrap data** | synthetic users, the run's company, the manager/employee memberships |
| **Journey actions** | anything a spec is meant to *prove* — never pre-created |

The company is created through the real `create_company_with_owner` RPC, called
with the synthetic admin's own session, because that function is `security definer`
and reads `auth.uid()` — the service role cannot call it, and using the real
session is the faithful path anyway. Non-owner members are inserted with the
service role: the real route would be the invitation issue/accept flow, which is
itself an MVP journey (J04), so bootstrapping through it would make the harness
circular.

Ordering is forced by the schema —
`enforce_active_membership_people_invariant` (migration 0072) rejects an active
membership unless exactly one matching `people` row exists, so the person is
inserted first.

## Identities

| Logical role | `company_members.role` | Source |
| --- | --- | --- |
| `admin` | `owner` | created by `create_company_with_owner` |
| `manager` | `manager` | bootstrap insert |
| `employee` | `employee` | bootstrap insert |

Role strings are the real check-constraint values from migration 0001
(`owner | admin | hr | manager | employee`).

Users are created through the Supabase Admin API with `email_confirm: true`, so
they are already confirmed without touching the project's `Confirm email` setting.

> **This is not proof of the signup e-mail journey.** Baseline identities are
> admin-bootstrapped. `EMAIL_CONFIRMATION_DELIVERY_E2E=NOT_TESTED_IN_BASELINE_HARNESS`.
> Proving that journey needs a provider-backed mailbox and is a separate slice.

## Layout

```
e2e/
  auth/       real UI login + shell assertions
  fixtures/   synthetic identities, tenant lifecycle, teardown
  helpers/    env contract, run identity, privileged clients, target proof
  specs/      00-target-identity, 01-authenticated-smoke
  .run/       gitignored: manifest, storage state, traces, report
```

## Local debugging

A localhost run is permitted for developing the harness itself, with
`E2E_ALLOW_NON_REVIEW_TARGET=true`. **A passing localhost run is not Review
release evidence** — the harness prints a warning saying so.
