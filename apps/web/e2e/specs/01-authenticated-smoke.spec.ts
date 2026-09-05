/**
 * First authenticated smoke.
 *
 * Proves one full login through the real UI against the hosted Review deployment,
 * lands in the authenticated shell, and confirms the tenant context is this run's
 * own company. Storage state is captured afterwards so later specs can reuse the
 * session instead of re-logging in.
 *
 * This is deliberately not the MVP golden path — it is the foundation the golden
 * path will stand on.
 */

import { existsSync, readFileSync } from "node:fs"

import { expect, test } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi } from "../auth/login"
import { readManifest, storageStatePath } from "../helpers/run-context"

const manifest = readManifest()

function user(role: "admin" | "manager" | "employee") {
  const found = manifest.users.find((candidate) => candidate.role === role)
  if (!found) throw new Error(`E2E_FIXTURE_MISSING_ROLE: ${role}`)
  return found
}

test.describe("authenticated Review smoke", () => {
  test("synthetic admin logs in through the real UI and reaches its own tenant", async ({
    page,
  }) => {
    const admin = user("admin")

    await loginThroughUi(page, admin)

    await expect(page).toHaveURL(/\/app(\/|$)/)
    await expectAuthenticatedShell(page)

    // Tenant context must be this run's company, not any pre-existing Review data.
    await expect(page.getByText(manifest.companyName ?? "__unset__")).toBeVisible()

    // Reusable session for later specs. Captured from a genuine login; never forged.
    await page.context().storageState({ path: storageStatePath("admin") })
    expect(existsSync(storageStatePath("admin"))).toBe(true)
  })

  test("captured storage state carries a session and no service-role material", async () => {
    const raw = readFileSync(storageStatePath("admin"), "utf8")

    // A real Supabase session was persisted by the browser.
    expect(raw).toMatch(/sb-[a-z0-9]+-auth-token|access_token/)

    // Nothing privileged may ever reach a browser-side store.
    expect(raw).not.toContain("service_role")
    expect(raw).not.toMatch(/sb_secret_/)
    expect(raw).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
  })

  test("session boundary: signing out returns to login and re-guards /app", async ({ page }) => {
    await loginThroughUi(page, user("admin"))
    await expectAuthenticatedShell(page)

    const logout = page.getByRole("button", { name: /sair|logout|encerrar/i })
    test.skip((await logout.count()) === 0, "no logout control found in the current shell")

    await logout.first().click()
    await page.waitForURL(/\/login(\?|$)/, { timeout: 30_000 })

    await page.goto("/app")
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })
})
