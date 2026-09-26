/**
 * Development interaction contract — shared by every journey that touches a PDI.
 *
 * These are not conveniences. Each one encodes a precondition of the product that
 * a spec cannot skip, and each was learned from a failed hosted run:
 *
 *   260921164722-a2b764  a goal button that existed inside a collapsed <details>
 *   260921184137-70e10c  an action title resolved 33 times, reported hidden
 *   260925143012-cc25e5  a portal dialog queried without clicking its trigger
 *   260925153205-e99eb4  "Iniciar ação" clicked while the goal was collapsed
 *
 * Spec 15 encoded them locally and passed; spec 17 re-derived them and burned four
 * runs. They live here so the next journey starts correct instead of rediscovering
 * the same four facts.
 */

import { expect, type Locator, type Page } from "@playwright/test"

import { developmentCompetencyName } from "../fixtures/development-fixture"

/**
 * Open a portal dialog through its trigger.
 *
 * The dialog is a child of <body>, never of the scope that owns the trigger, so it
 * is always looked up from the page. Querying it before the click finds nothing:
 * the portal mounts no content until then.
 */
export async function openDialog(
  scope: Page | Locator,
  trigger: string | RegExp,
): Promise<Locator> {
  await scope.getByRole("button", { name: trigger, exact: true }).first().click()
  const page = "page" in scope ? scope.page() : scope
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  return dialog
}

/**
 * Expand a goal's native <details> disclosure.
 *
 * The page never renders one with `open`, so every server render collapses them.
 * <details> keeps its children in the DOM while closed, so they are present but
 * not visible — which is why a button that genuinely existed timed out on a page
 * whose goal had been created successfully.
 *
 * Expansion is a real precondition of the product, not a workaround. Idempotent on
 * purpose: whether a re-render preserves the open state is a detail of React
 * reconciliation no spec should depend on either way.
 */
export async function expandGoal(page: Page, competencyName: string): Promise<Locator> {
  const goal = page.locator("details").filter({ hasText: competencyName })
  await expect(goal).toBeVisible({ timeout: 30_000 })
  if (!(await goal.evaluate((element: HTMLDetailsElement) => element.open))) {
    await goal.locator("summary").click()
  }
  await expect(goal).toHaveJSProperty("open", true)
  return goal
}

/**
 * Scope to one action's card.
 *
 * The plan page renders actions as nested `div` cards — there is no table and no
 * `row` role anywhere on it, so row-based scoping silently matches nothing and
 * every per-action click degrades into a timeout.
 *
 * `.last()` is load-bearing: `filter` also matches any ancestor card that contains
 * the title, and in document order the innermost match comes last.
 */
export function actionCard(page: Page, title: string): Locator {
  return page
    .locator("div.rounded-lg.border.border-slate-200.bg-white")
    .filter({ hasText: title })
    .last()
}

/**
 * Expand the run's goal on the PLAN page.
 *
 * The plan nests a goal's actions in the same native <details> the template page
 * uses, and likewise never renders it `open`. So every action on a plan — reading
 * its title, starting it, completing it, skipping it — has the same precondition,
 * and every server render and every `reload()` closes it again. Call this before
 * each interaction rather than once per test.
 */
export async function openPlanGoal(page: Page, runId: string): Promise<Locator> {
  return expandGoal(page, developmentCompetencyName(runId))
}
