# E-E2E0 — Governed Executive Hosted Contract

**Status:** FROZEN / PREPARED — not executed. **Baseline:**
`94fd34eb2d76b39e01d6402cf65162fa7a45f82d`. **Target:** canonical Review only.

This contract operationalizes the frozen
[E-P1 Minimum Executive Decision Contract](./E-P1-MINIMUM-EXECUTIVE-DECISION-CONTRACT.md).
It adds runner-only proof and no Executive, database, authorization or lifecycle
behavior.

## Governed invocation

The only authorized invocation is:

```bash
bash scripts/local/run-e-e2e0-executive-review.sh
```

The wrapper fixes the target to `https://evol-os-review.vercel.app`, rejects the
Production and Legacy Supabase refs, refuses the non-Review escape hatch and runs
only `apps/web/e2e/specs/18-executive-journey.spec.ts` in the authenticated
project. The existing identity project remains a Playwright dependency.

Global setup must bind the run to the deployment using the asset fingerprint
served by that deployment before any fixture mutation. `E2E_DEPLOYED_COMMIT_SHA`
is recorded only as `UNVERIFIABLE_FROM_DEPLOYMENT` unless the application later
serves matching commit evidence; a declared SHA is never promoted to proof.

One invocation creates one atomic journal and archive. A first failure terminates
the run: preserve evidence, classify it and never retry blindly.

## Frozen hosted journey

1. Global identity binding proves canonical Review before fixtures exist.
2. Run-owned tenant A, owner, admin, HR, manager and employee identities exist;
   tenant B is provisioned independently by the canonical onboarding helper.
3. `owner`, `admin` and `hr` each authenticate and reach **Executive** through
   normal navigation; the owner is the primary evidence actor.
4. Workforce Health renders the tenant-A employee count from canonical facts,
   with its factual status instead of a canned value.
5. A run-owned active Assessment appears as a factual Decision Feed item and its
   product-provided link routes to the exact owning Assessment workflow.
6. Deliberate absence of a Planning workspace is rendered as `Dados parciais` and
   `Workspace de Planning — Indisponível`; successful People/Assessment facts
   remain visible and are not replaced by zero, healthy or empty success.
7. Turnover, climate, aggregated performance, potential/Nine Box, succession and
   strategic plans remain explicitly unavailable.
8. Same-tenant `manager` and `employee` see no Executive navigation and direct
   route entry yields an opaque surface with no tenant-A Executive content.
9. Tenant-B owner can see only tenant-B Executive state; tenant-A company,
   employee, Assessment and Decision Feed identities are absent and there is no
   tenant selector capable of widening scope.
10. Runtime requests plus the repository lineage guard prove Executive does not
    depend on direct browser/authenticated `public.people` access.
11. The rendered page contains no generic intelligence score, recognition,
    check-in or one-on-one semantics.
12. `executive-journey-evidence.json` is written atomically and normal governed
    teardown retires both tenants and all run-owned identities while preserving
    the archive.

All twelve steps must pass in one run. No individual test or previous run may be
combined to manufacture a green result.

## Fixtures and setup

The existing global fixture owns tenant A and its synthetic identities. The spec
uses `ensureRunOwnedForeignTenant` for tenant B and creates one active Assessment
through authenticated trusted Assessment RPCs. Names and idempotency keys include
the run ID. It creates no Executive record, durable Executive alert or Planning
workspace. The missing workspace is the deterministic unavailable source; no
provider failure is forged and no product request is intercepted.

Fixture creation fails closed. Browser actions prove navigation and denial;
runner-side service access may establish fixture identity and canonical readback,
but is not accepted as product authorization proof.

## Evidence schema

`.run/archive/<run-id>/executive-journey-evidence.json` contains:

- run, target, Supabase ref and deployment identity including asset fingerprint,
  provider correlator and commit-SHA verification status;
- tenant A/B and synthetic actor IDs, never credentials;
- factual input IDs and counts for Workforce Health and the Assessment item;
- exact rendered Workforce, Decision Feed, partial/unavailable and unfinished
  capability evidence;
- normal-navigation route evidence for authorized actors;
- opaque denial evidence for manager/employee and isolation evidence for tenant B;
- direct-table/legacy-path and canned-semantics verdicts;
- ordered step verdicts and final `EXECUTIVE_JOURNEY=PASS` verdict.

The file is written through a temporary file plus atomic rename and attached to
the Playwright report. Raw Assessment answers, credentials, secret keys and raw
provider/database errors are prohibited.

## Isolation and negative contracts

- Role is not tenant selection. Manager and employee are denied independently of
  sidebar visibility.
- Tenant B is run-owned and genuinely distinct from tenant A. Its owner follows
  the canonical product route, but no tenant-A identity, name, Assessment or feed
  content may appear. The proof does not depend on an HTTP status.
- Partial is not empty: the exact unavailable source and surviving factual facts
  are both required. An unexpected source read failure, empty substitute or
  healthy substitute fails the run.
- An opaque denial must omit tenant/company/person/Assessment identities and
  Executive mutation controls. A route that leaks protected content fails even
  if its transport status looks like a denial.

## Teardown and classification

The existing journal is the sole deletion authority. Teardown owns tenants A/B
and all journalled identities, is safe after partial setup and records `RETIRED`
when immutable retained facts prevent physical deletion. It never deletes by a
name pattern or widens an ownership predicate.

Failures are classified before any correction as `REGRESSION`, `PRE_EXISTING`,
`STALE_TEST`, `ENVIRONMENTAL`, `HARNESS_DEFECT`, `DOWNSTREAM_CASCADE`,
`PRODUCT_GAP`, `SECURITY_CONTRACT_FAILURE`, `CONTRACT_CONFLICT`,
`UNKNOWN_REMOTE_OUTCOME`, `PARTIAL_REMOTE_APPLICATION`,
`DB_CONTRACT_DEFICIENCY` or `PRODUCT_DECISION_REQUIRED`.

Production and Legacy are forbidden. This contract authorizes no hosted run,
schema change, migration, RPC, Executive behavior change or durable Executive
write.
