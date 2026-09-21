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

import { expect, test, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi, signOutThroughUi } from "../auth/login"
import { adminClient } from "../helpers/admin-client"
import {
  createDevelopmentFixture,
  developmentCompetencyName,
  developmentTemplateName,
  DEVELOPMENT_CURRENT_LEVEL,
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
    const subject = actor(SUBJECT)
    if (!subject.personId) throw new Error("E2E_FIXTURE_SUBJECT_PERSON_MISSING")
    await createDevelopmentFixture({
      companyId: tenantACompanyId(),
      subjectPersonId: subject.personId,
      runId: manifest().runId,
    })

    await enterAs(page, AUTHOR)
    await templatesHome(page)

    const name = developmentTemplateName(manifest().runId)
    await page.locator("#name").fill(name)
    await page.locator("#description").fill("Trilha de desenvolvimento do run E2E.")
    await page.getByRole("button", { name: "Criar template" }).click()

    // 3. the container id comes from the canonical readback, never predicted.
    await page.waitForURL(/\/app\/development\/templates\/[0-9a-f-]{36}/, { timeout: 30_000 })
    templateId = page.url().split("/").pop() ?? ""
    expect(templateId).toMatch(/^[0-9a-f-]{36}$/)

    // 2. a draft is discoverable immediately — the whole point of the lifecycle.
    await templatesHome(page)
    await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText("Rascunho")

    await page.goto(`/app/development/templates/${templateId}`)
    await page.getByRole("button", { name: "Adicionar competência" }).click()
    await page.getByRole("combobox").first().selectOption({
      label: developmentCompetencyName(manifest().runId),
    })
    await page.getByRole("button", { name: "Adicionar", exact: true }).click()
    await expect(page.getByText(developmentCompetencyName(manifest().runId))).toBeVisible({
      timeout: 30_000,
    })

    for (const title of [ACTION_ONE, ACTION_TWO]) {
      await page.getByRole("button", { name: "Adicionar ação", exact: true }).first().click()
      await page.locator("#title").fill(title)
      await page.getByRole("button", { name: "Adicionar ação de desenvolvimento" }).click()
      await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 30_000 })
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
    await page.getByRole("button", { name: "Plano de Desenvolvimento Individual" }).first().click()
    await page.getByLabel("Template publicado").selectOption({
      label: new RegExp(developmentTemplateName(manifest().runId)).source,
    })
    await page.getByLabel("Selecione um responsável").selectOption({
      label: new RegExp(actor(SUBJECT).fullName).source,
    })

    // 8. readiness must succeed before confirmation is offered.
    await page.getByRole("button", { name: "Verificar aplicação" }).click()
    await expect(page.getByRole("button", { name: "Confirmar aplicação" })).toBeEnabled({
      timeout: 30_000,
    })

    // 9. the single authorized application.
    await page.getByRole("button", { name: "Confirmar aplicação" }).click()
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
    const firstRow = page.getByRole("row", { name: new RegExp(ACTION_ONE) })
    await firstRow.getByRole("button", { name: "Iniciar ação" }).click()
    await confirm(page, ACTION_SAVED)
    await page.reload()
    await expect.poll(async () => {
      const actions = await readActions()
      return actions.find((action) => action.title === ACTION_ONE)?.status
    }, { timeout: 30_000 }).toBe("in_progress")

    // 16. complete. Canonical progress moves to 50% of two actions, derived by
    // the server; the browser never computes it.
    await page.getByRole("row", { name: new RegExp(ACTION_ONE) })
      .getByRole("button", { name: "Concluir ação" }).click()
    await confirm(page, ACTION_SAVED)
    await page.reload()
    await expect.poll(async () => {
      const actions = await readActions()
      return actions.find((action) => action.title === ACTION_ONE)?.status
    }, { timeout: 30_000 }).toBe("completed")
    await expect(page.getByText("50%")).toBeVisible({ timeout: 30_000 })

    // 17. the subject may not skip — skip is a management transition.
    await expect(
      page.getByRole("row", { name: new RegExp(ACTION_TWO) })
        .getByRole("button", { name: "Ignorar ação" }),
    ).toHaveCount(0)

    await switchTo(page, MANAGER)
    await openPlan(page)
    const secondRow = page.getByRole("row", { name: new RegExp(ACTION_TWO) })
    await secondRow.getByLabel("Motivo privado para ignorar").fill(SKIP_REASON)
    await secondRow.getByRole("button", { name: "Ignorar ação" }).click()
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
    await page.getByLabel("Final").check()
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
