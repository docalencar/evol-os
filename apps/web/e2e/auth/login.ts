/**
 * Real UI login — the authentication proof.
 *
 * Drives the hosted `/login` form exactly as a person would: type e-mail, type
 * password, submit, let Supabase password auth run in the browser, follow the
 * app's own redirect into the authenticated shell.
 *
 * Session tokens are never injected into storage. Storage state is *captured*
 * after a genuine login, never fabricated.
 */

import { expect, type Page } from "@playwright/test"

import type { SyntheticUser } from "../helpers/run-context"

/** Stable marker rendered by the dashboard header's tenant switcher. */
export const TENANT_CONTEXT_LABEL = "Empresa atual"

/**
 * Submit the real login form and wait until the app has left `/login`.
 *
 * Where it lands is deliberately NOT asserted here: a user with a tenant reaches
 * `/app`, while a user with no membership is sent on to `/onboarding`. Both are
 * correct product behaviour, and baking `/app` into the shared helper would have
 * made the first-access journey untestable.
 */
export async function submitLoginForm(page: Page, user: SyntheticUser): Promise<void> {
  await page.goto("/login")

  await expect(page.getByRole("heading", { name: /Entrar na Evol/i })).toBeVisible()

  await page.locator("#email").fill(user.email)
  // Filled, never logged. Playwright masks nothing automatically, so the password
  // must not appear in any assertion message or console output.
  await page.locator("#password").fill(user.password)

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 }),
    page.getByRole("button", { name: /^Entrar$/ }).click(),
  ])
}

/** Log in as a user that already has a tenant, and wait for the dashboard. */
export async function loginThroughUi(page: Page, user: SyntheticUser): Promise<void> {
  await submitLoginForm(page, user)

  // `/auth/continue` resolves any pending invitation and otherwise lands on /app.
  await page.waitForURL(/\/app(\/|$)/, { timeout: 30_000 })
}

/** End the current browser session through the product and prove the login boundary. */
export async function signOutThroughUi(page: Page): Promise<void> {
  await Promise.all([
    page.waitForURL(/\/login(\?|$)/, { timeout: 30_000 }),
    page.getByRole("button", { name: /^Sair$/ }).click(),
  ])

  await expect(page.getByRole("heading", { name: /Entrar na Evol/i })).toBeVisible()
}

/**
 * Log in as a user with no membership and wait for the app's own redirect into
 * first-access onboarding. The redirect is the product's, not the test's: `/app`
 * resolves the tenant, fails to find one, and sends the user to `/onboarding`.
 */
export async function loginExpectingOnboarding(page: Page, user: SyntheticUser): Promise<void> {
  await submitLoginForm(page, user)
  await page.waitForURL(/\/onboarding(\/|\?|$)/, { timeout: 30_000 })
}

/** The company name the dashboard header shows for the resolved tenant. */
export async function expectTenantContext(page: Page, companyName: string): Promise<void> {
  await expect(page.getByText(TENANT_CONTEXT_LABEL)).toBeVisible()
  await expect(page.getByText(companyName, { exact: false }).first()).toBeVisible()
}

export async function expectAuthenticatedShell(page: Page): Promise<void> {
  await expect(page.getByText(TENANT_CONTEXT_LABEL)).toBeVisible()
}
