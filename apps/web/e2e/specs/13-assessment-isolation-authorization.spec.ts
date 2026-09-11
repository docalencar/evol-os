/** E2E-4 properties 13-14: assessment tenant isolation and cycle authorization. */

import { expect, test, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi, signOutThroughUi } from "../auth/login"
import {
  assessmentCycleName,
  assessmentResultCycleName,
  assessmentTemplateName,
} from "../helpers/org-journey-names"
import { readManifest, type RunManifest } from "../helpers/run-context"

test.describe.configure({ mode: "serial" })

const NONEXISTENT_ID = "00000000-0000-4000-8000-000000000001"
const ASSESSMENTS_HOME_SECTION = "Meus resultados"

let cached: RunManifest | null = null
function manifest(): RunManifest {
  if (!cached) cached = readManifest()
  return cached
}

function actor(role: "admin" | "employee") {
  const found = manifest().users.find((candidate) => candidate.role === role)
  if (!found) throw new Error(`E2E_FIXTURE_MISSING_ROLE: ${role}`)
  return found
}

function tenantBOwner() {
  const tenant = manifest().onboardingCompany
  if (!tenant) throw new Error("E2E_TENANT_B_MISSING")
  const found = manifest().users.find((candidate) => candidate.userId === tenant.ownerUserId)
  if (!found) throw new Error("E2E_TENANT_B_OWNER_MISSING")
  return found
}

async function enterAs(page: Page, identity: ReturnType<typeof actor>): Promise<void> {
  await loginThroughUi(page, identity)
  await expectAuthenticatedShell(page)
}

async function enterTenantB(page: Page): Promise<void> {
  await loginThroughUi(page, tenantBOwner())
  await expectAuthenticatedShell(page)
  await expect(page.getByText(manifest().onboardingCompany?.companyName ?? "__unset__").first()).toBeVisible()
}

async function switchToActor(
  page: Page,
  identity: ReturnType<typeof actor> | ReturnType<typeof tenantBOwner>
): Promise<void> {
  await signOutThroughUi(page)
  await loginThroughUi(page, identity)
  await expectAuthenticatedShell(page)
}

async function switchToTenantB(page: Page): Promise<void> {
  await switchToActor(page, tenantBOwner())
  await expect(page.getByText(manifest().onboardingCompany?.companyName ?? "__unset__").first()).toBeVisible()
}

async function openAssessmentsHome(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Avaliações" }).click()
  await page.waitForURL(/\/app\/assessments(\?|$)/, { timeout: 30_000 })
  await expect(page.getByRole("heading", { level: 2, name: ASSESSMENTS_HOME_SECTION })).toBeVisible({
    timeout: 30_000,
  })
}

function idFromHref(href: string | null, kind: "templates" | "cycles" | "responses"): string {
  const id = href?.match(new RegExp(`/app/assessments/${kind}/([0-9a-f-]{36})`))?.[1]
  if (!id) throw new Error(`E2E_ASSESSMENT_${kind.toUpperCase()}_ID_MISSING`)
  return id
}

async function discoverRunResourceId(
  page: Page,
  kind: "templates" | "cycles",
  name: string
): Promise<string> {
  await enterAs(page, actor("admin"))
  await openAssessmentsHome(page)
  return idFromHref(await page.getByRole("link", { name }).getAttribute("href"), kind)
}

async function discoverRunResponseId(page: Page): Promise<string> {
  await enterAs(page, actor("admin"))
  await openAssessmentsHome(page)
  await page.getByRole("link", { name: assessmentResultCycleName(manifest().runId) }).click()
  await page.waitForURL(/\/app\/assessments\/cycles\/[0-9a-f-]{36}(\?|$)/, { timeout: 30_000 })
  await expect(
    page.getByRole("heading", { level: 1, name: assessmentResultCycleName(manifest().runId) })
  ).toBeVisible({ timeout: 30_000 })
  const row = page.getByRole("row", { name: new RegExp(actor("employee").fullName) }).first()
  return idFromHref(await row.getByRole("link", { name: "Abrir" }).getAttribute("href"), "responses")
}

type DenialOutcome = Readonly<{ route: string; body: string }>

/** Direct URL construction is intentional here: the URL itself is the security probe. */
async function probeDirectResourceDenial(
  page: Page,
  kind: "templates" | "cycles" | "responses",
  id: string
): Promise<DenialOutcome> {
  await page.goto(`/app/assessments/${kind}/${id}`)
  await page.waitForLoadState("networkidle")
  return {
    route: new URL(page.url()).pathname.replace(id, ":resource-id"),
    body: await page.locator("body").innerText(),
  }
}

function expectIndistinguishableDenial(
  foreign: DenialOutcome,
  nonexistent: DenialOutcome,
  secrets: string[]
): void {
  expect(foreign.route).toBe(nonexistent.route)
  expect(foreign.body).toBe(nonexistent.body)
  for (const secret of secrets) expect(foreign.body).not.toContain(secret)
}

test.describe("assessment isolation and authorization", () => {
  test("53. tenant B assessment surfaces do not reveal tenant A", async ({ page }) => {
    await enterTenantB(page)
    await openAssessmentsHome(page)

    const body = page.locator("body")
    for (const secret of [
      assessmentTemplateName(manifest().runId),
      assessmentCycleName(manifest().runId),
      assessmentResultCycleName(manifest().runId),
      manifest().companyName ?? "__unset__",
    ]) {
      await expect(body).not.toContainText(secret)
    }
  })

  test("54. foreign template id is indistinguishable from nonexistent", async ({ page }) => {
    const foreignId = await discoverRunResourceId(
      page,
      "templates",
      assessmentTemplateName(manifest().runId)
    )
    await switchToTenantB(page)

    const foreign = await probeDirectResourceDenial(page, "templates", foreignId)
    const nonexistent = await probeDirectResourceDenial(page, "templates", NONEXISTENT_ID)
    expectIndistinguishableDenial(foreign, nonexistent, [
      assessmentTemplateName(manifest().runId),
      foreignId,
    ])
  })

  test("55. foreign cycle id is indistinguishable from nonexistent", async ({ page }) => {
    const foreignId = await discoverRunResourceId(
      page,
      "cycles",
      assessmentResultCycleName(manifest().runId)
    )
    await switchToTenantB(page)

    const foreign = await probeDirectResourceDenial(page, "cycles", foreignId)
    const nonexistent = await probeDirectResourceDenial(page, "cycles", NONEXISTENT_ID)
    expectIndistinguishableDenial(foreign, nonexistent, [
      assessmentResultCycleName(manifest().runId),
      foreignId,
      "Adicionar participantes",
      "Gerar avaliações",
    ])
  })

  test("56. foreign response/result id is indistinguishable from nonexistent", async ({ page }) => {
    const foreignId = await discoverRunResponseId(page)
    await switchToTenantB(page)

    const foreign = await probeDirectResourceDenial(page, "responses", foreignId)
    const nonexistent = await probeDirectResourceDenial(page, "responses", NONEXISTENT_ID)
    expectIndistinguishableDenial(foreign, nonexistent, [
      assessmentResultCycleName(manifest().runId),
      actor("employee").fullName,
      foreignId,
    ])
  })

  test("57. employee cannot obtain the cycle administrative surface", async ({ page }) => {
    const cycleId = await discoverRunResourceId(
      page,
      "cycles",
      assessmentResultCycleName(manifest().runId)
    )
    await switchToActor(page, actor("employee"))
    await openAssessmentsHome(page)

    await expect(page.getByRole("heading", { level: 2, name: ASSESSMENTS_HOME_SECTION })).toBeVisible()
    await expect(page.getByRole("button", { name: "Nova avaliação", exact: true })).toHaveCount(0)

    const denied = await probeDirectResourceDenial(page, "cycles", cycleId)
    for (const forbidden of [
      assessmentResultCycleName(manifest().runId),
      "Adicionar participantes",
      "Gerar avaliações",
      "Editar ciclo de avaliação",
    ]) {
      expect(denied.body).not.toContain(forbidden)
    }
    expect(denied.route).toBe("/app/assessments/cycles/:resource-id")
  })
})
