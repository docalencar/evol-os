/**
 * E2E-6 — the Development journey, end to end, against the frozen D-E2E0 contract.
 *
 * Implements `docs/Execution/D-E2E0-HOSTED-DEVELOPMENT-E2E-CONTRACT.md`. The step
 * numbers below are that document's numbers, so a failure names the clause it
 * broke rather than a line of test code.
 *
 * ## Two things this spec refuses to do
 *
 * It never proves a mutation from the browser alone. Every state change asserts a
 * visible outcome AND an independent re-read of canonical state through the
 * service-role client, because a toast is a claim and a row is a fact.
 *
 * It never reads the application ledger. `0069` closed those four relations to
 * `service_role` and `0134` closed them to `authenticated`; they are internal
 * evidence. That the application happened is proved by the plan existing with its
 * historical origin, and by retention counts through the counts-only boundary.
 * A direct ledger read here would be a contract violation, not a shortcut.
 */

import { expect, test, type Locator, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi, signOutThroughUi } from "../auth/login"
import { adminClient } from "../helpers/admin-client"
import {
  createDevelopmentFixture,
  developmentCompetencyName,
  developmentTemplateName,
  DEVELOPMENT_CURRENT_LEVEL,
  DEVELOPMENT_EXPECTED_LEVEL,
} from "../fixtures/development-fixture"
import { readManifest, type RunManifest, type SyntheticRole } from "../helpers/run-context"

test.describe.configure({ mode: "serial" })

/**
 * Actor mapping, resolved against the harness the repository already has rather
 * than inventing identities (D-E2E0 §2, §12).
 *
 *   admin       → owner/admin/hr authoring actor
 *   manager     → applies a published template to a direct report
 *   evaluatee   → THE SUBJECT. The fixture places only this person under the
 *                 synthetic manager, so it is the only real direct report.
 *   employee    → same-tenant nonparticipant. The fixture keeps it deliberately
 *                 unrelated; it is the established authorization probe.
 *   onboarding  → owns tenant B, so it is the foreign actor. No second fixture
 *                 company is created for this spec.
 */
const AUTHOR: SyntheticRole = "admin"
const MANAGER: SyntheticRole = "manager"
const SUBJECT: SyntheticRole = "evaluatee"
const UNRELATED: SyntheticRole = "employee"
const FOREIGN: SyntheticRole = "onboarding"

const FIRST_REVIEW = "Revisão periódica inicial do PDI."
const SECOND_REVIEW = "Segunda revisão periódica, registrada pelo gestor."
const FINAL_REVIEW = "Revisão final antes da conclusão do plano."
const SKIP_REASON = "Ação substituída por treinamento interno equivalente."
const ACTION_ONE = "Concluir curso de comunicação"
const ACTION_TWO = "Sessão de mentoria quinzenal"
const NO_ORIGIN_LABEL = "Sem template de origem"

/**
 * Server-action toasts. Every click that mutates is observed through one of these
 * BEFORE the page is reloaded.
 *
 * This is not politeness. Run 260907175655-ecd9b6 lost two tests to a reload
 * firing milliseconds after a click: once aborting the POST in flight, once
 * fetching server-rendered HTML from before the write committed. Neither was a
 * product fault and neither test noticed for thirty seconds. The harness guards
 * that shape structurally; this spec complies by observing the write, then
 * reloading to prove it survived.
 */
const ACTION_SAVED = "Ação atualizada com sucesso."
const REVIEW_SAVED = "Revisão registrada com sucesso."
const PLAN_SAVED = "Plano atualizado com sucesso."

async function confirm(page: Page, message: string): Promise<void> {
  await expect(page.getByText(message, { exact: true })).toBeVisible({ timeout: 30_000 })
}

let planId = ""
let templateId = ""

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

function tenantACompanyId(): string {
  const id = manifest().companyId
  if (!id) throw new Error("E2E_FIXTURE_TENANT_A_MISSING")
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

async function developmentHome(page: Page): Promise<void> {
  await page.goto("/app/development")
  await expect(
    page.getByRole("heading", { name: "Planos de Desenvolvimento Individual" }),
  ).toBeVisible({ timeout: 30_000 })
}

async function templatesHome(page: Page): Promise<void> {
  await page.goto("/app/development/templates")
  await expect(page.getByRole("heading", { name: "Templates de Desenvolvimento" })).toBeVisible({
    timeout: 30_000,
  })
}

async function openPlan(page: Page): Promise<void> {
  await page.goto(`/app/development/plans/${planId}`)
  await expect(page.getByText("Plano de desenvolvimento individual.")).toBeVisible({
    timeout: 30_000,
  })
}

// ---------------------------------------------------------------------------
// Surface addressing.
//
// Every authoring form in this product lives inside a `CrudCreateDialog`, which
// is a Radix dialog: the form is NOT in the DOM until its trigger is clicked.
// Run 260921160805-5d598c failed on exactly that — `#name` was waited for on the
// templates index, where it cannot exist. `openDialog` makes the precondition
// explicit, and scoping every field to the returned dialog also disambiguates
// the labels a trigger and its submit button share ("Adicionar ação" is both).
// ---------------------------------------------------------------------------

async function openDialog(scope: Page | Locator, trigger: string | RegExp) {
  await scope.getByRole("button", { name: trigger, exact: true }).first().click()
  // The dialog is a portal: it is a child of <body>, never of the scope that
  // owns the trigger, so it is always looked up from the page.
  const page = "page" in scope ? scope.page() : scope
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  return dialog
}

/**
 * Template goals are native `<details>` disclosures and the page never renders
 * one with `open`, so every server render collapses them. `<details>` keeps its
 * children in the DOM while closed, so they are present but not visible — which
 * is why run 260921164722-a2b764 timed out waiting for a button that genuinely
 * existed, on a page whose goal had been created successfully.
 *
 * Expansion is therefore a real precondition of the product, not a workaround.
 * Idempotent on purpose: whether a re-render preserves the open state is a
 * detail of React reconciliation this spec should not depend on either way.
 */
async function expandGoal(page: Page, competencyName: string): Promise<Locator> {
  const goal = page.locator("details").filter({ hasText: competencyName })
  await expect(goal).toBeVisible({ timeout: 30_000 })
  if (!(await goal.evaluate((element: HTMLDetailsElement) => element.open))) {
    await goal.locator("summary").click()
  }
  await expect(goal).toHaveJSProperty("open", true)
  return goal
}

/**
 * The plan page renders actions as nested `div` cards — there is no table and no
 * `row` role anywhere on it, so row-based scoping silently matches nothing and
 * every per-action click degrades into a 15s timeout.
 *
 * `.last()` is load-bearing: `filter` also matches any ancestor card that
 * contains the title, and in document order the innermost match comes last.
 */
function actionCard(page: Page, title: string) {
  return page
    .locator("div.rounded-lg.border.border-slate-200.bg-white")
    .filter({ hasText: title })
    .last()
}

/** Canonical identity, never a rendered label. */
function personIdOf(role: SyntheticRole): string {
  const id = actor(role).personId
  if (!id) throw new Error(`E2E_FIXTURE_PERSON_MISSING: ${role}`)
  return id
}

// ---------------------------------------------------------------------------
// Durable readback. Only relations a client role may still reach after `0134`:
// plans, goals, actions, reviews, private audit. Never the application ledger.
// ---------------------------------------------------------------------------

async function readPlan() {
  const { data, error } = await adminClient()
    .from("development_plans")
    .select("id, status, employee_id, template_id, title")
    .eq("id", planId)
    .single()
  if (error) throw new Error(`E2E_READBACK_PLAN_FAILED: ${error.message}`)
  return data
}

async function readActions() {
  const { data, error } = await adminClient()
    .from("development_actions")
    .select("id, title, status, goal_id")
    .eq("company_id", tenantACompanyId())
    .order("title")
  if (error) throw new Error(`E2E_READBACK_ACTIONS_FAILED: ${error.message}`)
  const goals = await adminClient()
    .from("development_goals")
    .select("id")
    .eq("plan_id", planId)
  if (goals.error) throw new Error(`E2E_READBACK_GOALS_FAILED: ${goals.error.message}`)
  const owned = new Set((goals.data ?? []).map((goal) => goal.id as string))
  return (data ?? []).filter((action) => owned.has(action.goal_id as string))
}

/**
 * Reviews are keyed on `development_plan_id` and typed by `type` — not `plan_id`
 * and `review_type`. Verified against `0130`, because a readback that silently
 * selects nothing would turn an append-only proof into a tautology.
 */
async function readReviews() {
  const { data, error } = await adminClient()
    .from("development_reviews")
    .select("id, summary, type, reviewed_at")
    .eq("development_plan_id", planId)
    .order("reviewed_at")
  if (error) throw new Error(`E2E_READBACK_REVIEWS_FAILED: ${error.message}`)
  return data ?? []
}

/** Counts only — the ledger itself stays closed (D-E2E0 §5). */
async function retentionCounts(): Promise<Record<string, number>> {
  const { data, error } = await adminClient().rpc("get_company_retention_pressure_v1", {
    p_company_id: tenantACompanyId(),
  })
  if (error) throw new Error(`E2E_READBACK_RETENTION_FAILED: ${error.message}`)
  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as Array<{ relation_name: string; row_count: number }>) {
    counts[row.relation_name] = Number(row.row_count)
  }
  return counts
}

test.describe("development journey: authoring, application, execution, reviews, completion", () => {
  // ------------------------------------------------------------------ A
  test("A. 1-4 an administrative actor authors and publishes a template", async ({ page }) => {
    const fixture = await createDevelopmentFixture({
      companyId: tenantACompanyId(),
      subjectPersonId: personIdOf(SUBJECT),
      runId: manifest().runId,
    })

    await enterAs(page, AUTHOR)
    await templatesHome(page)

    const name = developmentTemplateName(manifest().runId)
    const createDialog = await openDialog(page, "Novo Template")
    await createDialog.getByLabel("Nome", { exact: true }).fill(name)
    await createDialog
      .getByLabel("Descrição", { exact: true })
      .fill("Trilha de desenvolvimento do run E2E.")
    await createDialog.getByRole("button", { name: "Criar template" }).click()

    // 3. the container id comes from the canonical readback, never predicted.
    await page.waitForURL(/\/app\/development\/templates\/[0-9a-f-]{36}/, { timeout: 30_000 })
    templateId = page.url().split("/").pop() ?? ""
    expect(templateId).toMatch(/^[0-9a-f-]{36}$/)

    // 2. a draft is discoverable immediately — the whole point of the lifecycle.
    await templatesHome(page)
    await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText("Rascunho")

    await page.goto(`/app/development/templates/${templateId}`)

    // Selected by canonical id, not by rendered text: the competency option's
    // value IS the catalog id the fixture just created, and the target level is
    // pinned to the fixture's expectation rather than inheriting the form's
    // default of 3, so the resolver's re-verification has nothing to drift on.
    const competencyDialog = await openDialog(page, "Adicionar Competência")
    await competencyDialog.locator("#competencyId").selectOption(fixture.competencyId)
    await competencyDialog.locator("#targetLevel").selectOption(String(DEVELOPMENT_EXPECTED_LEVEL))
    await competencyDialog.getByRole("button", { name: "Adicionar", exact: true }).click()
    await expect(page.getByText(developmentCompetencyName(manifest().runId))).toBeVisible({
      timeout: 30_000,
    })

    const competencyName = developmentCompetencyName(manifest().runId)
    let added = 0
    for (const title of [ACTION_ONE, ACTION_TWO]) {
      // The action trigger lives INSIDE the goal's disclosure panel, so the goal
      // is expanded first and the trigger is resolved within that goal — which
      // also keeps the click unambiguous once the template has several goals.
      //
      // The trigger and the submit button carry the SAME accessible name, so the
      // submit is addressed through the dialog. The title input's id is
      // `title-<goalId>`, never `#title`.
      const goal = await expandGoal(page, competencyName)
      const actionDialog = await openDialog(goal, "Adicionar ação")
      await actionDialog.getByLabel("Título", { exact: true }).fill(title)
      await actionDialog.getByRole("button", { name: "Adicionar ação", exact: true }).click()

      // Browser-visible success, asserted on the goal's SUMMARY: the count is
      // rendered outside the collapsible panel, so this holds whether or not the
      // re-render leaves the disclosure open.
      added += 1
      await expect(page.locator("details").filter({ hasText: competencyName })).toContainText(
        added === 1 ? "1 ação de desenvolvimento" : `${added} ações de desenvolvimento`,
        { timeout: 30_000 },
      )
    }

    // Both actions are listed under the goal that owns them.
    const goal = await expandGoal(page, competencyName)
    for (const title of [ACTION_ONE, ACTION_TWO]) {
      await expect(goal.getByText(title, { exact: true })).toBeVisible({ timeout: 30_000 })
    }

    // 4. publish. The version becomes immutable and the container reads published.
    await page.getByRole("button", { name: "Publicar versão" }).click()
    await expect(page.getByText("Publicado")).toBeVisible({ timeout: 30_000 })

    const versions = await adminClient()
      .from("development_template_versions")
      .select("id, status, version_number")
      .eq("template_id", templateId)
    if (versions.error) throw new Error(`E2E_READBACK_VERSION_FAILED: ${versions.error.message}`)
    expect(versions.data).toHaveLength(1)
    expect(versions.data?.[0]?.status).toBe("published")
  })

  // ------------------------------------------------------------------ B
  test("B. 5-10 a manager applies the published template to a direct report", async ({ page }) => {
    const before = await retentionCounts()

    await switchTo(page, MANAGER)
    // 5. reached independently of the authoring surface.
    await developmentHome(page)

    // 6-7. discover the published template; select the eligible direct report.
    //
    // "Plano de Desenvolvimento Individual" is the dialog's TITLE; its trigger is
    // "Aplicar template". And "Selecione um responsável" is the owner select's
    // placeholder OPTION, not a label — targeting it put the subject in the
    // Responsável field. The subject is the Colaborador; the manager is the
    // Responsável, which is `required` and has no default.
    //
    // All three are selected by value, because the rendered option text is not
    // the bare name (templates render "<name> · v<n>").
    const applyDialog = await openDialog(page, "Aplicar template")
    await applyDialog.locator("#templateId").selectOption(templateId)
    await applyDialog.locator("#employeeId").selectOption(personIdOf(SUBJECT))
    await applyDialog.locator("#ownerId").selectOption(personIdOf(MANAGER))

    // 8. readiness must succeed before confirmation is offered. One button whose
    // label toggles once the readiness check returns ready.
    await applyDialog.getByRole("button", { name: "Verificar aplicação" }).click()
    await expect(applyDialog.getByRole("button", { name: "Confirmar aplicação" })).toBeEnabled({
      timeout: 30_000,
    })

    // 9. the single authorized application.
    await applyDialog.getByRole("button", { name: "Confirmar aplicação" }).click()
    await page.waitForURL(/\/app\/development\/plans\/[0-9a-f-]{36}/, { timeout: 60_000 })
    planId = page.url().split("/").pop() ?? ""
    expect(planId).toMatch(/^[0-9a-f-]{36}$/)

    // 10. durable readback: the plan exists, belongs to the subject, and carries
    // its historical origin. The ledger itself is never read.
    const plan = await readPlan()
    expect(plan.employee_id).toBe(actor(SUBJECT).personId)
    expect(plan.status).toBe("active")
    await expect(page.getByText(developmentTemplateName(manifest().runId))).toBeVisible()
    await expect(page.getByText(NO_ORIGIN_LABEL)).toBeHidden()

    // The application is proved to have happened by the retention counts moving,
    // not by inspecting the evidence rows themselves.
    const after = await retentionCounts()
    for (const relation of [
      "development_template_applications",
      "development_template_application_snapshots",
      "development_template_application_lineage",
    ]) {
      expect(after[relation]).toBe((before[relation] ?? 0) + 1)
    }

    const actions = await readActions()
    expect(actions.map((action) => action.title).sort()).toEqual([ACTION_ONE, ACTION_TWO].sort())
    expect(actions.every((action) => action.status === "pending")).toBe(true)
  })

  // ------------------------------------------------------------------ C
  test("C. 11-14 the PDI is visible to its participants and to nobody else", async ({ page }) => {
    // 11. the subject reads their own plan.
    await switchTo(page, SUBJECT)
    await openPlan(page)
    await expect(page.getByText(developmentTemplateName(manifest().runId))).toBeVisible()

    // 12. the responsible manager reads it.
    await switchTo(page, MANAGER)
    await openPlan(page)
    await expect(page.getByText(ACTION_ONE, { exact: true })).toBeVisible()

    // 13-14. nonparticipant and foreign actor are refused, and refused
    // identically to a plan that does not exist — absence is not an oracle.
    for (const role of [UNRELATED, FOREIGN] as const) {
      await switchTo(page, role)
      const response = await page.goto(`/app/development/plans/${planId}`)
      expect(response?.status()).toBe(404)
      await expect(page.getByText("Plano de desenvolvimento individual.")).toBeHidden()
    }
  })

  // ------------------------------------------------------------------ D
  test("D. 15-17 the subject executes, management skips, progress is server-derived", async ({
    page,
  }) => {
    await switchTo(page, SUBJECT)
    await openPlan(page)

    // 15. start, then re-read durable state rather than trusting the button.
    await actionCard(page, ACTION_ONE).getByRole("button", { name: "Iniciar ação" }).click()
    await confirm(page, ACTION_SAVED)
    await page.reload()
    await expect.poll(async () => {
      const actions = await readActions()
      return actions.find((action) => action.title === ACTION_ONE)?.status
    }, { timeout: 30_000 }).toBe("in_progress")

    // 16. complete. Canonical progress moves to 50% of two actions, derived by
    // the server; the browser never computes it.
    await actionCard(page, ACTION_ONE).getByRole("button", { name: "Concluir ação" }).click()
    await confirm(page, ACTION_SAVED)
    await page.reload()
    await expect.poll(async () => {
      const actions = await readActions()
      return actions.find((action) => action.title === ACTION_ONE)?.status
    }, { timeout: 30_000 }).toBe("completed")
    await expect(page.getByText("50%")).toBeVisible({ timeout: 30_000 })

    // 17. the subject may not skip — skip is a management transition.
    await expect(
      actionCard(page, ACTION_TWO).getByRole("button", { name: "Ignorar ação" }),
    ).toHaveCount(0)

    await switchTo(page, MANAGER)
    await openPlan(page)
    const secondCard = actionCard(page, ACTION_TWO)
    await secondCard.getByLabel("Motivo privado para ignorar").fill(SKIP_REASON)
    await secondCard.getByRole("button", { name: "Ignorar ação" }).click()
    await confirm(page, ACTION_SAVED)
    await page.reload()
    await expect.poll(async () => {
      const actions = await readActions()
      return actions.find((action) => action.title === ACTION_TWO)?.status
    }, { timeout: 30_000 }).toBe("skipped")
    await expect(page.getByText("100%")).toBeVisible({ timeout: 30_000 })
  })

  // ------------------------------------------------------------------ E
  test("E. 18-22 reviews are append-only and survive one another", async ({ page }) => {
    await switchTo(page, AUTHOR)
    await openPlan(page)

    await page.locator("#review-summary").fill(FIRST_REVIEW)
    await page.locator("#review-next-step").fill("Manter acompanhamento quinzenal.")
    await page.getByRole("button", { name: "Registrar revisão" }).click()
    await confirm(page, REVIEW_SAVED)
    await page.reload()
    await expect(page.getByText(FIRST_REVIEW, { exact: true })).toBeVisible({ timeout: 30_000 })

    // 19. the subject reads the history.
    await switchTo(page, SUBJECT)
    await openPlan(page)
    await expect(page.getByText(FIRST_REVIEW, { exact: true })).toBeVisible()
    // ...and cannot record one: recording is a management capability.
    await expect(page.getByRole("button", { name: "Registrar revisão" })).toHaveCount(0)

    // 20-21. a second review appends; the first is untouched; nothing edits or deletes.
    await switchTo(page, MANAGER)
    await openPlan(page)
    await page.locator("#review-summary").fill(SECOND_REVIEW)
    await page.getByRole("button", { name: "Registrar revisão" }).click()
    await confirm(page, REVIEW_SAVED)
    await page.reload()
    await expect(page.getByText(FIRST_REVIEW, { exact: true })).toBeVisible()
    await expect(page.getByText(SECOND_REVIEW, { exact: true })).toBeVisible()
    for (const label of ["Editar revisão", "Excluir revisão", "Remover revisão"]) {
      await expect(page.getByRole("button", { name: label })).toHaveCount(0)
    }

    // 22. the final review, recorded after the last action transition.
    await page.locator("#review-summary").fill(FINAL_REVIEW)
    // The review type is chosen with a button, not a checkbox. It stays disabled
    // until every action is terminal and at least one was completed — which block
    // D has just made true — so this also asserts that server-derived gate.
    const finalType = page.getByRole("button", { name: "Final", exact: true })
    await expect(finalType).toBeEnabled({ timeout: 30_000 })
    await finalType.click()
    await page.getByRole("button", { name: "Registrar revisão" }).click()
    await confirm(page, REVIEW_SAVED)
    await page.reload()

    const reviews = await readReviews()
    expect(reviews.map((review) => review.summary)).toEqual([
      FIRST_REVIEW,
      SECOND_REVIEW,
      FINAL_REVIEW,
    ])
    expect(reviews.at(-1)?.type).toBe("final")
  })

  // ------------------------------------------------------------------ F + G
  test("F/G. 23-29 completion is terminal, readable and irreversible", async ({ page }) => {
    await switchTo(page, AUTHOR)
    await openPlan(page)

    // 23-24. prerequisites are server-derived; completion is a management act.
    await expect(page.getByText("Pré-requisitos para conclusão")).toBeVisible()
    await page.getByRole("button", { name: "Concluir plano" }).click()
    await confirm(page, PLAN_SAVED)
    await page.reload()

    // 25. canonical completed state, re-read rather than inferred.
    await expect.poll(async () => (await readPlan()).status, { timeout: 30_000 }).toBe("completed")

    // 26. still readable to every authorized actor.
    for (const role of [SUBJECT, MANAGER] as const) {
      await switchTo(page, role)
      await openPlan(page)
      await expect(page.getByText(FINAL_REVIEW, { exact: true })).toBeVisible()
    }

    // 27-28. no reopen, and no mutation control that a terminal plan must not offer.
    await switchTo(page, AUTHOR)
    await openPlan(page)
    for (const label of [
      "Ativar plano",
      "Reabrir plano",
      "Concluir plano",
      "Registrar revisão",
      "Iniciar ação",
      "Concluir ação",
      "Ignorar ação",
    ]) {
      await expect(page.getByRole("button", { name: label })).toHaveCount(0)
    }

    // 29. and the refusals still hold after completion.
    for (const role of [UNRELATED, FOREIGN] as const) {
      await switchTo(page, role)
      const response = await page.goto(`/app/development/plans/${planId}`)
      expect(response?.status()).toBe(404)
    }

    // The retained evidence the journey necessarily wrote is still there. This is
    // what makes the run's terminal state RETIRED rather than CLEANED.
    const counts = await retentionCounts()
    expect(counts["development_template_application_snapshots"]).toBeGreaterThan(0)
    expect(counts["development_template_application_lineage"]).toBeGreaterThan(0)
    expect((await readReviews()).length).toBe(3)
    expect(DEVELOPMENT_CURRENT_LEVEL).toBeLessThan(4)
  })
})
