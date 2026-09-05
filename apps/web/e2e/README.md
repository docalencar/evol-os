# Authenticated Review E2E harness

Browser evidence for MVP closure, run against the canonical hosted Review
deployment. Everything here is **runner-only**: no module under `e2e/` may be
imported by application code in `src/`.

## Running

```bash
npm --workspace apps/web run e2e:set-service-key   # hidden prompt, once
npm --workspace apps/web run e2e:review
```

`e2e:set-service-key` reads the key from the terminal with echo disabled, validates
it with the same validator the preflight uses, and writes only
`apps/web/.env.e2e.local` at mode 600. The value never passes through `argv`, so it
cannot appear in `ps` output or shell history, and it is never printed — success
says only `E2E_SUPABASE_SERVICE_ROLE_KEY=CONFIGURED`. On rejection nothing is
written and you get a metadata-only explanation.

The other non-secret variables are seeded automatically if the file does not exist
yet; `E2E_SUPABASE_ANON_KEY` still has to be filled in by hand or copied from
`apps/web/.env.review.local`.

`e2e:review` is the single entry point and runs in this order:

| Step | What | Fails closed? |
| --- | --- | --- |
| A | `e2e:preflight` — local env presence and key-format validation, no network | **yes**, exits non-zero before anything else happens |
| B | `e2e:install` — Chromium, a fast no-op once present | |
| C | hosted Review identity proof, in Playwright global setup | **yes**, before any fixture is created |
| D | fixture setup (synthetic identities, run-owned tenant) | |
| E | authenticated smoke | |
| F | teardown | |

A missing or invalid credential stops at **A**: no browser download, no spec
loaded, no fixture, and Review is never contacted. That guarantee lives in the
repository, not in whatever shell snippet launched the run.

`npm run e2e` skips A and B if you know the environment is good;
`npm run e2e:report` opens the HTML report; `npm run test:e2e-helpers` runs the
harness unit tests.

### Accepted key formats

| Slot | Accepted | Identity |
| --- | --- | --- |
| `E2E_SUPABASE_SERVICE_ROLE_KEY` | legacy JWT with `role=service_role` | verified from the payload `ref` |
| | new-format `sb_secret_…` | **operator-attested** — the format embeds no project id |
| `E2E_SUPABASE_ANON_KEY` | legacy JWT with `role=anon`, or `sb_publishable_…` | as above |

A broad prefix alone is never enough: `sb_secret_` with nothing after it, an anon
key in the service-role slot, a publishable key in the secret slot, a JWT for
another project, or the same value in both slots are each rejected by name.

Supabase documents the prefixes but not the encoding of the random part, so the
validator accepts base64, base64url, hex and dotted forms. It still refuses
whitespace, control characters and non-ASCII.

### Diagnosing a rejected key

```bash
npm --workspace apps/web run e2e:inspect-key -- --from-env   # what is in .env.e2e.local
some-command-that-prints-it | npm --workspace apps/web run e2e:inspect-key
```

Reports length, prefix class, character composition, JWT decode and the verdict —
**never the value, no substring of the random part, and no hash of it**, since a
hash would be a stable identifier for the secret. Non-ASCII codepoints *are*
named, because they cannot occur in a real key: `U+2022` means a masked dashboard
field was copied instead of the revealed value.

### Why there is no clipboard step

An earlier flow said "copy the key, then run this shell block", where the block
read the clipboard. Copying the block in order to run it overwrites the clipboard
first, so the block read its own text back and wrote a shell command into the env
file. The two clipboard uses collide by construction.

`e2e:set-service-key` takes no arguments and reads no clipboard, which removes the
whole class of failure.

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

**Every resource is run-owned, and ownership survives a crash.** The journal is
created *before the first Review mutation* and appended to immediately after each
resource is created, with atomic writes. Teardown deletes by exact id and never
widens a predicate on failure — an orphan is reported instead.

If a run dies part-way, recover it with:

```bash
npm --workspace apps/web run e2e:cleanup
```

It reads the journal, destroys exactly what is recorded, is idempotent, tolerates
already-deleted resources, and **refuses to act without ownership evidence**. A run
id, a company slug or a name pattern is not deletion authority — only the journal
is. That distinction is what separates recovering your own resources from deleting
someone else's.

### Creation and destruction order

The two orders are not mirror images, and both are forced by the schema.

**Creating a non-owner member** (`people_company_user_membership_fkey` is
`DEFERRABLE INITIALLY IMMEDIATE`, so it is checked per statement; the
`enforce_active_membership_has_people` constraint trigger is
`DEFERRABLE INITIALLY DEFERRED` and only inspects `status = 'active'`):

1. insert the membership as `'invited'` — the trigger skips a non-active row
2. insert the person — the immediate FK now has its membership
3. update the membership to `'active'` — the deferred check finds the person

`create_company_with_owner` can insert an active membership before the person only
because a plpgsql body is one transaction. Each PostgREST call is its own
transaction, so the harness cannot rely on that.

**Destroying**: company first. Deleting an auth user cascades to `company_members`
(`ON DELETE CASCADE`), which then collides with the people→company_members
`ON DELETE RESTRICT` foreign key — the auth delete fails and the user is stranded.
Removing the company cascades to both memberships and people inside one
transaction, which frees the auth users.

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
