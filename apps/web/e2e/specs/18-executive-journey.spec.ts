/** E-E2E0 — frozen Executive journey for canonical hosted Review. Not run locally. */

import { mkdirSync, renameSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

import { expect, test, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi, signOutThroughUi } from "../auth/login"
import { ensureRunOwnedForeignTenant } from "../fixtures/onboarding-tenant"
import { userClient } from "../helpers/admin-client"
import { readManifest, type RunManifest, type SyntheticRole } from "../helpers/run-context"
import { runEvidenceFile } from "../helpers/run-paths"

test.describe.configure({ mode: "serial" })

const OWNER: SyntheticRole = "admin"
const ADMIN: SyntheticRole = "company_admin"
const HR: SyntheticRole = "hr"
const MANAGER: SyntheticRole = "manager"
const EMPLOYEE: SyntheticRole = "employee"
const FOREIGN: SyntheticRole = "onboarding"

let cached: RunManifest | null = null
let assessmentCycleId = ""
let foreignCompanyId = ""
let foreignOwnerPersonId = ""
let factualEmployeeCount = 0
const steps = new Set<number>()

function manifest(): RunManifest {
  if (!cached) cached = readManifest()
  return cached
}

function actor(role: SyntheticRole) {
  const found = manifest().users.find((candidate) => candidate.role === role)
  if (!found) throw new Error(`E2E_FIXTURE_MISSING_ROLE: ${role}`)
  return found
}

function companyId(): string {
  const id = manifest().companyId
  if (!id) throw new Error("E2E_TENANT_A_MISSING")
  return id
}

async function enterAs(page: Page, role: SyntheticRole): Promise<void> {
  await loginThroughUi(page, actor(role))
  await expectAuthenticatedShell(page)
}

async function switchTo(page: Page, role: SyntheticRole): Promise<void> {
  await signOutThroughUi(page)
  await enterAs(page, role)
}

async function rpc(role: SyntheticRole, name: string, args: Record<string, unknown>) {
  const client = await userClient(actor(role).email, actor(role).password)
  const result = await client.rpc(name, args)
  if (result.error) throw new Error(`${name}: ${result.error.message}`)
  return result.data as Record<string, unknown> | string
}

async function prepareFactualAssessment(): Promise<void> {
  const run = manifest().runId
  const template = await rpc(OWNER, "create_tenant_assessment_template_v1", {
    p_company_id: companyId(), p_name: `E-E2E ${run}`, p_description: "Executive E2E",
    p_instructions: "Executive factual source.", p_type: "performance", p_status: "active",
  }) as Record<string, unknown>
  const section = await rpc(OWNER, "create_tenant_assessment_section_v1", {
    p_company_id: companyId(), p_assessment_template_id: template.assessmentTemplateId,
    p_code: `EE${run.slice(-8)}`, p_name: "Executive", p_description: "Executive E2E",
    p_icon: null, p_color: null, p_weight: 100, p_display_order: 0, p_active: true,
  }) as Record<string, unknown>
  await rpc(OWNER, "create_tenant_assessment_question_v1", {
    p_company_id: companyId(), p_assessment_section_id: section.assessmentSectionId,
    p_competency_id: null, p_code: `EEQ${run.slice(-8)}`,
    p_question: "Fato executivo do ciclo?", p_help_text: null,
    p_question_type: "scale", p_scale_min: 1, p_scale_max: 5,
    p_weight: 100, p_display_order: 0, p_required: true, p_active: true,
  })
  const today = new Date().toISOString().slice(0, 10)
  const end = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
  const cycle = await rpc(OWNER, "create_tenant_assessment_cycle_v1", {
    p_company_id: companyId(), p_name: `E-E2E Cycle ${run}`, p_description: "Executive E2E",
    p_assessment_type: "performance", p_assessment_template_id: template.assessmentTemplateId,
    p_status: "draft", p_start_date: today, p_end_date: end, p_close_date: null,
    p_allow_self_assessment: true, p_allow_manager_assessment: false,
    p_allow_peer_assessment: false, p_allow_direct_report_assessment: false,
    p_anonymous: false, p_assessment_visibility: "full", p_idempotency_key: `e-e2e-${run}`,
  }) as Record<string, unknown>
  assessmentCycleId = String(cycle.assessmentCycleId)
  await rpc(OWNER, "update_tenant_assessment_cycle_v1", {
    p_company_id: companyId(), p_assessment_cycle_id: assessmentCycleId,
    p_name: `E-E2E Cycle ${run}`, p_description: "Executive E2E",
    p_assessment_type: "performance", p_assessment_template_id: template.assessmentTemplateId,
    p_status: "active", p_start_date: today, p_end_date: end, p_close_date: null,
    p_allow_self_assessment: true, p_allow_manager_assessment: false,
    p_allow_peer_assessment: false, p_allow_direct_report_assessment: false,
    p_anonymous: false, p_assessment_visibility: "full",
  })

  factualEmployeeCount = manifest().users.filter((user) => user.personId !== null).length
}

async function openExecutive(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Executive", exact: true }).click()
  await page.waitForURL(/\/app\/executive$/)
  await expect(page.getByRole("heading", { name: "Executive Dashboard" })).toBeVisible({
    timeout: 30_000,
  })
}

async function expectOpaqueExecutiveDenial(page: Page, role: SyntheticRole): Promise<void> {
  await switchTo(page, role)
  await expect(page.getByRole("link", { name: "Executive", exact: true })).toHaveCount(0)
  await page.goto("/app/executive")
  await expect(page.getByRole("heading", { name: "Executive Dashboard" })).toHaveCount(0)
  await expect(page.getByText(manifest().companyName ?? "__missing_company__", { exact: true }))
    .toHaveCount(0)
  await expect(page.getByText(`E-E2E Cycle ${manifest().runId}`, { exact: false })).toHaveCount(0)
}

test.describe("Executive MVP hosted journey", () => {
  test("1-3. binds Review, owns both tenants and proves authorized navigation", async ({ page }) => {
    expect(manifest().deployment?.assetFingerprint).toMatch(/^assets:[0-9a-f]{16}$/)
    expect(manifest().deployment?.commitShaVerification).toBe("UNVERIFIABLE_FROM_DEPLOYMENT")
    steps.add(1)

    const foreignTenant = await ensureRunOwnedForeignTenant(page, actor(FOREIGN), manifest().runId)
    foreignCompanyId = foreignTenant.companyId
    foreignOwnerPersonId = foreignTenant.ownerPersonId
    cached = readManifest()
    expect(foreignCompanyId).not.toBe(companyId())
    await prepareFactualAssessment()
    steps.add(2)

    await signOutThroughUi(page)
    for (const role of [OWNER, ADMIN, HR] as const) {
      await enterAs(page, role)
      await openExecutive(page)
      if (role !== HR) await signOutThroughUi(page)
    }
    steps.add(3)
  })

  test("4-7. proves factual data, partial source state and honest unavailable capabilities", async ({ page }) => {
    await enterAs(page, OWNER)
    await openExecutive(page)
    const workforceMetric = page.getByText("Colaboradores", { exact: true }).locator("..").locator("dd")
    await expect(workforceMetric).toHaveText(String(factualEmployeeCount))
    steps.add(4)

    const assessmentTitle = `Avaliação em andamento: E-E2E Cycle ${manifest().runId}`
    const feedItem = page.getByText(assessmentTitle, { exact: true }).locator("..").locator("..")
    await expect(feedItem).toContainText("Avaliações")
    const owningLink = feedItem.getByRole("link", { name: "Ver contexto" })
    await expect(owningLink).toHaveAttribute("href", `/app/assessments/cycles/${assessmentCycleId}`)
    steps.add(5)

    await expect(page.getByRole("heading", { name: "Dados parciais" })).toBeVisible()
    await expect(page.getByText("Workspace de Planning — Indisponível", { exact: true })).toBeVisible()
    await expect(page.getByText(assessmentTitle, { exact: true })).toBeVisible()
    steps.add(6)

    for (const capability of ["Turnover", "Clima", "Desempenho agregado",
      "Potencial e Nine Box", "Sucessão", "Planos estratégicos"]) {
      await expect(page.getByText(capability, { exact: true }).locator("..")).toContainText("Indisponível")
    }
    steps.add(7)
  })

  test("8-9. proves opaque role denial and foreign-tenant isolation", async ({ page }) => {
    await enterAs(page, OWNER)
    await expectOpaqueExecutiveDenial(page, MANAGER)
    await expectOpaqueExecutiveDenial(page, EMPLOYEE)
    steps.add(8)

    await switchTo(page, FOREIGN)
    await page.goto("/app/executive")
    await expect(page.getByRole("heading", { name: "Executive Dashboard" })).toBeVisible()
    await expect(page.getByText(`E-E2E Cycle ${manifest().runId}`, { exact: false })).toHaveCount(0)
    await expect(page.getByText(manifest().companyName ?? "__missing_company__", { exact: true }))
      .toHaveCount(0)
    await expect(page.locator("body")).not.toContainText(assessmentCycleId)
    await expect(page.locator("body")).not.toContainText(companyId())
    expect(foreignOwnerPersonId).toMatch(/^[0-9a-f-]{36}$/)
    steps.add(9)
  })

  test("10-12. proves retired paths, semantics and writes durable evidence", async ({ page }, testInfo) => {
    await enterAs(page, OWNER)
    const peopleRequests: string[] = []
    page.on("request", (request) => {
      if (/\/rest\/v1\/people(?:\?|$)/.test(request.url())) peopleRequests.push(request.url())
    })
    await openExecutive(page)
    expect(peopleRequests).toEqual([])
    steps.add(10)

    await expect(page.getByText(/generic intelligence score|reconhecimento|check-in|one-on-one/i))
      .toHaveCount(0)
    steps.add(11)

    steps.add(12)
    expect([...steps].sort((a, b) => a - b)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12])
    const evidencePath = runEvidenceFile(manifest().runId, "executive-journey-evidence.json")
    mkdirSync(dirname(evidencePath), { recursive: true })
    const temporary = `${evidencePath}.tmp`
    writeFileSync(temporary, JSON.stringify({
      schemaVersion: 1,
      runId: manifest().runId,
      target: { baseUrl: manifest().baseUrl, supabaseRef: manifest().supabaseRef },
      deployment: manifest().deployment,
      tenantA: { companyId: companyId(), companyName: manifest().companyName },
      tenantB: { companyId: foreignCompanyId, ownerPersonId: foreignOwnerPersonId },
      actors: { owner: actor(OWNER).userId, admin: actor(ADMIN).userId,
        hr: actor(HR).userId, manager: actor(MANAGER).userId,
        employee: actor(EMPLOYEE).userId, foreignOwner: actor(FOREIGN).userId },
      facts: { factualEmployeeCount, assessmentCycleId,
        assessmentTitle: `Avaliação em andamento: E-E2E Cycle ${manifest().runId}` },
      partial: { dataStatus: "partial", source: "workspace_unavailable", kind: "unavailable" },
      deniedRoles: ["manager", "employee"],
      isolation: { foreignCompanyDistinct: foreignCompanyId !== companyId(), tenantALeakage: false },
      directPeopleRequests: peopleRequests,
      unavailableCapabilities: ["turnover", "climate", "aggregated_performance",
        "potential_nine_box", "succession", "strategic_plans"],
      steps: [...steps].sort((a, b) => a - b),
      verdict: "EXECUTIVE_JOURNEY=PASS",
    }, null, 2), { mode: 0o600 })
    renameSync(temporary, evidencePath)
    await testInfo.attach("executive-journey-evidence.json", {
      path: evidencePath, contentType: "application/json",
    })
  })
})
