/**
 * E2E-2 spec 06 — a person, linked to the structure spec 05 built.
 *
 * The person is created through the real four-step wizard at `/app/people/new`,
 * selecting the Position and Team this run created, and the linkage is then read
 * back from the product's own profile UI.
 *
 * ## Department is derived, not entered
 *
 * `people` has no `department_id` column and the People UI never collects one.
 * A person's department comes from `person -> position -> department`, which is
 * exactly why spec 05 had to link the Position to the Department first. The
 * "Organização" card on the profile is the only place "Departamento" appears
 * anywhere in the People UI, so it is the readback anchor here.
 *
 * The People *list* deliberately has no Departamento column — asserting one would
 * be inventing a product surface that does not exist.
 *
 * ## Audit side effects are expected
 *
 * Opening a person profile reaches `read_assessment_administratively`, which
 * appends an immutable `activity_events` row before it checks anything. That is
 * the domain behaving as designed. Nothing here mocks, disables, deletes or works
 * around it; the journey lives with it, and teardown classifies the consequence.
 */

import { expect, test, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi } from "../auth/login"
import {
  departmentName,
  personName,
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

/**
 * Read one row of the profile's "Organização" card.
 *
 * The card renders label and value as sibling spans inside a flex row, so the
 * value is located relative to its label rather than by position in the list —
 * a fragile index would silently start asserting the wrong field the moment the
 * card gains a row.
 */
function organizationValue(page: Page, label: string) {
  return page
    .locator("div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .last()
}

async function expectOrganizationRow(page: Page, label: string, value: string): Promise<void> {
  const row = organizationValue(page, label)
  await expect(row, `Organização card should show ${label} = ${value}`).toContainText(value)
}

async function openPersonProfile(page: Page, name: string): Promise<void> {
  await page.getByRole("link", { name: "Pessoas" }).click()
  await page.waitForURL(/\/app\/people(\/|\?|$)/, { timeout: 30_000 })

  const row = page.getByRole("row").filter({ hasText: name })
  await expect(row).toHaveCount(1)
  await row.getByRole("link", { name: /Ver perfil/i }).click()

  await page.waitForURL(/\/app\/people\/[0-9a-f-]{36}/, { timeout: 30_000 })
  await expect(page.getByText(name).first()).toBeVisible()
}

test.describe("a person carries the organizational structure this run built", () => {
  test("the wizard creates a person linked to the run's Position and Team", async ({ page }) => {
    const runId = manifest().runId
    const person = personName(runId)

    await loginThroughUi(page, tenantAAdmin())
    await expectAuthenticatedShell(page)

    // Real navigation into People, then into the create surface.
    await page.getByRole("link", { name: "Pessoas" }).click()
    await page.waitForURL(/\/app\/people(\/|\?|$)/, { timeout: 30_000 })

    await page.goto("/app/people/new")
    await expect(page.getByRole("heading", { name: /Adicionar pessoa/i })).toBeVisible()

    // Step 1 — personal. Only the name is required by schema and by SQL.
    await expect(page.locator("#employee-full-name")).toBeVisible()
    await page.locator("#employee-full-name").fill(person)
    await page.getByRole("button", { name: /^Continuar$/ }).click()

    // Step 2 — organization. The linkage this spec exists to prove.
    await expect(page.locator("#employee-team")).toBeVisible()
    await page.locator("#employee-team").selectOption({ label: teamName(runId) })
    await page.locator("#employee-position").selectOption({ label: positionName(runId) })
    await page.getByRole("button", { name: /^Continuar$/ }).click()

    // Step 3 — professional details, all optional.
    await page.getByRole("button", { name: /^Continuar$/ }).click()

    // Step 4 — review, then the real mutation.
    await page.getByRole("button", { name: "Criar colaborador" }).click()

    // The action revalidates /app/people and the form pushes there.
    await page.waitForURL(/\/app\/people(\/|\?|$)/, { timeout: 60_000 })
    await expect(page.getByText(person, { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })
  })

  test("the People list shows Cargo and Time for the new person", async ({ page }) => {
    const runId = manifest().runId

    await loginThroughUi(page, tenantAAdmin())
    await page.getByRole("link", { name: "Pessoas" }).click()
    await page.waitForURL(/\/app\/people(\/|\?|$)/)

    const row = page.getByRole("row").filter({ hasText: personName(runId) })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(positionName(runId))
    await expect(row).toContainText(teamName(runId))

    // Deliberately NOT asserted: a Departamento column. The People list has none,
    // and inventing one would test a surface the product does not have.
  })

  test("the profile's Organização card reads back Departamento, Cargo and Time", async ({
    page,
  }) => {
    const runId = manifest().runId

    await loginThroughUi(page, tenantAAdmin())
    await openPersonProfile(page, personName(runId))

    await expect(page.getByText("Organização", { exact: true }).first()).toBeVisible()

    // Departamento is the derived one: person -> position -> department. Seeing
    // the run's department here proves the whole chain spec 05 built.
    await expectOrganizationRow(page, "Departamento", departmentName(runId))
    await expectOrganizationRow(page, "Cargo", positionName(runId))
    await expectOrganizationRow(page, "Time", teamName(runId))
  })

  test("the linkage survives a reload and a navigation away and back", async ({ page }) => {
    const runId = manifest().runId

    await loginThroughUi(page, tenantAAdmin())
    await openPersonProfile(page, personName(runId))

    const profileUrl = page.url()

    await page.reload()
    await expect(page).toHaveURL(profileUrl)
    await expectOrganizationRow(page, "Departamento", departmentName(runId))
    await expectOrganizationRow(page, "Cargo", positionName(runId))
    await expectOrganizationRow(page, "Time", teamName(runId))

    // Away to another tenant-scoped surface, then back by URL.
    await page.getByRole("link", { name: "Empresa" }).click()
    await page.waitForURL(/\/app\/company(\/|\?|$)/, { timeout: 30_000 })

    await page.goto(profileUrl)
    await expect(page).toHaveURL(profileUrl)
    await expectOrganizationRow(page, "Departamento", departmentName(runId))
    await expectOrganizationRow(page, "Cargo", positionName(runId))
    await expectOrganizationRow(page, "Time", teamName(runId))
  })
})
