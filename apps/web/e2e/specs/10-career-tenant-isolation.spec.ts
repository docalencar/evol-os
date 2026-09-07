/**
 * E2E-3 spec 10 — the Career/Competency configuration is confined to its tenant.
 *
 * Specs 08 and 09 built a Competency, a Seniority, a contextual expectation and
 * a derived person gap inside tenant A. This spec logs in as tenant B and shows
 * that none of it is reachable, and — the part that actually matters — that a
 * real-but-foreign id is indistinguishable from an id that exists nowhere.
 *
 * ## Why indistinguishability is the claim
 *
 * A denial that differs between "exists but is not yours" and "does not exist"
 * is an existence oracle. Someone holding a list of UUIDs could sort them into
 * real and fake, and a competitor's org chart is exactly the kind of thing that
 * makes worth doing. So the test does not assert a particular status or prose —
 * it asserts that the two cases produce the same observable outcome.
 *
 * ## Why Position is the direct-route target
 *
 * Competency and Seniority have list surfaces only — there is no
 * `/app/competencies/[id]` and no `/app/company/seniority/[id]` in the route
 * tree — so for those two the honest proof is exact absence from tenant B's own
 * lists. Position is the one Career surface with a detail route, and its
 * not-found path redirects to `/app/company/positions`, which exists. (The
 * departments equivalent redirects to a route that does not exist; spec 07
 * documents that as a separate non-blocking bug, and this slice deliberately
 * does not inherit it.)
 *
 * ## Scope
 *
 * Isolation only. No gap arithmetic is re-proven here — spec 09 owns that — and
 * the legacy sign-inverted talent cards are never an assertion target.
 */

import { randomUUID } from "node:crypto"

import { expect, test, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi } from "../auth/login"
import { positionId } from "../fixtures/organization-lookup"
import {
  competencyName,
  positionName,
  seniorityCode,
  seniorityLabel,
} from "../helpers/org-journey-names"
import { readManifest, type RunManifest } from "../helpers/run-context"

test.describe.configure({ mode: "serial" })

let cached: RunManifest | null = null
function manifest(): RunManifest {
  if (!cached) cached = readManifest()
  return cached
}

function tenantACompanyId(): string {
  const id = manifest().companyId
  if (!id) throw new Error("E2E_TENANT_A_MISSING: the fixture tenant was not recorded.")
  return id
}

/** Tenant B's owner — the identity that walked the onboarding journey in spec 02. */
function tenantBOwner() {
  const tenant = manifest().onboardingCompany
  if (!tenant) {
    throw new Error(
      "E2E_TENANT_B_MISSING: isolation needs two tenants. Spec 02 must complete first.",
    )
  }
  const user = manifest().users.find((candidate) => candidate.userId === tenant.ownerUserId)
  if (!user) throw new Error("E2E_TENANT_B_OWNER_MISSING")
  return user
}

async function enterTenantB(page: Page): Promise<void> {
  await loginThroughUi(page, tenantBOwner())
  await expectAuthenticatedShell(page)
}

/** What tenant B observes when asking for a position id by direct URL. */
type Outcome = Readonly<{ pathname: string; body: string }>

async function outcomeForPositionId(page: Page, id: string): Promise<Outcome> {
  await page.goto(`/app/company/positions/${id}`)
  await page.waitForLoadState("networkidle")
  return {
    pathname: new URL(page.url()).pathname,
    body: (await page.locator("body").innerText()) ?? "",
  }
}

test.describe("career and competency data are confined to their tenant", () => {
  test("tenant B's competency catalog shows none of tenant A's competencies", async ({
    page,
  }) => {
    const runId = manifest().runId

    await enterTenantB(page)

    await page.getByRole("link", { name: "Competências" }).click()
    await page.waitForURL(/\/app\/competencies(\/|\?|$)/, { timeout: 30_000 })

    // Exact foreign-item absence, not an empty list: tenant B legitimately has
    // its own catalog, and asserting emptiness would break the moment it does.
    await expect(page.locator("body")).not.toContainText(competencyName(runId))
    await expect(page.locator("body")).not.toContainText(manifest().companyName ?? "__unset__")
  })

  test("tenant B's seniority catalog shows none of tenant A's seniorities", async ({
    page,
  }) => {
    const runId = manifest().runId

    await enterTenantB(page)

    await page.getByRole("link", { name: "Empresa" }).click()
    await page.waitForURL(/\/app\/company(\/|\?|$)/, { timeout: 30_000 })

    await page.getByRole("link", { name: /Gerenciar senioridades/i }).click()
    await page.waitForURL(/\/app\/company\/seniority(\/|\?|$)/, { timeout: 30_000 })

    // Both halves of the catalog identity: the display label and the short code
    // are stored and rendered separately, so each is checked.
    await expect(page.locator("body")).not.toContainText(seniorityLabel(runId))
    await expect(page.locator("body")).not.toContainText(seniorityCode(runId))
  })

  test("a foreign Position id is indistinguishable from one that does not exist", async ({
    page,
  }) => {
    const runId = manifest().runId
    const foreignId = await positionId(tenantACompanyId(), positionName(runId))
    const nonexistentId = randomUUID()

    await enterTenantB(page)

    const foreign = await outcomeForPositionId(page, foreignId)
    const nonexistent = await outcomeForPositionId(page, nonexistentId)

    // The oracle test. A real-but-foreign id must not land anywhere different
    // from an id that exists in no tenant at all.
    expect(foreign.pathname).toBe(nonexistent.pathname)

    // Neither may leave tenant B holding the detail route for a resource it
    // cannot see.
    expect(foreign.pathname).not.toBe(`/app/company/positions/${foreignId}`)

    // Nothing of tenant A's Career/Competency configuration may surface, and the
    // id itself must not be echoed back as confirmation that it was recognised.
    for (const secret of [
      positionName(runId),
      competencyName(runId),
      seniorityLabel(runId),
      seniorityCode(runId),
      manifest().companyName ?? "__unset__",
      foreignId,
    ]) {
      expect(foreign.body).not.toContain(secret)
    }

    // Denial, not a logout: being bounced to the login form would be a different
    // failure wearing the same clothes.
    await expect(page).not.toHaveURL(/\/login(\?|$)/)
  })
})
