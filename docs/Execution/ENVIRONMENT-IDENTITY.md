# Environment Identity — Web Deployment Contract

This document answers three questions that must never again require rediscovery:

1. **What code is deployed where?**
2. **What Supabase project does that web deployment use?**
3. **What URL should automated tests target?**

`ENVIRONMENT-GOVERNANCE.md` governs the **database** tier (schema promotion). This
document governs the **web** tier (deployment identity). Neither authorizes an
operation: provisioning, deploying and changing provider configuration remain
Human Reviewer actions under `AGENTS.md` §3.

Only **non-secret** identity belongs in this file: provider, project name, URL,
Supabase project ref, branch. Keys, tokens and connection strings never do.

---

## 1. Environment matrix

| Field | LOCAL | REVIEW | PRODUCTION |
| --- | --- | --- | --- |
| `environment` | `LOCAL` | `REVIEW` | `PRODUCTION` |
| `web_provider` | local dev server | Vercel | *not established* |
| `web_project_name` | — | `evol-os-review` *(proposed; confirm on creation)* | *not established* |
| `web_project_id` | — | `TODO_AFTER_PROVISIONING` | — |
| `web_root_directory` | `apps/web` | `apps/web` | — |
| `web_base_url` | `http://localhost:3000` | `TODO_AFTER_PROVISIONING` | — |
| `web_url_stability` | `EPHEMERAL` | `STABLE` (project alias) | — |
| `deployment_branch` | working tree | `main` | — |
| `deployment_trigger` | manual `npm run dev` | push to `main` | — |
| `supabase_project_ref` | local stack (`:54321`) | `rwfvxvbzaosgcyfxdjpt` | `gzrrwyiqfbnyprkdeqvm` (revalidate before use) |
| `supabase_region` | — | `us-west-2` | — |
| `last_verification_mechanism` | `npm run build` | §5 verification gates | — |
| `last_verified_at` | — | `TODO_AFTER_PROVISIONING` | — |

> **Status: the Review web deployment does not exist yet.** Every `TODO_AFTER_PROVISIONING`
> above is filled in by the Human Reviewer immediately after the first successful
> Review deployment, in the same PR or a follow-up documentation PR. Until then, no
> document may describe Review as a reachable web environment.

Review is a **dedicated Vercel project** — deployment model A in the E2E-0A
taxonomy — rather than a preview environment of a shared project. This is what
makes `web_base_url` stable and keeps Review structurally independent from a future
Production project that will point at a different Supabase ref.

---

## 2. Identity rules

- A deployment is **REVIEW** only if its `NEXT_PUBLIC_SUPABASE_URL` resolves to
  project ref `rwfvxvbzaosgcyfxdjpt`. A deployment pointing anywhere else is not
  Review, regardless of its name, branch or URL.
- Environment identity is never inferred from project naming, branch naming, a URL
  that merely responds over HTTPS, or a local link. It is read from provider
  configuration.
- `LEGACY` ref `oudngmrdtgengilpqqnz` is never a deployment target.
- Production promotion of the web tier is a separate, separately authorized
  decision and is out of scope for this document until a Production project exists.

---

## 3. Runtime environment variables

Inventory taken from every `process.env` read under `apps/web/src`. **Names and
scopes only — values live in the provider, never in Git.**

| Variable | Scope | Required for Review | Secret | Consumers |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | **yes** | no | Supabase browser/server clients; trusted server clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | **yes** | no (publishable) | Supabase browser/server clients |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | **yes** | **yes** | Notifications, Development template application, Global competencies trusted databases |
| `APP_BASE_URL` | server only | **yes** | no | Invitation link construction (issue / resend) |
| `RESEND_API_KEY` | server only | **yes** | **yes** | Tenant invitation email delivery |
| `EMAIL_FROM` | server only | **yes** | no | Tenant invitation email delivery |
| `TENANT_PREFERENCE_RESOLUTION_ENABLED` | server only | optional | no | Multi-company selection feature flag (`"true"` enables) |
| `AI_PROVIDER` | server only | optional | no | AI copilot provider factory (defaults to `mock`) |
| `OPENAI_API_KEY` | server only | only if `AI_PROVIDER=openai` | **yes** | OpenAI provider |
| `OPENAI_MODEL` | server only | optional | no | OpenAI provider model override |

Notes that matter operationally:

- **`NEXT_PUBLIC_*` are inlined at build time.** They must exist in the provider
  before the build that is expected to use them; changing one requires a redeploy,
  not a restart.
- **The three `SUPABASE_SERVICE_ROLE_KEY` consumers fail lazily**, at first call,
  not at build time. A Review deployment missing that key builds and serves
  successfully but returns errors from Notifications, Development template
  application and Global competencies. Because Development template application is
  on the MVP golden path, Review must carry the key.
- **`RESEND_API_KEY` + `EMAIL_FROM` are validated together** and throw when either
  is absent; invitation issue/resend then returns `configuration_error` *after*
  persisting the invitation.
- **`APP_BASE_URL` must be an absolute URL** and must equal `web_base_url`.
  Otherwise invitation emails carry links pointing at the wrong environment.
- Secrets are scoped to the **Production environment of the Review project only**.
  They are never added to Preview scope, which would expose them to deployments
  built from forks.

---

## 4. Supabase Auth URL configuration (Review project)

The application derives its own origin: `signup-form.tsx` requests
`emailRedirectTo: ${window.location.origin}/auth/callback`, and
`app/auth/callback/route.ts` redirects using the incoming request origin. The code
therefore needs no host configuration — but **Supabase only honours a `redirectTo`
that is on the project's allow list**, and otherwise falls back to Site URL.

Required on Supabase project `rwfvxvbzaosgcyfxdjpt`, **Authentication → URL
Configuration**:

| Setting | Value |
| --- | --- |
| Site URL | `<web_base_url>` |
| Redirect URLs | `<web_base_url>/**` and `http://localhost:3000/**` and `http://localhost:3100/**` |

Retaining the two localhost patterns keeps the existing local Review runtime
(`validate-b2b2b-review-app.sh`, port 3100) working alongside the deployment.

This is an **Auth configuration change on Review**. It is not a schema migration
and is outside `ENVIRONMENT-GOVERNANCE.md`'s migration lifecycle, but it is still a
remote mutation of a shared environment and requires explicit Human Reviewer
authorization. Without it, signup email confirmation on the deployed Review app
silently redirects to the wrong origin and authenticated E2E cannot pass.

---

## 5. Verification gates

A Review deployment is only recorded as valid when all of the following hold, in
order:

1. Build succeeds on the deployment provider from branch `main`.
2. The deployed commit SHA is recorded and matches the intended `main` commit.
3. `<web_base_url>` responds over HTTPS with the Evol OS application.
4. `/login` renders the authentication entrypoint.
5. An unauthenticated request to `/app` redirects to `/login` (middleware guard).
6. The running deployment's Supabase ref is confirmed to be `rwfvxvbzaosgcyfxdjpt`.
7. This document's `TODO_AFTER_PROVISIONING` fields are filled in and committed.

Steps 3–6 are read-only probes and create no application state. Only after step 7
may `E2E_BASE_URL` be treated as canonical.

---

## 6. E2E contract

Once §5 passes:

```
E2E_BASE_URL=<web_base_url>
E2E_SUPABASE_PROJECT_REF=rwfvxvbzaosgcyfxdjpt
```

`apps/web/.env.e2e.example` holds the versioned, non-secret shape of this contract.
Operator-specific values and any test credentials live in an untracked
`apps/web/.env.e2e.local`, following the pattern already used by
`apps/web/.env.review.local`.

E2E evidence produced against a URL that is not `E2E_BASE_URL`, or against a
deployment whose commit does not match the commit under review, is not valid
closure evidence.

---

## 7. Maintenance

Update this document whenever the provider, project, URL, branch binding or
Supabase ref changes — in the same PR as the change. A drift between this document
and the provider is a release-governance defect, not a documentation nit.
