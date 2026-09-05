/**
 * E2E-1 spec 02 — authentication and first-access onboarding, end to end.
 *
 * This is the slice's golden path and the only place tenant B is created. The
 * company is created by the **browser**, through the real two-step wizard, the
 * real `createCompanyAction` server action and the real
 * `create_company_with_owner` RPC. No privileged client creates it; the
 * privileged client only bootstrapped the identity, and later only *reads back*
 * the resulting ids so the ownership journal can delete them.
 *
 * ## Why this suite is serial, deliberately
 *
 * Tenant B does not exist until this file has run, and spec 04 needs it. That is
 * a real journey dependency, not an accident of file ordering, so it is made
 * explicit here (`mode: "serial"`, `workers: 1` in the config) rather than left
 * to luck. The state the specs share is the **ownership journal on disk**, not an
 * in-memory global: it survives a crash, a new worker and a new process, and it
 * is the same file teardown deletes from.
 */

import { expect, test } from "@playwright/test"

import { expectTenantContext, loginExpectingOnboarding } from "../auth/login"
import { resolveAndJournalOnboardingTenant } from "../fixtures/onboarding-tenant"
import { readJournal } from "../helpers/journal"
import { readManifest, storageStatePath, type RunManifest } from "../helpers/run-context"

test.describe.configure({ mode: "serial" })

let cached: RunManifest | null = null
function manifest(): RunManifest {
  if (!cached) cached = readManifest()
  return cached
}

function onboardingUser() {
  const found = manifest().users.find((candidate) => candidate.role === "onboarding")
  if (!found) {
    throw new Error(
      "E2E_FIXTURE_MISSING_ROLE: onboarding. Global setup must create one identity " +
        "with no membership; without it the first-access journey cannot be walked.",
    )
  }
  return found
}

/** Distinctive enough to be unmistakable in the UI readback and in evidence. */
function tenantBName(): string {
  return `E2E Onboarding ${manifest().runId}`
}

test.describe("first access: login, onboarding, tenant creation", () => {
  test("the onboarding identity starts with no tenant at all", async () => {
    const user = onboardingUser()

    // The fixture deliberately left this identity unattached. If it had a
    // membership, `create_company_with_owner` would raise USER_ALREADY_HAS_COMPANY
    // and the journey below would be testing an error path, not onboarding.
    expect(user.personId).toBeNull()
    expect(manifest().onboardingCompany).toBeNull()
  })

  test("logging in with no membership lands on first-access onboarding", async ({ page }) => {
    // The redirect is the product's own: /app resolves the tenant, finds none,
    // and sends the user to /onboarding. The test never navigates there directly.
    await loginExpectingOnboarding(page, onboardingUser())

    await expect(page.getByRole("heading", { name: /Configure sua empresa/i })).toBeVisible()
    await expect(page.getByText(/Primeiro acesso/i)).toBeVisible()
  })

  test("completing the real wizard creates the tenant and lands in it", async ({ page }) => {
    const user = onboardingUser()
    const companyName = tenantBName()

    await loginExpectingOnboarding(page, user)

    // Step 1 — identification. The real field, filled the way a person would.
    const nameField = page.locator("#company-name")
    await expect(nameField).toBeVisible()
    await nameField.fill(companyName)

    await page.getByRole("button", { name: /^Continuar$/ }).click()

    // Step 2 — review. The typed name must be echoed back before submission.
    await expect(page.getByText(companyName).first()).toBeVisible()

    // Submit through the real control. This is the mutation: server action →
    // create_company_with_owner → company + owner membership + owner person.
    await Promise.all([
      page.waitForURL(/\/app(\/|$)/, { timeout: 60_000 }),
      page.getByRole("button", { name: /Criar empresa e continuar/i }).click(),
    ])

    // THE ONBOARDING PROOF: the application itself, through its own UI, shows the
    // new tenant as the current one. Not a database read — the rendered page.
    await expectTenantContext(page, companyName)

    // Accounting only, and only now that the mutation has certainly happened:
    // resolve the ids the run must be able to delete, and journal them.
    // This is NOT the evidence that onboarding worked; the assertion above is.
    const journal = readJournal()
    if (!journal) throw new Error("E2E_JOURNAL_MISSING: cannot take ownership of tenant B.")

    const tenant = await resolveAndJournalOnboardingTenant(journal, user.userId)

    expect(tenant.companyName).toBe(companyName)
    expect(tenant.ownerUserId).toBe(user.userId)
    expect(tenant.ownerPersonId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )

    // Captured from a genuine post-onboarding session, never forged. Spec 03
    // reopens it in a brand-new browser context.
    await page.context().storageState({ path: storageStatePath("onboarding") })
  })
})
