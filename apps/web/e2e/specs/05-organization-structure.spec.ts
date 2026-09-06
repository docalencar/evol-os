/**
 * E2E-2 spec 05 — building the organizational structure through the real UI.
 *
 * Department, then Position (linked to that Department), then Team. Each one is
 * created by driving the product's own dialog or wizard: the privileged client
 * creates none of them, because these three capabilities are precisely what this
 * spec exists to prove. Pre-seeding them through a fixture would leave the test
 * asserting its own setup.
 *
 * ## Navigation is part of the proof
 *
 * The journey reaches Positions and Teams through the company hub's own links,
 * not through `page.goto`. Departments have no list route of their own — they
 * live inline on `/app/company` — so how a user actually gets to each surface is
 * itself a claim worth testing. Direct URLs appear in this slice only in spec 07,
 * where the URL *is* the boundary being tested.
 *
 * ## Serial, deliberately
 *
 * The Position must be linked to a Department that exists, and spec 06 needs all
 * three. That is a real journey dependency, not an accident of file ordering, so
 * it is declared rather than left to luck. Shared state is the run manifest on
 * disk — the same file teardown reads — never an in-memory global.
 */

import { expect, test, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi } from "../auth/login"
import {
  departmentName,
  positionName,
  teamName,
} from "../helpers/org-journey-names"
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

/** Enter tenant A through the real login form and land in the dashboard. */
async function enterTenantA(page: Page): Promise<void> {
  await loginThroughUi(page, tenantAAdmin())
  await expectAuthenticatedShell(page)
}

/** Reach the company hub the way a user does: the sidebar. */
async function openCompanyHub(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Empresa" }).click()
  await page.waitForURL(/\/app\/company(\/|\?|$)/, { timeout: 30_000 })
  await expect(page.getByRole("heading", { name: /Departamentos/i }).first()).toBeVisible()
}

test.describe("organization structure built through the real UI", () => {
  test("a Department is created from the company hub and read back in its table", async ({
    page,
  }) => {
    const name = departmentName(manifest().runId)

    await enterTenantA(page)
    await openCompanyHub(page)

    await page.getByRole("button", { name: "Novo Departamento" }).click()

    // The dialog is not dismissible, so its presence is a reliable gate.
    await expect(page.getByRole("heading", { name: "Novo departamento" })).toBeVisible()

    await page.locator("#name").fill(name)
    await page.getByRole("button", { name: "Criar departamento" }).click()

    // Durable readback through the product's own table, not a database read.
    // `revalidatePath("/app/company")` is what makes this appear.
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 30_000 })
  })

  test("a Position is created through the wizard and linked to that Department", async ({
    page,
  }) => {
    const department = departmentName(manifest().runId)
    const position = positionName(manifest().runId)

    await enterTenantA(page)
    await openCompanyHub(page)

    // Real navigation: the hub's own link, not a goto.
    await page.getByRole("link", { name: /Gerenciar cargos/i }).click()
    await page.waitForURL(/\/app\/company\/positions(\/|\?|$)/, { timeout: 30_000 })

    await page.getByRole("button", { name: "Novo cargo" }).click()

    // The wizard renders ONLY the active step's fields — inactive steps are not
    // in the DOM at all — so each step must be completed before the next appears.
    // Step 1: identification.
    await expect(page.locator("#position-name")).toBeVisible()
    await page.locator("#position-name").fill(position)
    await page.getByRole("button", { name: /^Continuar$/ }).click()

    // Step 2: organization. This is the link the journey is really proving.
    await expect(page.locator("#position-department")).toBeVisible()
    await page.locator("#position-department").selectOption({ label: department })
    await page.getByRole("button", { name: /^Continuar$/ }).click()

    // Step 3: work arrangement — every field is pre-filled with a valid default.
    await expect(page.locator("#position-weekly-workload")).toBeVisible()
    await page.getByRole("button", { name: /^Continuar$/ }).click()

    // Step 4: seniorities — optional, and the catalog may legitimately be empty.
    await page.getByRole("button", { name: /^Continuar$/ }).click()

    // Step 5: review, then the real mutation.
    await page.getByRole("button", { name: "Criar cargo" }).click()

    await expect(page.getByText(position, { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })
  })

  test("a Team is created once its department options have finished loading", async ({
    page,
  }) => {
    const team = teamName(manifest().runId)

    await enterTenantA(page)
    await openCompanyHub(page)

    await page.getByRole("link", { name: /Gerenciar times/i }).click()
    await page.waitForURL(/\/app\/company\/teams(\/|\?|$)/, { timeout: 30_000 })

    await page.getByRole("button", { name: "Novo time" }).click()
    await expect(page.getByRole("heading", { name: "Novo time" })).toBeVisible()

    await page.locator("#name").fill(team)

    // The team form loads its departments client-side through a server action and
    // disables both the select and the submit while that is in flight. Waiting
    // for the control to become enabled is a functional wait on real state — no
    // arbitrary sleep, and no risk of submitting a half-built form.
    await expect(page.locator("#departmentId")).toBeEnabled({ timeout: 30_000 })

    const submit = page.getByRole("button", { name: "Criar time" })
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(page.getByText(team, { exact: true }).first()).toBeVisible({ timeout: 30_000 })
  })

  test("all three entities survive a fresh load of their own surfaces", async ({ page }) => {
    const runId = manifest().runId

    await enterTenantA(page)
    await openCompanyHub(page)
    await expect(page.getByText(departmentName(runId), { exact: true }).first()).toBeVisible()

    await page.getByRole("link", { name: /Gerenciar cargos/i }).click()
    await page.waitForURL(/\/app\/company\/positions(\/|\?|$)/)
    await expect(page.getByText(positionName(runId), { exact: true }).first()).toBeVisible()

    await page.goBack()
    await page.getByRole("link", { name: /Gerenciar times/i }).click()
    await page.waitForURL(/\/app\/company\/teams(\/|\?|$)/)
    await expect(page.getByText(teamName(runId), { exact: true }).first()).toBeVisible()
  })
})
