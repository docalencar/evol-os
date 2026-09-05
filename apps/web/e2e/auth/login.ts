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

export async function loginThroughUi(page: Page, user: SyntheticUser): Promise<void> {
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

  // `/auth/continue` resolves any pending invitation and otherwise lands on /app.
  await page.waitForURL(/\/app(\/|$)/, { timeout: 30_000 })
}

export async function expectAuthenticatedShell(page: Page): Promise<void> {
  await expect(page.getByText(TENANT_CONTEXT_LABEL)).toBeVisible()
}
