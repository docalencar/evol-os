/** E2E-5 — formal feedback from a modern manager assessment. */

import { expect, test, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi, signOutThroughUi } from "../auth/login"
import { adminClient, userClient } from "../helpers/admin-client"
import { assessmentFeedbackCycleName, assessmentTemplateName } from "../helpers/org-journey-names"
import { readManifest, type RunManifest, type SyntheticRole } from "../helpers/run-context"

test.describe.configure({ mode: "serial" })

const NONEXISTENT_ID = "00000000-0000-4000-8000-000000000001"
const INITIAL_MESSAGE = "Feedback formal inicial desta avaliação."
const MANAGER_REPLY = "Registro do gestor após a devolutiva."
const EVALUATEE_REPLY = "Registro da pessoa avaliada após a devolutiva."
const CYCLE_CREATE_SUCCESS_MESSAGE = "Ciclo de avaliação criado com sucesso."
const PARTICIPANTS_ADD_SUCCESS_MESSAGE = "Participantes adicionados com sucesso."
const CYCLE_UPDATE_SUCCESS_MESSAGE = "Ciclo de avaliação atualizado com sucesso."
const SUBMIT_SUCCESS_MESSAGE = "Avaliação enviada com sucesso."
let responseId = ""
let threadId = ""

let cached: RunManifest | null = null
function manifest(): RunManifest {
  if (!cached) cached = readManifest()
  return cached
}

function actor(role: SyntheticRole) {
  const found = manifest().users.find((candidate) => candidate.role === role)
  if (!found) throw new Error(`E2E_FIXTURE_MISSING_ROLE: ${role}`)
  return found
}

async function enterAs(page: Page, role: SyntheticRole): Promise<void> {
  await loginThroughUi(page, actor(role))
  await expectAuthenticatedShell(page)
}

async function switchTo(page: Page, role: SyntheticRole): Promise<void> {
  await signOutThroughUi(page)
  await enterAs(page, role)
}

async function assessmentsHome(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Avaliações" }).click()
  await page.waitForURL(/\/app\/assessments(\?|$)/, { timeout: 30_000 })
  await expect(page.getByRole("heading", { level: 2, name: "Meus resultados" })).toBeVisible({
    timeout: 30_000,
  })
}

async function feedbackThread(page: Page): Promise<void> {
  await page.goto(`/app/feedbacks/${threadId}`)
  await expect(page.getByRole("heading", { level: 1, name: "Conversa de feedback" })).toBeVisible({
    timeout: 30_000,
  })
}

async function submitReply(page: Page, message: string): Promise<void> {
  await page.locator("#feedback-reply-content").fill(message)
  await page.getByRole("button", { name: "Enviar resposta" }).click()
  await expect(page.getByText("Resposta enviada com sucesso.", { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText(message, { exact: true })).toBeVisible({ timeout: 30_000 })
}

test.describe("assessment feedback lifecycle and authorization", () => {
  test("1. creates and finalizes a genuine manager-perspective response", async ({ page }) => {
    await enterAs(page, "admin")
    await assessmentsHome(page)
    const cycle = assessmentFeedbackCycleName(manifest().runId)

    await page.getByRole("button", { name: "Nova avaliação", exact: true }).click()
    await page.locator("#assessment-cycle-name").fill(cycle)
    await page.locator("#assessment-cycle-template").selectOption({
      label: assessmentTemplateName(manifest().runId),
    })
    await page.getByRole("button", { name: "Continuar" }).click()
    const today = new Date()
    const end = new Date(today)
    end.setDate(end.getDate() + 7)
    await page.locator("#assessment-start-date").fill(today.toISOString().slice(0, 10))
    await page.locator("#assessment-end-date").fill(end.toISOString().slice(0, 10))
    await page.getByRole("button", { name: "Continuar" }).click()

    const selfAssessmentCheckbox = page.getByRole("checkbox", { name: "Autoavaliação" })
    await expect(selfAssessmentCheckbox).toBeVisible()
    if (await selfAssessmentCheckbox.isChecked()) await selfAssessmentCheckbox.uncheck()
    await expect(page.getByText("Avaliação pelo gestor", { exact: true }).locator("..").getByRole("checkbox"))
      .toBeChecked()
    await page.getByRole("button", { name: "Continuar" }).click()
    await page.locator("#assessment-visibility").selectOption({ label: "Resultado completo" })
    await page.getByRole("button", { name: "Continuar" }).click()
    await page.getByRole("button", { name: "Criar ciclo" }).click()
    await expect(page.getByText(CYCLE_CREATE_SUCCESS_MESSAGE, { exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Nova avaliação" })).toBeHidden()

    await page.reload()
    const cycleRow = page.getByRole("row", { name: new RegExp(cycle) })
    await cycleRow.getByRole("link", { name: cycle }).click()
    await expect(page.getByRole("heading", { level: 1, name: cycle })).toBeVisible({ timeout: 30_000 })
    await page.getByRole("button", { name: "Adicionar participantes" }).click()
    await page.getByRole("checkbox", { name: new RegExp(actor("evaluatee").fullName) }).check()
    await page.getByRole("button", { name: "Adicionar selecionados" }).click()
    await expect(page.getByText(PARTICIPANTS_ADD_SUCCESS_MESSAGE, { exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Participantes do ciclo" })).toBeHidden()

    await assessmentsHome(page)
    const row = page.getByRole("row", { name: new RegExp(cycle) })
    await row.getByRole("button", { name: "Editar", exact: true }).click()
    await page.locator("#assessment-cycle-status").selectOption({ label: "Em andamento" })
    for (let step = 0; step < 4; step += 1) await page.getByRole("button", { name: "Continuar" }).click()
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText(CYCLE_UPDATE_SUCCESS_MESSAGE, { exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Editar ciclo de avaliação" })).toBeHidden()

    await page.reload()
    await page.getByRole("link", { name: cycle }).click()
    await page.getByRole("button", { name: "Gerar avaliações" }).click()
    await expect(page.getByText(/avaliação\(ões\) gerada\(s\): gestor\./)).toBeVisible({ timeout: 30_000 })

    await switchTo(page, "manager")
    await assessmentsHome(page)
    await page.getByRole("link", { name: "Abrir avaliação" }).click()
    await page.waitForURL(/\/app\/assessments\/responses\/([0-9a-f-]{36})/)
    responseId = new URL(page.url()).pathname.split("/").at(-1) ?? ""
    expect(responseId).toMatch(/^[0-9a-f-]{36}$/)
    const scale = page.getByRole("radiogroup", { name: "Escala de resposta" })
    await scale.getByRole("radio", { name: "5", exact: true }).click()
    await expect(page.getByText("✔ Salvo", { exact: true })).toBeVisible({ timeout: 30_000 })
    await page.getByRole("button", { name: "Enviar avaliação" }).click()
    await page.getByRole("button", { name: "Confirmar envio" }).click()
    await expect(page.getByText(SUBMIT_SUCCESS_MESSAGE, { exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Concluir avaliação?" })).toBeHidden()

    const response = await adminClient().from("assessment_responses")
      .select("status,perspective,evaluator_id,employee_id,company_id")
      .eq("id", responseId).single()
    expect(response.error).toBeNull()
    expect(response.data).toMatchObject({
      status: "submitted",
      perspective: "manager",
      evaluator_id: actor("manager").personId,
      employee_id: actor("evaluatee").personId,
      company_id: manifest().companyId,
    })
  })

  test("2-7. evaluator creates through UI and both participants durably read it", async ({ page }) => {
    await enterAs(page, "manager")
    await page.goto(`/app/assessments/responses/${responseId}`)
    await page.getByRole("button", { name: "Iniciar feedback" }).click()
    await expect(page.getByRole("button", { name: "Criar feedback" })).toBeDisabled()
    await page.locator("#assessment-feedback-initial-message").fill(INITIAL_MESSAGE)
    await page.getByRole("button", { name: "Criar feedback" }).click()
    await expect(page.getByText("Conversa de feedback criada com sucesso.", { exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Abrir conversa de feedback" })).toBeVisible()
    threadId = (await page.getByRole("link", { name: "Abrir conversa de feedback" }).getAttribute("href"))
      ?.split("/").at(-1) ?? ""
    expect(threadId).toMatch(/^[0-9a-f-]{36}$/)

    await page.reload()
    await expect(page.getByRole("link", { name: "Abrir conversa de feedback" })).toBeVisible()
    const thread = await adminClient().from("feedback_threads")
      .select("title,type,visibility,status,sender_employee_id,receiver_employee_id,assessment_response_id")
      .eq("id", threadId).single()
    expect(thread.error).toBeNull()
    expect(thread.data).toMatchObject({
      title: "Feedback da avaliação", type: "feedback", visibility: "participants",
      status: "awaiting_acknowledgement", sender_employee_id: actor("manager").personId,
      receiver_employee_id: actor("evaluatee").personId, assessment_response_id: responseId,
    })

    await switchTo(page, "evaluatee")
    await page.getByRole("link", { name: "Feedbacks" }).click()
    const row = page.getByRole("row", { name: /Feedback da avaliação/ })
    await expect(row).toContainText("Recebido")
    await row.getByRole("link", { name: "Abrir conversa" }).click()
    await expect(page.getByText(INITIAL_MESSAGE, { exact: true })).toBeVisible({ timeout: 30_000 })
  })

  test("8-12. acknowledgement and both replies persist with correct authorship", async ({ page }) => {
    await enterAs(page, "evaluatee")
    await feedbackThread(page)
    await page.getByRole("button", { name: "Confirmar recebimento" }).click()
    await page.getByRole("button", { name: "Confirmar recebimento" }).last().click()
    await expect(page.getByText("Recebimento do feedback confirmado com sucesso.", { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText("Confirmado", { exact: true }).first()).toBeVisible()

    await switchTo(page, "manager")
    await feedbackThread(page)
    await submitReply(page, MANAGER_REPLY)
    await switchTo(page, "evaluatee")
    await feedbackThread(page)
    await submitReply(page, EVALUATEE_REPLY)

    const messages = await adminClient().from("feedback_messages")
      .select("content,author_employee_id").eq("thread_id", threadId)
      .in("content", [MANAGER_REPLY, EVALUATEE_REPLY])
    expect(messages.error).toBeNull()
    expect(messages.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ content: MANAGER_REPLY, author_employee_id: actor("manager").personId }),
      expect.objectContaining({ content: EVALUATEE_REPLY, author_employee_id: actor("evaluatee").personId }),
    ]))
  })

  test("13-17,23. close then archive persists and becomes terminal without optional paths", async ({ page }) => {
    await enterAs(page, "evaluatee")
    await feedbackThread(page)
    await expect(page.getByRole("button", { name: "Arquivar conversa" })).toHaveCount(0)
    await page.getByRole("button", { name: "Encerrar conversa" }).click()
    await page.getByRole("button", { name: "Encerrar" }).click()
    await expect(page.getByText("Conversa de feedback encerrada com sucesso.", { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText("Encerrado", { exact: true }).first()).toBeVisible()
    await page.getByRole("button", { name: "Arquivar conversa" }).click()
    await page.getByRole("button", { name: "Arquivar" }).click()
    await expect(page.getByText("Conversa de feedback arquivada com sucesso.", { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText("Arquivado", { exact: true }).first()).toBeVisible()
    await expect(page.getByText(/não aceita novas respostas/)).toBeVisible()
    await expect(page.getByRole("button", { name: /Confirmar recebimento|Encerrar|Arquivar/ })).toHaveCount(0)

    for (const table of ["feedback_attachments", "feedback_mentions"]) {
      const result = await adminClient().from(table).select("*", { count: "exact", head: true })
        .eq("company_id", manifest().companyId as string)
      expect(result.error).toBeNull()
      expect(result.count).toBe(0)
    }
  })

  test("18-22. cardinality and participant-only visibility fail closed", async ({ page }) => {
    await enterAs(page, "manager")
    await page.goto(`/app/assessments/responses/${responseId}`)
    await expect(page.getByRole("button", { name: "Iniciar feedback" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Abrir conversa de feedback" })).toBeVisible()

    const asManager = await userClient(actor("manager").email, actor("manager").password)
    const duplicate = await asManager.rpc("create_assessment_feedback_v1", {
      p_assessment_response_id: responseId, p_initial_message: "duplicate capability probe",
    })
    await asManager.auth.signOut()
    expect(duplicate.error).toBeNull()
    expect(duplicate.data).toMatchObject({ status: "already_exists", feedbackThreadId: threadId })
    const count = await adminClient().from("feedback_threads").select("*", { count: "exact", head: true })
      .eq("assessment_response_id", responseId)
    expect(count.count).toBe(1)

    await switchTo(page, "employee")
    await page.goto(`/app/feedbacks/${threadId}`)
    const sameTenantBody = await page.locator("body").innerText()
    await page.goto(`/app/feedbacks/${NONEXISTENT_ID}`)
    expect(await page.locator("body").innerText()).toBe(sameTenantBody)
    expect(sameTenantBody).not.toContain(INITIAL_MESSAGE)

    await switchTo(page, "onboarding")
    await page.goto(`/app/feedbacks/${threadId}`)
    const foreignBody = await page.locator("body").innerText()
    await page.goto(`/app/feedbacks/${NONEXISTENT_ID}`)
    expect(await page.locator("body").innerText()).toBe(foreignBody)
    expect(foreignBody).not.toContain(INITIAL_MESSAGE)

    await switchTo(page, "admin")
    await page.getByRole("link", { name: "Empresa" }).click()
    await expect(page.getByRole("heading", { name: "Atividade recente" })).toBeVisible()
    const timeline = page.getByRole("heading", { name: "Atividade recente" }).locator("../..")
    for (const restrictedTitle of [
      "Feedback criado",
      "Feedback respondido",
      "Feedback confirmado",
      "Feedback encerrado",
      "Feedback arquivado",
    ]) {
      await expect(timeline).not.toContainText(restrictedTitle)
    }
  })
})
