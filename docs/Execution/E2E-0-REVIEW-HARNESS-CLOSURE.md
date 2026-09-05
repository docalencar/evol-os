# E2E-0 — Authenticated Review Harness: Closure

```
E2E0_HOSTED_SMOKE=PASS
```

Real hosted browser evidence against the canonical Review deployment.

| | |
| --- | --- |
| Review URL | `https://evol-os-review.vercel.app` |
| Review Supabase ref | `rwfvxvbzaosgcyfxdjpt` |
| Successful run id | `260905215100-28aa3b` |
| Result | **7/7 Playwright tests pass** |
| Fixture cleanup | **PASS** — company removed, 3 synthetic auth users removed |
| Prior orphan recovery | **PASS** — run `260905212333-a14562`, company removed, 1 auth user removed |
| Email confirmation delivery | `NOT_TESTED_IN_BASELINE_HARNESS` |

## What the run proved

- the target is the canonical Review alias, and the browser deployment references
  **only** the Review Supabase project;
- no service-role-shaped material is served to the browser;
- `/login` renders, and unauthenticated `/app` is guarded;
- a synthetic admin authenticates through the **real login UI** and reaches its own
  tenant;
- captured storage state carries a session and contains no service-role material;
- sign-out returns to `/login` and `/app` is guarded again;
- deterministic teardown removed every resource the run owned.

## What it does not prove

E2E-0 establishes the harness, authentication and fixture foundation. It is **not**
product evidence. None of the following may be reported as passing on the strength
of this run:

- the MVP golden path (journeys J02–J15);
- assessment execution or result visibility;
- career, competency or development journeys;
- cross-tenant denial (SEC-1);
- **signup e-mail confirmation delivery.** Baseline identities are created through
  the Supabase Admin API with `email_confirm: true`, which is a deterministic
  fixture mechanism, not a test of the mail path. The project's `Confirm email`
  setting was left enabled and untouched.

## Harness

`apps/web/e2e/` — see its `README.md` for the run order, the fail-closed target
guard, the fixture ordering contract and the ownership journal.

Operator commands:

```bash
npm --workspace apps/web run e2e:set-service-key   # once, hidden prompt
npm --workspace apps/web run e2e:review            # preflight → install → run
npm --workspace apps/web run e2e:cleanup           # recover an interrupted run
```

## Environment note

Review runtime is **Node 22.x**; CI still pins **Node 20**, which Vercel reports as
End of Life. `CI_NODE_ALIGNMENT=REQUIRED`, target major 22 — tracked as a separate
slice, deliberately not mixed into the harness delivery.
