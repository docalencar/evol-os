/**
 * E2E-4 spec 12 — running an assessment and getting a result back.
 *
 * The administrator arranges and generates; then a REAL employee logs in, finds
 * the assessment waiting for them, answers it, submits, and reads their own
 * score. Two different people, two different sessions, and the evaluator is
 * never an administrator — that separation is the whole point, and it is why
 * E4-P1 had to ship first: until the assessment home loaded pending work for a
 * non-administrative person, an ordinary employee had no navigable way to reach
 * their own response at all.
 *
 * ## Why this creates a second cycle
 *
 * Spec 11's cycle is deliberately private. The wizard's privacy default is
 * `none` — "Sem acesso aos resultados" — and `assessment_visibility` is locked
 * once a cycle leaves `draft` (`configurationLocked`, assessment-cycle-form.ts).
 * The result directory then filters it out entirely: `get_current_person_...`
 * (0117) selects only rows whose `cycle.assessment_visibility <> 'none'`. Both
 * behaviours are correct, and together they make property 12 unprovable on that
 * cycle. So this spec builds its own cycle over the SAME template spec 11 proved
 * — reusing the catalog, choosing "Resultado completo" while the cycle is still
 * a draft. Creating it is setup for properties 8-12, not a second proof of 1-7.
 *
 * ## Why the participant is the fixture employee
 *
 * The person spec 06 creates through the People wizard has no email and no
 * `user_id`: it cannot authenticate, so it can never be the evaluator of a
 * journey that has to log in. The fixture's `employee` identity can — it is
 * run-owned, journalled, has an auth user, an active membership and an active
 * `people` row. With `allow_self_assessment` on and no `manager_id`, generation
 * produces exactly one candidate for it: `self`, where evaluator and evaluatee
 * are the same person (0115:139). That is a real journey, not a shortcut.
 *
 * ## What this spec does NOT do
 *
 * No tenant isolation, no cross-tenant probe, no non-administrative attempt at
 * an administrative surface — those are E4-S4. And it never recomputes a score:
 * `response-scale-weighted-v1` lives in `get_tenant_assessment_scored_result_v1`
 * (0115, hardened by 0116) and the spec only reads what the product renders.
 */

import { expect, test, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi } from "../auth/login"
import {
  assessmentResultCycleName,
  assessmentTemplateName,
} from "../helpers/org-journey-names"
import { readManifest, type RunManifest } from "../helpers/run-context"

test.describe.configure({ mode: "serial" })

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

/**
 * Exact success messages, read from the actions rather than invented. On failure
 * each surface toasts the error instead, so these are success-only signals.
 */
const CYCLE_CREATE_SUCCESS_MESSAGE = "Ciclo de avaliação criado com sucesso."
const CYCLE_UPDATE_SUCCESS_MESSAGE = "Ciclo de avaliação atualizado com sucesso."
const PARTICIPANTS_ADD_SUCCESS_MESSAGE = "Participantes adicionados com sucesso."
const SUBMIT_SUCCESS_MESSAGE = "Avaliação enviada com sucesso."

/**
 * Generation reports how many responses it made, so the message is not a fixed
 * string: `"1 avaliação(ões) gerada(s): autoavaliação."`. The invariant part is
 * asserted, and the perspective is asserted with it — a run that silently
 * generated something other than a self-assessment would not match.
 */
const GENERATION_SUCCESS_MESSAGE = /avaliação\(ões\) gerada\(s\): autoavaliação\./

/** Per-question autosave state, rendered only on success. */
const ANSWER_SAVED_SIGNAL = "✔ Salvo"

const CYCLE_DRAFT_LABEL = "Rascunho"
const CYCLE_ACTIVE_LABEL = "Em andamento"
const RESULT_VISIBILITY_LABEL = "Resultado completo"
const SUBMITTED_STATUS_LABEL = "Enviada"

const CYCLE_CREATE_HEADING = "Nova avaliação"
const CYCLE_EDIT_HEADING = "Editar ciclo de avaliação"
const PARTICIPANTS_HEADING = "Participantes do ciclo"
const SUBMIT_CONFIRM_HEADING = "Concluir avaliação?"

/** The answer given, at the top of the question's 1-5 scale. */
const ANSWER_SCORE = "5"

/** A percentage as the product formats it, e.g. "100,0%". Never recomputed. */
const RENDERED_SCORE = /\d{1,3},\d%/

function isoDate(daysFromToday: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  return date.toISOString().slice(0, 10)
}

async function enterAs(page: Page, role: "admin" | "employee"): Promise<void> {
  await loginThroughUi(page, actor(role))
  await expectAuthenticatedShell(page)
}

async function openAssessmentsHome(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Avaliações" }).click()
  await page.waitForURL(/\/app\/assessments(\/|\?|$)/, { timeout: 30_000 })
}

async function openResultCycleDetail(page: Page): Promise<void> {
  await openAssessmentsHome(page)
  await page.getByRole("link", { name: assessmentResultCycleName(manifest().runId) }).click()
  await page.waitForURL(/\/app\/assessments\/cycles\/[0-9a-f-]{36}(\?|$)/, { timeout: 30_000 })
}

/** Informações -> Cronograma -> Participantes -> Privacidade -> Revisão. */
async function advanceCycleWizard(page: Page, steps: number): Promise<void> {
  for (let step = 0; step < steps; step += 1) {
    await page.getByRole("button", { name: "Continuar" }).click()
  }
}

test.describe("an assessment is answered, submitted and scored through the real UI", () => {
  test("setup: a disclosing cycle over the run's template, with the employee on it", async ({
    page,
  }) => {
    const cycle = assessmentResultCycleName(manifest().runId)
    const employee = actor("employee").fullName

    await enterAs(page, "admin")
    await openAssessmentsHome(page)

    await page.getByRole("button", { name: "Nova avaliação", exact: true }).click()
    await expect(
      page.getByRole("heading", { level: 2, name: CYCLE_CREATE_HEADING })
    ).toBeVisible({ timeout: 15_000 })

    await page.locator("#assessment-cycle-name").fill(cycle)
    await page
      .locator("#assessment-cycle-template")
      .selectOption({ label: assessmentTemplateName(manifest().runId) })

    await advanceCycleWizard(page, 1)
    await page.locator("#assessment-start-date").fill(isoDate(0))
    await page.locator("#assessment-end-date").fill(isoDate(7))

    // Cronograma -> Participantes -> Privacidade.
    await advanceCycleWizard(page, 2)

    // The reason this cycle exists. Chosen here, while the cycle is still a
    // draft, because the control is disabled from the moment it is not.
    await page
      .locator("#assessment-visibility")
      .selectOption({ label: RESULT_VISIBILITY_LABEL })

    await advanceCycleWizard(page, 1)

    await page.getByRole("button", { name: "Criar ciclo" }).click()
    await expect(
      page.getByText(CYCLE_CREATE_SUCCESS_MESSAGE, { exact: true })
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { level: 2, name: CYCLE_CREATE_HEADING })
    ).toBeHidden({ timeout: 15_000 })

    await page.reload()
    const row = page.getByRole("row", { name: new RegExp(cycle) })
    await expect(row).toBeVisible({ timeout: 30_000 })
    await expect(row).toContainText(CYCLE_DRAFT_LABEL)

    // The employee joins while the cycle is still a draft, so generation has a
    // candidate who can actually log in.
    await openResultCycleDetail(page)
    await page.getByRole("button", { name: "Adicionar participantes" }).click()
    await expect(
      page.getByRole("heading", { level: 2, name: PARTICIPANTS_HEADING })
    ).toBeVisible({ timeout: 15_000 })

    await page.getByRole("checkbox", { name: new RegExp(employee) }).check()
    await page.getByRole("button", { name: "Adicionar selecionados" }).click()
    await expect(
      page.getByText(PARTICIPANTS_ADD_SUCCESS_MESSAGE, { exact: true })
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { level: 2, name: PARTICIPANTS_HEADING })
    ).toBeHidden({ timeout: 15_000 })

    await page.reload()
    await expect(
      page.getByRole("row", { name: new RegExp(employee) }).first()
    ).toBeVisible({ timeout: 30_000 })

    // Activation lives only in the cycles table's edit dialog.
    await openAssessmentsHome(page)
    const listRow = page.getByRole("row", { name: new RegExp(cycle) })
    await listRow.getByRole("button", { name: "Editar", exact: true }).click()
    await expect(page.getByRole("heading", { level: 2, name: CYCLE_EDIT_HEADING })).toBeVisible({
      timeout: 15_000,
    })
    await page
      .locator("#assessment-cycle-status")
      .selectOption({ label: CYCLE_ACTIVE_LABEL })
    await advanceCycleWizard(page, 4)

    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(
      page.getByText(CYCLE_UPDATE_SUCCESS_MESSAGE, { exact: true })
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("heading", { level: 2, name: CYCLE_EDIT_HEADING })).toBeHidden({
      timeout: 15_000,
    })

    await page.reload()
    await expect(page.getByRole("row", { name: new RegExp(cycle) })).toContainText(
      CYCLE_ACTIVE_LABEL
    )
  })

  test("8. generation produces the assessments and freezes the execution snapshot", async ({
    page,
  }) => {
    await enterAs(page, "admin")
    await openResultCycleDetail(page)

    // Irreversible: this writes the immutable 0114 snapshot, after which the
    // tenant can only be retired. Clicked exactly once — a second click is
    // idempotent, but a spec that relied on that would be testing the guard
    // rather than the journey.
    await page.getByRole("button", { name: "Gerar avaliações" }).click()
    await expect(page.getByText(GENERATION_SUCCESS_MESSAGE)).toBeVisible({ timeout: 30_000 })

    await page.reload()

    // Durable readback through the product's own surface: the cycle now lists a
    // response for the employee, which only exists because the snapshot and the
    // response rows were written.
    await expect(
      page.getByRole("row", { name: new RegExp(actor("employee").fullName) }).first()
    ).toBeVisible({ timeout: 30_000 })

    // The link reads "Abrir" and not "Responder" because the administrator is
    // not the evaluator of this response — which is itself the point: the work
    // was generated for somebody else.
    await expect(page.getByRole("link", { name: "Abrir", exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })
  })

  test("9. the employee finds the assessment, answers it, and the answer survives a reload", async ({
    page,
  }) => {
    await enterAs(page, "employee")
    await openAssessmentsHome(page)

    // Discovery through the evaluator's own surface — the one E4-P1 restored.
    // No administrative page is involved, and no id is typed into a URL.
    await page.getByRole("link", { name: "Abrir avaliação" }).click()
    await page.waitForURL(/\/app\/assessments\/responses\/[0-9a-f-]{36}(\?|$)/, {
      timeout: 30_000,
    })

    const scale = page.getByRole("radiogroup", { name: "Escala de resposta" })
    await expect(scale).toBeVisible({ timeout: 30_000 })

    await scale.getByRole("radio", { name: ANSWER_SCORE, exact: true }).click()

    // Autosave's success-only signal. `Salvando...` and the error text are
    // separate branches of the same slot, so "✔ Salvo" cannot appear unless the
    // action returned success — no sleep is needed or used.
    await expect(page.getByText(ANSWER_SAVED_SIGNAL, { exact: true })).toBeVisible({
      timeout: 30_000,
    })

    await page.reload()

    // Durable readback: the reloaded page is server-rendered from the persisted
    // answer, so the chosen value comes back selected.
    await expect(
      page
        .getByRole("radiogroup", { name: "Escala de resposta" })
        .getByRole("radio", { name: new RegExp(`^${ANSWER_SCORE}`) })
    ).toHaveAttribute("aria-checked", "true", { timeout: 30_000 })
  })

  test("10. submitting closes the assessment for editing", async ({ page }) => {
    await enterAs(page, "employee")
    await openAssessmentsHome(page)
    await page.getByRole("link", { name: "Abrir avaliação" }).click()
    await page.waitForURL(/\/app\/assessments\/responses\/[0-9a-f-]{36}(\?|$)/, {
      timeout: 30_000,
    })

    await page.getByRole("button", { name: "Enviar avaliação" }).click()
    await expect(page.getByRole("heading", { name: SUBMIT_CONFIRM_HEADING })).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole("button", { name: "Confirmar envio" }).click()

    await expect(page.getByText(SUBMIT_SUCCESS_MESSAGE, { exact: true })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByRole("heading", { name: SUBMIT_CONFIRM_HEADING })).toBeHidden({
      timeout: 15_000,
    })

    await page.reload()

    // Immutability, proven the way a user experiences it: the response page
    // stops rendering the execution workspace altogether once the status is
    // submitted, so there is nothing left to edit and nothing left to send.
    await expect(page.getByText("Avaliação enviada", { exact: true })).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      page.getByRole("radiogroup", { name: "Escala de resposta" })
    ).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Enviar avaliação" })).toHaveCount(0)
  })

  test("11. the score is the server's, and the spec only reads it", async ({ page }) => {
    await enterAs(page, "employee")
    await openAssessmentsHome(page)

    // Reached from "Meus resultados", which is the evaluatee's own surface.
    await page.getByRole("link", { name: "Ver resultado" }).first().click()
    await page.waitForURL(/\/app\/assessments\/responses\/[0-9a-f-]{36}/, { timeout: 30_000 })

    // `response-scale-weighted-v1` runs inside
    // `get_tenant_assessment_scored_result_v1` (0115/0116). This asserts the
    // SHAPE of what the product rendered — a formatted percentage — and never
    // reconstructs the value. A spec that computed the expected number would be
    // a second implementation of the formula and would agree with itself even
    // when the server was wrong.
    await expect(page.getByText(RENDERED_SCORE).first()).toBeVisible({ timeout: 30_000 })
  })

  test("12. the assessed person sees their own result in Meus resultados", async ({ page }) => {
    const cycle = assessmentResultCycleName(manifest().runId)

    await enterAs(page, "employee")
    await openAssessmentsHome(page)

    // Still the employee: no administrative role anywhere in this proof.
    const results = page.getByRole("heading", { name: "Meus resultados" })
    await expect(results).toBeVisible({ timeout: 30_000 })

    await expect(page.getByRole("heading", { name: cycle })).toBeVisible({ timeout: 30_000 })

    // The status shares its paragraph with the submission date — "Enviada em
    // 09/09/2026" — so this matches the label rather than the whole node.
    await expect(page.getByText(SUBMITTED_STATUS_LABEL).first()).toBeVisible()
    await expect(page.getByText(RENDERED_SCORE).first()).toBeVisible()
  })
})
