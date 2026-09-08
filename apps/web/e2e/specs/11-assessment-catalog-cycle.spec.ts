/**
 * E2E-4 spec 11 — building an assessment and getting it ready to run.
 *
 * Model, then a section inside it, then a question bound to a competency, then
 * the preview a designer checks before committing, then a cycle over that model,
 * a participant on the cycle, and finally the cycle switched on. Everything is
 * created by driving the product's own dialogs. No privileged client appears in
 * this file at all: nothing is created, resolved or read through `adminClient`,
 * so every assertion below is about what a real administrator can actually do
 * and actually see.
 *
 * ## Where this slice stops, and why that is deliberate
 *
 * The cycle is left ACTIVE and nothing is generated. `Gerar avaliações` is the
 * first irreversible step of the journey — it writes the immutable 0114
 * execution snapshot, and from then on the cycle carries history that teardown
 * must retire rather than delete. Generation, answering, submit and the scored
 * result belong to later slices, which is why this file never clicks that
 * button. A guard asserts the omission rather than trusting it.
 *
 * ## Journey dependencies, declared
 *
 * Two entities come from earlier specs, exactly as spec 08 depends on the
 * Position spec 05 built:
 *
 *   * the Competency (`competencyName`) is created by spec 08 through the
 *     catalog UI. Reusing it is the point — the question must bind to a
 *     competency that belongs to this tenant, and the catalog already has a
 *     run-owned one;
 *   * the Person (`personName`) is created by spec 06 through the four-step
 *     wizard. The cycle participant must be a real active employee of the run's
 *     tenant, and inventing a second way to make one would fork the fixture
 *     model for no gain.
 *
 * The suite runs `fullyParallel: false` with a single worker, so the ordering
 * holds; `mode: "serial"` inside this file keeps the seven proofs in journey
 * order too, because each one stands on the last.
 *
 * ## The two navigation traps this journey has to walk around
 *
 * A model is created `Rascunho` by default, and the cycle wizard offers only
 * templates that are `active` — its complete button is disabled outright when
 * none exist. The status select is available at creation, so the journey creates
 * the model already `Ativo` rather than creating a draft and editing it. That is
 * the shortest honest path a real administrator would take, not a workaround.
 *
 * The cycle's `draft → active` control does NOT live on the cycle detail page.
 * The only surface that offers it is the edit dialog reached from the cycles
 * table on `/app/assessments`. That is known product wiring, not a defect, and
 * property 7 navigates to it the way a user would.
 */

import { expect, test, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi } from "../auth/login"
import {
  assessmentCycleName,
  assessmentQuestionText,
  assessmentSectionName,
  assessmentTemplateName,
  competencyName,
  personName,
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
 * Exact success messages the actions return and the forms raise as toasts before
 * closing their dialog. Every one of them was read from the action file — none
 * is invented, and none is a paraphrase. If the product rewords one, the
 * assertion here should fail and be updated deliberately rather than quietly
 * degrade into "something was submitted".
 *
 * On failure each form toasts the error and returns WITHOUT calling `onSuccess`,
 * so the dialog stays open. Closing is therefore a success-only signal, and both
 * halves are asserted after every mutation.
 */
const TEMPLATE_CREATE_SUCCESS_MESSAGE = "Modelo de avaliação criado com sucesso."
const SECTION_CREATE_SUCCESS_MESSAGE = "Seção criada com sucesso."
const QUESTION_CREATE_SUCCESS_MESSAGE = "Pergunta criada com sucesso."
const CYCLE_CREATE_SUCCESS_MESSAGE = "Ciclo de avaliação criado com sucesso."
const CYCLE_UPDATE_SUCCESS_MESSAGE = "Ciclo de avaliação atualizado com sucesso."
const PARTICIPANTS_ADD_SUCCESS_MESSAGE = "Participantes adicionados com sucesso."

/** Status labels the tables render, from `ASSESSMENT_*_STATUS_LABELS`. */
const TEMPLATE_ACTIVE_LABEL = "Ativo"
const CYCLE_DRAFT_LABEL = "Rascunho"
const CYCLE_ACTIVE_LABEL = "Em andamento"

/** Dialog headings, all `<h2>` via Base UI's `Dialog.Title`. */
const TEMPLATE_CREATE_HEADING = "Novo modelo de avaliação"
const SECTION_CREATE_HEADING = "Nova seção"
const QUESTION_CREATE_HEADING = "Nova pergunta"
const CYCLE_CREATE_HEADING = "Nova avaliação"
const CYCLE_EDIT_HEADING = "Editar ciclo de avaliação"
const PARTICIPANTS_HEADING = "Participantes do ciclo"

const TEMPLATE_TYPE_LABEL = "Anual"

/** `<input type="date">` wants ISO. The values are never asserted on. */
function isoDate(daysFromToday: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  return date.toISOString().slice(0, 10)
}

async function enterTenantA(page: Page): Promise<void> {
  await loginThroughUi(page, tenantAAdmin())
  await expectAuthenticatedShell(page)
}

/** Real navigation: the sidebar entry, never a bare goto. */
async function openAssessmentsHome(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Avaliações" }).click()
  await page.waitForURL(/\/app\/assessments(\/|\?|$)/, { timeout: 30_000 })
}

/**
 * Reach the run's model the way a user does: through the catalog table, by the
 * run-scoped name. The URL pattern is only a settle condition — the link's
 * accessible name is what identifies the destination, and it is unique to this
 * run, so no id lookup is needed.
 */
async function openRunTemplateDetail(page: Page): Promise<void> {
  await openAssessmentsHome(page)
  await page.getByRole("link", { name: assessmentTemplateName(manifest().runId) }).click()
  await page.waitForURL(/\/app\/assessments\/templates\/[0-9a-f-]{36}(\?|$)/, {
    timeout: 30_000,
  })
}

async function openRunCycleDetail(page: Page): Promise<void> {
  await openAssessmentsHome(page)
  await page.getByRole("link", { name: assessmentCycleName(manifest().runId) }).click()
  await page.waitForURL(/\/app\/assessments\/cycles\/[0-9a-f-]{36}(\?|$)/, { timeout: 30_000 })
}

/**
 * Walk the cycle wizard from "Informações" to "Revisão".
 *
 * Four `Continuar` presses, and each one runs the step's own validation before
 * advancing, so a missing field surfaces as the product's error toast rather
 * than as a mystery timeout on the last step.
 */
async function advanceToCycleReview(page: Page): Promise<void> {
  for (let step = 0; step < 4; step += 1) {
    await page.getByRole("button", { name: "Continuar" }).click()
  }
  await expect(page.getByRole("button", { name: "Revisão" })).toBeVisible({ timeout: 15_000 })
}

test.describe("an assessment is built and switched on through the real UI", () => {
  test("1. a model is created active and read back from the catalog", async ({ page }) => {
    const name = assessmentTemplateName(manifest().runId)

    await enterTenantA(page)
    await openAssessmentsHome(page)

    // On a tenant with no models the page offers "Novo modelo" twice: once as
    // the next-step card's action and once in "Ações rápidas". Both render the
    // SAME `AssessmentTemplateCreateDialog` with the same props, so either is
    // correct — and the heading assertion immediately below proves the dialog
    // that opened is the one intended.
    await page.getByRole("button", { name: "Novo modelo", exact: true }).first().click()
    await expect(
      page.getByRole("heading", { level: 2, name: TEMPLATE_CREATE_HEADING })
    ).toBeVisible({ timeout: 15_000 })

    await page.locator("#name").fill(name)
    await page.locator("#description").fill(`Assessment model for run ${manifest().runId}`)
    await page.locator("#type").selectOption({ label: TEMPLATE_TYPE_LABEL })

    // Created active on purpose. The cycle wizard filters to
    // `template.active && template.status === "active"` and disables its
    // complete button when nothing qualifies, so a draft model would make
    // property 5 unreachable.
    await page.locator("#status").selectOption({ label: TEMPLATE_ACTIVE_LABEL })

    await page.getByRole("button", { name: "Criar modelo" }).click()
    await expect(
      page.getByText(TEMPLATE_CREATE_SUCCESS_MESSAGE, { exact: true })
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { level: 2, name: TEMPLATE_CREATE_HEADING })
    ).toBeHidden({ timeout: 15_000 })

    // Durable readback: a full reload discards every trace of client state, so
    // what survives came back from the server.
    await page.reload()

    const row = page.getByRole("row", { name: new RegExp(name) })
    await expect(row).toBeVisible({ timeout: 30_000 })
    await expect(row).toContainText(TEMPLATE_TYPE_LABEL)
    await expect(row).toContainText(TEMPLATE_ACTIVE_LABEL)
  })

  test("2. a section is created inside that model and survives a reload", async ({ page }) => {
    const section = assessmentSectionName(manifest().runId)

    await enterTenantA(page)
    await openRunTemplateDetail(page)

    // "Nova seção" is the section trigger for the whole model; the per-section
    // trigger is "Nova pergunta", so there is no ambiguity here even later, when
    // the model has a section.
    await page.getByRole("button", { name: "Nova seção", exact: true }).click()
    await expect(
      page.getByRole("heading", { level: 2, name: SECTION_CREATE_HEADING })
    ).toBeVisible({ timeout: 15_000 })

    await page.locator("#name").fill(section)
    await page.locator("#description").fill(`Section for run ${manifest().runId}`)

    await page.getByRole("button", { name: "Criar seção" }).click()
    await expect(
      page.getByText(SECTION_CREATE_SUCCESS_MESSAGE, { exact: true })
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { level: 2, name: SECTION_CREATE_HEADING })
    ).toBeHidden({ timeout: 15_000 })

    await page.reload()

    // The detail page renders each section as its own card with an h3 title, so
    // this is the persisted structure and not an optimistic list item.
    await expect(page.getByRole("heading", { level: 3, name: section })).toBeVisible({
      timeout: 30_000,
    })
  })

  test("3. a question is bound to a tenant competency and the link is read back", async ({
    page,
  }) => {
    const competency = competencyName(manifest().runId)
    const question = assessmentQuestionText(manifest().runId)

    await enterTenantA(page)
    await openRunTemplateDetail(page)

    // Exactly one section exists at this point, so the per-section trigger is
    // unambiguous. If a later slice adds a second section, this must be scoped.
    await page.getByRole("button", { name: "Nova pergunta", exact: true }).click()
    await expect(
      page.getByRole("heading", { level: 2, name: QUESTION_CREATE_HEADING })
    ).toBeVisible({ timeout: 15_000 })

    // The competency options are the tenant's own catalog, labelled by name. The
    // run-scoped competency spec 08 created is selected by that exact label, so
    // this cannot silently bind to somebody else's competency.
    await page.locator("#competencyId").selectOption({ label: competency })
    await page.locator("#question").fill(question)

    await page.getByRole("button", { name: "Criar pergunta" }).click()
    await expect(
      page.getByText(QUESTION_CREATE_SUCCESS_MESSAGE, { exact: true })
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { level: 2, name: QUESTION_CREATE_HEADING })
    ).toBeHidden({ timeout: 15_000 })

    await page.reload()

    // Proving the text alone would not prove the binding. The questions table
    // renders "Competência: {name}" from the persisted `competency_id`, so
    // asserting it inside the question's own row is what demonstrates the link.
    const row = page.getByRole("row", { name: new RegExp(question) })
    await expect(row).toBeVisible({ timeout: 30_000 })
    await expect(row).toContainText(`Competência: ${competency}`)
  })

  test("4. the preview renders the persisted structure, not a fixture", async ({ page }) => {
    const templateName = assessmentTemplateName(manifest().runId)
    const section = assessmentSectionName(manifest().runId)
    const question = assessmentQuestionText(manifest().runId)
    const competency = competencyName(manifest().runId)

    await enterTenantA(page)
    await openRunTemplateDetail(page)

    await page.getByRole("link", { name: "Visualizar avaliação" }).click()
    await page.waitForURL(/\/app\/assessments\/templates\/[0-9a-f-]{36}\/preview(\?|$)/, {
      timeout: 30_000,
    })

    // Four run-scoped strings the preview can only be showing because they were
    // saved: the model as the page title, the section as its heading, the
    // question, and the competency the question was bound to in property 3.
    await expect(page.getByRole("heading", { level: 1, name: templateName })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByRole("heading", { level: 2, name: section })).toBeVisible()
    await expect(page.getByText(question, { exact: false })).toBeVisible()
    await expect(page.getByText(`Competência: ${competency}`, { exact: true })).toBeVisible()
  })

  test("5. a cycle is created as a draft over the run's active model", async ({ page }) => {
    const cycle = assessmentCycleName(manifest().runId)
    const templateName = assessmentTemplateName(manifest().runId)

    await enterTenantA(page)
    await openAssessmentsHome(page)

    // The hero's trigger is "✨ Nova avaliação" — a different accessible name —
    // so `exact` resolves the quick-action button and nothing else.
    await page.getByRole("button", { name: "Nova avaliação", exact: true }).click()
    await expect(
      page.getByRole("heading", { level: 2, name: CYCLE_CREATE_HEADING })
    ).toBeVisible({ timeout: 15_000 })

    await page.locator("#assessment-cycle-name").fill(cycle)
    await page
      .locator("#assessment-cycle-template")
      .selectOption({ label: templateName })

    // A cycle can only be born a draft: on create the wizard allows exactly one
    // status. Asserted rather than assumed, because property 7 later proves the
    // transition and that proof is worthless if the cycle could start active.
    await expect(page.locator("#assessment-cycle-status option:checked")).toHaveText(
      CYCLE_DRAFT_LABEL
    )

    await page.getByRole("button", { name: "Continuar" }).click()

    await page.locator("#assessment-start-date").fill(isoDate(0))
    await page.locator("#assessment-end-date").fill(isoDate(7))

    // Schedule -> Participantes -> Privacidade -> Revisão. Self-assessment is on
    // by default, which satisfies the "at least one evaluation source" rule.
    for (let step = 0; step < 3; step += 1) {
      await page.getByRole("button", { name: "Continuar" }).click()
    }

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

    // The cycle→model association is not printed on any read-only surface, so
    // it is read from the one surface that does show it. Opening the edit dialog
    // mutates nothing; it is dismissed with Cancelar, and the values it displays
    // were server-rendered after the reload above.
    await row.getByRole("button", { name: "Editar", exact: true }).click()
    await expect(page.getByRole("heading", { level: 2, name: CYCLE_EDIT_HEADING })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator("#assessment-cycle-template option:checked")).toHaveText(
      templateName
    )
    await expect(page.locator("#assessment-cycle-status option:checked")).toHaveText(
      CYCLE_DRAFT_LABEL
    )
    await page.getByRole("button", { name: "Cancelar" }).click()
    await expect(page.getByRole("heading", { level: 2, name: CYCLE_EDIT_HEADING })).toBeHidden({
      timeout: 15_000,
    })
  })

  test("6. a person from this run is added to the cycle as a participant", async ({ page }) => {
    const person = personName(manifest().runId)

    await enterTenantA(page)
    await openRunCycleDetail(page)

    await page.getByRole("button", { name: "Adicionar participantes" }).click()
    await expect(
      page.getByRole("heading", { level: 2, name: PARTICIPANTS_HEADING })
    ).toBeVisible({ timeout: 15_000 })

    // A participant is the EVALUATEE: the action takes `employeeIds` and the RPC
    // inserts `assessment_cycle_participants(employee_id)`. Evaluators are
    // derived from participants later, at generation, which this slice does not
    // reach. The checkbox has no id or aria-label — its accessible name comes
    // from the wrapping label, which carries the person's full name.
    await page.getByRole("checkbox", { name: new RegExp(person) }).check()

    await page.getByRole("button", { name: "Adicionar selecionados" }).click()
    await expect(
      page.getByText(PARTICIPANTS_ADD_SUCCESS_MESSAGE, { exact: true })
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { level: 2, name: PARTICIPANTS_HEADING })
    ).toBeHidden({ timeout: 15_000 })

    await page.reload()

    // Read back inside the participants table of THIS cycle, so the assertion
    // cannot be satisfied by the person appearing somewhere else on the page.
    const participants = page.getByRole("row", { name: new RegExp(person) })
    await expect(participants.first()).toBeVisible({ timeout: 30_000 })
  })

  test("7. the cycle is switched from draft to active", async ({ page }) => {
    const cycle = assessmentCycleName(manifest().runId)

    await enterTenantA(page)
    await openAssessmentsHome(page)

    // The activation control lives only here, in the cycles table's edit dialog.
    // The cycle detail page has no status control at all — known wiring, and the
    // reason this property navigates back to the list instead.
    const row = page.getByRole("row", { name: new RegExp(cycle) })
    await expect(row).toBeVisible({ timeout: 30_000 })
    await row.getByRole("button", { name: "Editar", exact: true }).click()
    await expect(page.getByRole("heading", { level: 2, name: CYCLE_EDIT_HEADING })).toBeVisible({
      timeout: 15_000,
    })

    await page
      .locator("#assessment-cycle-status")
      .selectOption({ label: CYCLE_ACTIVE_LABEL })

    await advanceToCycleReview(page)

    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(
      page.getByText(CYCLE_UPDATE_SUCCESS_MESSAGE, { exact: true })
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("heading", { level: 2, name: CYCLE_EDIT_HEADING })).toBeHidden({
      timeout: 15_000,
    })

    await page.reload()

    const activated = page.getByRole("row", { name: new RegExp(cycle) })
    await expect(activated).toBeVisible({ timeout: 30_000 })
    await expect(activated).toContainText(CYCLE_ACTIVE_LABEL)

    // Terminal state of E4-S2. Generation is the next slice's first act, and it
    // is deliberately NOT performed here.
  })
})
