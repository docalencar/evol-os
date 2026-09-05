/**
 * E2E-1 spec 03 — the session and the tenant context outlive a page load.
 *
 * Runs against the session captured at the end of spec 02, reopened in a **new
 * browser context**. That is a stronger claim than reloading the page that was
 * already open: it proves the persisted cookies alone are enough to re-enter the
 * tenant, which is what actually happens when the user closes the tab and comes
 * back.
 *
 * What this proves: deterministic tenant *resolution* for a user with exactly one
 * active membership. It does NOT prove tenant switching — the onboarding user has
 * one tenant, the header renders a static label rather than the selector, and no
 * switch is performed. Spec 04 covers the boundary; nothing here should be read
 * as evidence about multi-tenant selection.
 */

import { existsSync } from "node:fs"

import { expect, test } from "@playwright/test"

import { TENANT_CONTEXT_LABEL } from "../auth/login"
import { readManifest, storageStatePath, type RunManifest } from "../helpers/run-context"

test.describe.configure({ mode: "serial" })

let cached: RunManifest | null = null
function manifest(): RunManifest {
  if (!cached) cached = readManifest()
  return cached
}

function tenantB() {
  const tenant = manifest().onboardingCompany
  if (!tenant) {
    throw new Error(
      "E2E_TENANT_B_MISSING: spec 02 must complete the onboarding journey before " +
        "persistence can be proven. This dependency is deliberate and serial.",
    )
  }
  return tenant
}

test.describe("session and tenant context persist", () => {
  test("a brand-new context restored from the saved session re-enters the tenant", async ({
    browser,
  }) => {
    const statePath = storageStatePath("onboarding")
    expect(
      existsSync(statePath),
      "spec 02 must have captured a post-onboarding session",
    ).toBe(true)

    const context = await browser.newContext({ storageState: statePath })
    try {
      const page = await context.newPage()
      await page.goto("/app")

      // Not bounced to /login, and not bounced back to /onboarding either — the
      // membership created through the UI is durable, not a request-scoped effect.
      await expect(page).toHaveURL(/\/app(\/|$)/)
      await expect(page.getByText(TENANT_CONTEXT_LABEL)).toBeVisible()
      await expect(page.getByText(tenantB().companyName).first()).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test("a full reload keeps the session and the same tenant", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath("onboarding") })
    try {
      const page = await context.newPage()
      await page.goto("/app")
      await expect(page.getByText(tenantB().companyName).first()).toBeVisible()

      await page.reload()

      await expect(page).toHaveURL(/\/app(\/|$)/)
      await expect(page.getByText(tenantB().companyName).first()).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test("navigating to another tenant-scoped page and back keeps the same tenant", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: storageStatePath("onboarding") })
    try {
      const page = await context.newPage()

      // `/app/people` is an existing, company-scoped page; nothing was added to
      // the product for this test.
      await page.goto("/app/people")
      await expect(page).toHaveURL(/\/app\/people(\/|\?|$)/)
      await expect(page.getByText(tenantB().companyName).first()).toBeVisible()

      await page.goto("/app")
      await expect(page).toHaveURL(/\/app(\/|$)/)
      await expect(page.getByText(tenantB().companyName).first()).toBeVisible()
    } finally {
      await context.close()
    }
  })
})
