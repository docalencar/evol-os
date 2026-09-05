/**
 * E2E-1 spec 04 — tenant isolation, asserted through the user-facing boundary.
 *
 * Tenant A is the fixture tenant; tenant B is the company the onboarding journey
 * created in spec 02. Tenant A's admin, authenticated through the real login UI,
 * asks the application for a person that belongs to tenant B.
 *
 * ## What makes this a security assertion rather than a smoke test
 *
 * The privileged client supplies exactly one thing: the target UUID. It performs
 * no part of the assertion. Every claim below is read out of a real authenticated
 * browser session, because a denial proven with a service-role client proves
 * nothing about what a user can reach.
 *
 * ## Non-oracular
 *
 * A denial that *looks different* from "this does not exist" is itself a leak: it
 * confirms the id is real and belongs to someone. So the test does not merely
 * check that access fails — it checks that the outcome for a **real foreign
 * person** is indistinguishable from the outcome for a **random UUID that exists
 * nowhere**. Both must land in the same place, and neither may reveal anything
 * about the other tenant.
 *
 * Nothing sensitive about tenant B is asserted or logged: the test asserts the
 * *absence* of its name, never the presence of any of its data.
 */

import { randomUUID } from "node:crypto"

import { expect, test, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi } from "../auth/login"
import { resolveOwnerPersonId } from "../fixtures/onboarding-tenant"
import { readManifest, type RunManifest } from "../helpers/run-context"

test.describe.configure({ mode: "serial" })

let cached: RunManifest | null = null
function manifest(): RunManifest {
  if (!cached) cached = readManifest()
  return cached
}

function tenantAAdmin() {
  const found = manifest().users.find((candidate) => candidate.role === "admin")
  if (!found) throw new Error("E2E_FIXTURE_MISSING_ROLE: admin")
  return found
}

function tenantB() {
  const tenant = manifest().onboardingCompany
  if (!tenant) {
    throw new Error(
      "E2E_TENANT_B_MISSING: isolation cannot be proven with only one tenant. " +
        "Spec 02 must complete first.",
    )
  }
  return tenant
}

/** Where the app ends up when tenant A's admin asks for a person id. */
async function outcomeForPersonId(page: Page, personId: string): Promise<string> {
  await page.goto(`/app/people/${personId}`)
  await page.waitForLoadState("networkidle")
  return new URL(page.url()).pathname
}

test.describe("cross-tenant denial", () => {
  test("tenant A's admin cannot reach a tenant B person, and learns nothing about it", async ({
    page,
  }) => {
    const foreignPersonId = await resolveOwnerPersonId(
      tenantB().companyId,
      tenantB().ownerUserId,
    )

    // A real session for tenant A. From here on, no privileged client is involved.
    await loginThroughUi(page, tenantAAdmin())
    await expectAuthenticatedShell(page)

    const foreignOutcome = await outcomeForPersonId(page, foreignPersonId)

    // Denied: the app refused to open the foreign profile and put the user back
    // on their own people list.
    expect(foreignOutcome).toBe("/app/people")

    const body = page.locator("body")

    // No foreign identity leaks onto the page the user did land on.
    await expect(body).not.toContainText(tenantB().companyName)
    await expect(page.getByText(foreignPersonId)).toHaveCount(0)

    // Still inside tenant A, still authenticated — denial, not a session drop.
    await expect(page).not.toHaveURL(/\/login(\?|$)/)
    await expect(page.getByText(manifest().companyName ?? "__unset__").first()).toBeVisible()
  })

  test("the denial is indistinguishable from a person that does not exist", async ({ page }) => {
    const foreignPersonId = await resolveOwnerPersonId(
      tenantB().companyId,
      tenantB().ownerUserId,
    )
    // Exists in no tenant at all. Generated locally; never written anywhere.
    const nonexistentPersonId = randomUUID()

    await loginThroughUi(page, tenantAAdmin())

    const foreignOutcome = await outcomeForPersonId(page, foreignPersonId)
    const nonexistentOutcome = await outcomeForPersonId(page, nonexistentPersonId)

    // The oracle test. If a real-but-foreign id behaved differently from a
    // fictional one, the application would be confirming which ids are real.
    expect(foreignOutcome).toBe(nonexistentOutcome)
    expect(foreignOutcome).toBe("/app/people")
  })

  test("tenant A's people list never contains tenant B's owner", async ({ page }) => {
    await loginThroughUi(page, tenantAAdmin())

    await page.goto("/app/people")
    await expect(page).toHaveURL(/\/app\/people(\/|\?|$)/)

    // The onboarding identity's display name is a run-scoped synthetic string, so
    // asserting its absence cannot collide with unrelated Review data.
    const foreignOwnerName =
      manifest().users.find((user) => user.role === "onboarding")?.fullName ?? "__unset__"

    await expect(page.locator("body")).not.toContainText(foreignOwnerName)
    await expect(page.locator("body")).not.toContainText(tenantB().companyName)
  })
})
