/** L-E2E0 — frozen Leadership journey for canonical hosted Review. */

import { mkdirSync, renameSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

import { expect, test, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi, signOutThroughUi } from "../auth/login"
import { createDevelopmentFixture, DEVELOPMENT_EXPECTED_LEVEL } from "../fixtures/development-fixture"
import { ensureRunOwnedForeignTenant } from "../fixtures/onboarding-tenant"
import { adminClient, userClient } from "../helpers/admin-client"
import { readManifest, type RunManifest, type SyntheticRole } from "../helpers/run-context"
import { runEvidenceFile } from "../helpers/run-paths"

test.describe.configure({ mode: "serial" })

const MANAGER: SyntheticRole = "manager"
const SUBJECT: SyntheticRole = "evaluatee"
const UNRELATED: SyntheticRole = "employee"
const FOREIGN: SyntheticRole = "onboarding"
const AUTHOR: SyntheticRole = "admin"

let cached: RunManifest | null = null
let responseId = ""
let templateVersionId = ""
let planId = ""
let actionId = ""
let foreignOwnerPersonId = ""
let initialQueue: Array<Record<string, unknown>> = []
const steps = new Set<number>()
const SUBMIT_SUCCESS_MESSAGE = "Avaliação enviada com sucesso."

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

function personId(role: SyntheticRole): string {
  const id = actor(role).personId
  if (!id) throw new Error(`E2E_FIXTURE_MISSING_PERSON: ${role}`)
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

async function attention(role: SyntheticRole = MANAGER) {
  const client = await userClient(actor(role).email, actor(role).password)
  const result = await client.rpc("get_manager_leadership_attention_v1", {
    p_company_id: companyId(),
  })
  if (result.error) throw new Error(`LEADERSHIP_READ_FAILED: ${result.error.message}`)
  return (result.data ?? []) as Array<Record<string, unknown>>
}

async function prepareAssessment(): Promise<void> {
  const run = manifest().runId
  const template = await rpc(AUTHOR, "create_tenant_assessment_template_v1", {
    p_company_id: companyId(), p_name: `L-E2E ${run}`, p_description: "Leadership E2E",
    p_instructions: "Responda a avaliação.", p_type: "leadership", p_status: "active",
  }) as Record<string, unknown>
  const section = await rpc(AUTHOR, "create_tenant_assessment_section_v1", {
    p_company_id: companyId(), p_assessment_template_id: template.assessmentTemplateId,
    p_code: `LE${run.slice(-8)}`, p_name: "Liderança", p_description: "Leadership E2E",
    p_icon: null, p_color: null, p_weight: 100, p_display_order: 0, p_active: true,
  }) as Record<string, unknown>
  await rpc(AUTHOR, "create_tenant_assessment_question_v1", {
    p_company_id: companyId(), p_assessment_section_id: section.assessmentSectionId,
    p_competency_id: null, p_code: `LEQ${run.slice(-8)}`,
    p_question: "Como foi o desempenho neste ciclo?", p_help_text: null,
    p_question_type: "scale", p_scale_min: 1, p_scale_max: 5,
    p_weight: 100, p_display_order: 0, p_required: true, p_active: true,
  })
  const today = new Date().toISOString().slice(0, 10)
  const end = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
  const cycle = await rpc(AUTHOR, "create_tenant_assessment_cycle_v1", {
    p_company_id: companyId(), p_name: `L-E2E Cycle ${run}`, p_description: "Leadership E2E",
    p_assessment_type: "performance", p_assessment_template_id: template.assessmentTemplateId,
    p_status: "draft", p_start_date: today, p_end_date: end, p_close_date: null,
    p_allow_self_assessment: false, p_allow_manager_assessment: true,
    p_allow_peer_assessment: false, p_allow_direct_report_assessment: false,
    p_anonymous: false, p_assessment_visibility: "full", p_idempotency_key: `l-e2e-${run}`,
  }) as Record<string, unknown>
  await rpc(AUTHOR, "add_tenant_assessment_cycle_participants_v1", {
    p_company_id: companyId(), p_assessment_cycle_id: cycle.assessmentCycleId,
    p_employee_ids: [personId(SUBJECT)],
  })
  await rpc(AUTHOR, "update_tenant_assessment_cycle_v1", {
    p_company_id: companyId(), p_assessment_cycle_id: cycle.assessmentCycleId,
    p_name: `L-E2E Cycle ${run}`, p_description: "Leadership E2E",
    p_assessment_type: "performance", p_assessment_template_id: template.assessmentTemplateId,
    p_status: "active", p_start_date: today, p_end_date: end, p_close_date: null,
    p_allow_self_assessment: false, p_allow_manager_assessment: true,
    p_allow_peer_assessment: false, p_allow_direct_report_assessment: false,
    p_anonymous: false, p_assessment_visibility: "full",
  })
  await rpc(AUTHOR, "generate_tenant_assessment_cycle_responses_v1", {
    p_company_id: companyId(), p_assessment_cycle_id: cycle.assessmentCycleId,
  })
  const found = await adminClient().from("assessment_responses").select("id")
    .eq("assessment_cycle_id", cycle.assessmentCycleId).eq("evaluator_id", personId(MANAGER))
    .eq("employee_id", personId(SUBJECT)).single()
  if (found.error) throw new Error(`ASSESSMENT_RESPONSE_READBACK_FAILED: ${found.error.message}`)
  responseId = found.data.id
}

async function prepareDevelopmentTemplate(): Promise<void> {
  const run = manifest().runId
  const fixture = await createDevelopmentFixture({
    companyId: companyId(), subjectPersonId: personId(SUBJECT), runId: run,
  })
  templateVersionId = await rpc(AUTHOR, "create_development_template_draft_v1", {
    p_company_id: companyId(), p_name: `L-E2E PDI ${run}`,
    p_description: "Leadership E2E", p_duration: 30,
    p_idempotency_key: crypto.randomUUID(),
  }) as string
  const goalId = await rpc(AUTHOR, "add_development_template_goal_v1", {
    p_version_id: templateVersionId, p_competency_id: fixture.competencyId,
    p_description: "Leadership follow-up", p_target: DEVELOPMENT_EXPECTED_LEVEL, p_order: 0,
  }) as string
  await rpc(AUTHOR, "add_development_template_action_v1", {
    p_goal_id: goalId, p_title: `L-E2E Action ${run}`, p_description: "Leadership E2E",
    p_type: "mentoring", p_due_days: 15, p_order: 0,
  })
  await rpc(AUTHOR, "publish_development_template_version_v1", {
    p_version_id: templateVersionId, p_expected_revision: 3,
  })
}

async function leadership(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Liderança" }).click()
  await page.waitForURL(/\/app\/manager/)
  await expect(page.getByRole("heading", { name: "Liderança" })).toBeVisible({ timeout: 30_000 })
}

test.describe("Leadership MVP hosted journey", () => {
  test("1-5. authenticates, enters normally and proves direct-report scope", async ({ page }) => {
    const foreignTenant = await ensureRunOwnedForeignTenant(
      page,
      actor(FOREIGN),
      manifest().runId,
    )
    foreignOwnerPersonId = foreignTenant.ownerPersonId
    cached = readManifest()
    expect(foreignTenant.companyId).not.toBe(companyId())
    await prepareAssessment()
    await prepareDevelopmentTemplate()

    // `ensureRunOwnedForeignTenant` finishes inside tenant B as its onboarding
    // owner. End that setup session explicitly, then establish the journey's
    // first actor through the canonical first-login helper.
    await signOutThroughUi(page)
    await enterAs(page, MANAGER)
    steps.add(1)
    await leadership(page)
    steps.add(2)

    await expect(page.getByText(actor(SUBJECT).fullName, { exact: true }).first()).toBeVisible()
    await expect(page.getByText(actor(UNRELATED).fullName, { exact: true })).toHaveCount(0)
    await expect(page.getByText(actor(FOREIGN).fullName, { exact: true })).toHaveCount(0)
    steps.add(3)

    initialQueue = await attention()
    expect(initialQueue).toEqual(expect.arrayContaining([
      expect.objectContaining({ subject_id: personId(SUBJECT),
        reason: "assigned_assessment_pending", priority: "medium", source_id: responseId }),
      expect.objectContaining({ subject_id: personId(SUBJECT),
        reason: "development_plan_missing", priority: "low" }),
    ]))
    steps.add(4)
    expect(initialQueue.some((row) => row.subject_id === personId(UNRELATED))).toBe(false)
    expect(initialQueue.some((row) => row.subject_id === foreignOwnerPersonId)).toBe(false)
    steps.add(5)
  })

  test("6-8. routes to Assessment, completes it and creates formal Feedback", async ({ page }) => {
    await enterAs(page, MANAGER)
    await leadership(page)
    const assessment = page.getByText("Avaliação atribuída pendente").locator("..").locator("..")
    await assessment.getByRole("link", { name: "Responder avaliação" }).click()
    await expect(page).toHaveURL(new RegExp(`/app/assessments/responses/${responseId}$`))
    steps.add(6)
    await page.getByRole("radiogroup", { name: "Escala de resposta" })
      .getByRole("radio", { name: "5", exact: true }).click()
    await expect(page.getByText("✔ Salvo", { exact: true })).toBeVisible({ timeout: 30_000 })
    await page.getByRole("button", { name: "Enviar avaliação" }).click()
    await page.getByRole("button", { name: "Confirmar envio" }).click()
    await expect(page.getByText(SUBMIT_SUCCESS_MESSAGE, { exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Concluir avaliação?" })).toBeHidden()
    steps.add(7)

    await page.getByRole("button", { name: "Iniciar feedback" }).click()
    await page.locator("#assessment-feedback-initial-message")
      .fill(`Feedback formal Leadership ${manifest().runId}`)
    await page.getByRole("button", { name: "Criar feedback" }).click()
    await expect(page.getByText(
      "Esta avaliação já tem uma conversa de feedback aberta.",
      { exact: true },
    )).toBeVisible({ timeout: 30_000 })
    const openFeedback = page.getByRole("link", { name: "Abrir conversa de feedback" })
    await expect(openFeedback).toBeVisible()
    await Promise.all([
      page.waitForURL(/\/app\/feedbacks\/[0-9a-f-]{36}$/),
      openFeedback.click(),
    ])
    const feedbackThreadId = new URL(page.url()).pathname.split("/").at(-1) ?? ""
    expect(feedbackThreadId).toMatch(/^[0-9a-f-]{36}$/)
    const feedback = await adminClient().from("feedback_threads")
      .select("id,assessment_response_id,sender_id,receiver_id,status")
      .eq("assessment_response_id", responseId).single()
    expect(feedback.error).toBeNull()
    expect(feedback.data).toMatchObject({ id: feedbackThreadId,
      assessment_response_id: responseId, sender_id: personId(MANAGER),
      receiver_id: personId(SUBJECT), status: "active" })
    steps.add(8)
  })

  test("9-11. applies the missing PDI, records progress/review and rederives Leadership", async ({ page }) => {
    await enterAs(page, MANAGER)
    await leadership(page)
    await page.getByRole("link", { name: "Aplicar template de PDI" }).click()
    await expect(page).toHaveURL(new RegExp(`applyFor=${personId(SUBJECT)}`))
    const dialog = page.getByRole("dialog")
    await dialog.locator("#templateId").selectOption(templateVersionId)
    await dialog.getByRole("button", { name: "Verificar aplicação" }).click()
    await expect(dialog.getByRole("button", { name: "Confirmar aplicação" })).toBeEnabled()
    await dialog.getByRole("button", { name: "Confirmar aplicação" }).click()
    await page.waitForURL(/\/app\/development\/plans\/[0-9a-f-]{36}/)
    planId = page.url().split("/").pop() ?? ""
    const action = await adminClient().from("development_actions").select("id")
      .eq("development_plan_id", planId).single()
    if (action.error) throw new Error(`DEVELOPMENT_ACTION_READBACK_FAILED: ${action.error.message}`)
    actionId = action.data.id
    await switchTo(page, SUBJECT)
    await page.goto(`/app/development/plans/${planId}`)
    await page.getByRole("button", { name: "Iniciar ação" }).click()
    await expect(page.getByText("Ação atualizada com sucesso.", { exact: true })).toBeVisible()
    await switchTo(page, MANAGER)
    await page.goto(`/app/development/plans/${planId}`)
    await page.locator("#review-summary").fill(`Review Leadership ${manifest().runId}`)
    await page.locator("#review-next-step").fill("Continuar acompanhamento")
    await page.getByRole("button", { name: "Registrar revisão" }).click()
    await expect(page.getByText("Revisão registrada com sucesso.", { exact: true })).toBeVisible()
    const persisted = await adminClient().from("development_reviews").select("development_plan_id")
      .eq("development_plan_id", planId)
    expect(persisted.error).toBeNull()
    expect(persisted.data).toHaveLength(1)
    steps.add(9)
    await leadership(page)
    steps.add(10)
    const after = await attention()
    expect(after.some((row) => row.reason === "assigned_assessment_pending")).toBe(false)
    expect(after.some((row) => row.reason === "formal_feedback_pending")).toBe(false)
    expect(after.some((row) => row.reason === "development_plan_missing")).toBe(false)
    expect(after).toEqual(expect.arrayContaining([
      expect.objectContaining({ subject_id: personId(SUBJECT),
        reason: "development_follow_up_due", priority: "medium", source_id: planId }),
    ]))
    steps.add(11)
  })

  test("12. proves trusted isolation and writes durable run evidence", async ({ page }, testInfo) => {
    await enterAs(page, FOREIGN)
    const foreign = await userClient(actor(FOREIGN).email, actor(FOREIGN).password)
    const denied = await foreign.rpc("get_manager_leadership_attention_v1", {
      p_company_id: companyId(),
    })
    expect(denied.error).not.toBeNull()
    expect(JSON.stringify(denied.data ?? [])).not.toContain(personId(SUBJECT))
    steps.add(12)
    expect([...steps].sort((a, b) => a - b)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12])

    const evidencePath = runEvidenceFile(manifest().runId, "leadership-journey-evidence.json")
    mkdirSync(dirname(evidencePath), { recursive: true })
    const temporary = `${evidencePath}.tmp`
    writeFileSync(temporary, JSON.stringify({ runId: manifest().runId, companyId: companyId(),
      managerId: personId(MANAGER), subjectId: personId(SUBJECT),
      unrelatedId: personId(UNRELATED), foreignPersonId: foreignOwnerPersonId,
      foreignCompanyId: manifest().onboardingCompany?.companyId,
      responseId, templateVersionId, planId, actionId, initialQueue,
      finalQueue: await attention(MANAGER), steps: [...steps].sort((a,b) => a-b),
      verdict: "LEADERSHIP_JOURNEY=PASS" }, null, 2), { mode: 0o600 })
    renameSync(temporary, evidencePath)
    await testInfo.attach("leadership-journey-evidence.json", {
      path: evidencePath, contentType: "application/json",
    })
  })
})
