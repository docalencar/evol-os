/**
 * E2E-3 spec 08 — configuring what a role at a seniority is expected to know.
 *
 * Competency, then Seniority, then that Seniority applied to the run's Position,
 * then the contextual expectation at the intersection of the three. Every one of
 * them is created by driving the product's own dialogs; the privileged client
 * creates none of them, and is used only to resolve the id of the Position that
 * spec 05 already built through the UI.
 *
 * ## Configuration, not arithmetic
 *
 * This slice proves that the facts persist. It records no employee evidence and
 * asserts no gap — the derived value belongs to spec 09, which will read the
 * canonical 0123 boundary and expect `4 - 2 = 2`. The expectation written here
 * is deliberately level 4 so that arithmetic has something unmistakable to land
 * on later.
 *
 * ## Why the expectation targets the seniority, not Base
 *
 * Base would be the easier target — it is the dialog's default. But the product
 * claim worth proving is contextual expectation: the same competency can be
 * expected differently of a Júnior and a Sênior in the same Position. So the
 * journey selects the run-created specific profile and then asserts that Base
 * was left undefined. Landing on Base by accident would silently prove the
 * weaker claim.
 *
 * ## Serial, and dependent on spec 05
 *
 * Step 3 needs the Position spec 05 created. That is a declared journey
 * dependency, exactly as spec 06 already depends on spec 05, and it holds
 * because the suite runs `fullyParallel: false` with a single worker.
 */

import { expect, test, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi } from "../auth/login"
import { positionId } from "../fixtures/organization-lookup"
import {
  competencyName,
  positionName,
  seniorityCode,
  seniorityLabel,
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

function tenantACompanyId(): string {
  const companyId = manifest().companyId
  if (!companyId) throw new Error("E2E_FIXTURE_MISSING_COMPANY")
  return companyId
}

/**
 * Catalog defaults are set apart from the contextual values on purpose. If the
 * matrix ever started reading `competencies.expected_level` instead of the
 * position×seniority row, the assertions in step 4 would surface 3/Baixa rather
 * than 4/Crítica and fail — which is the point.
 */
const CATALOG_EXPECTED_LEVEL = "3"
const CATALOG_WEIGHT = "2"

/** Contextual expectation. Level 4 sets up spec 09's `4 - 2 = 2`. */
const EXPECTED_PROFICIENCY_LABEL = "Avançado" // level 4
const EXPECTED_WEIGHT_LABEL = "Crítica" // weight 5, distinct from the dialog default
const EXPECTED_TYPE_LABEL = "Essencial" // type "core", the dialog default

const SENIORITY_RANK = "70"

/**
 * The exact success message `setPositionSeniorityCompetencyAction` returns and
 * the dialog raises as a toast. Taken from the action, not invented — if the
 * product ever changes the wording, this assertion should fail and be updated
 * deliberately rather than silently degrade into "something was submitted".
 */
const SAVE_SUCCESS_MESSAGE = "Expectativa de competência salva."

/**
 * The exact success message `addPositionSeniorityAction` returns and the
 * AddPositionSeniorityDialog raises as a toast before closing. Taken from the
 * action, not invented.
 */
const APPLY_SUCCESS_MESSAGE = "Senioridade aplicada ao cargo."

/**
 * Exact success messages the catalog create actions return and their forms
 * raise as toasts before the dialog closes. Read from
 * `createCompetencyAction` and `createSeniorityLevelAction` — never invented.
 */
const COMPETENCY_CREATE_SUCCESS_MESSAGE = "Competência criada com sucesso."
const SENIORITY_CREATE_SUCCESS_MESSAGE = "Senioridade criada com sucesso."

async function enterTenantA(page: Page): Promise<void> {
  await loginThroughUi(page, tenantAAdmin())
  await expectAuthenticatedShell(page)
}

async function openCompanyHub(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Empresa" }).click()
  await page.waitForURL(/\/app\/company(\/|\?|$)/, { timeout: 30_000 })
}

/** Reach the run-owned Position detail page the way a user does. */
async function openRunPositionDetail(page: Page): Promise<void> {
  await openCompanyHub(page)
  await page.getByRole("link", { name: /Gerenciar cargos/i }).click()
  await page.waitForURL(/\/app\/company\/positions(\/|\?|$)/, { timeout: 30_000 })

  await page.getByRole("link", { name: positionName(manifest().runId) }).click()

  // The exact id comes from the canonical lookup, so the URL assertion cannot be
  // satisfied by some other position that happens to share a prefix.
  const id = await positionId(tenantACompanyId(), positionName(manifest().runId))
  await page.waitForURL(new RegExp(`/app/company/positions/${id}(\\?|$)`), {
    timeout: 30_000,
  })
}

test.describe("career expectations configured through the real UI", () => {
  test("a Competency is created from the catalog and read back after a reload", async ({
    page,
  }) => {
    const name = competencyName(manifest().runId)

    await enterTenantA(page)

    // Real navigation: the sidebar entry, not a goto.
    await page.getByRole("link", { name: "Competências" }).click()
    await page.waitForURL(/\/app\/competencies(\/|\?|$)/, { timeout: 30_000 })

    // The trigger is "Nova Competência"; the dialog heading is "Nova
    // competência". Same words, different case — matching loosely here would
    // find the heading and click nothing.
    await page.getByRole("button", { name: "Nova Competência", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Nova competência" })).toBeVisible()

    await page.locator("#name").fill(name)
    await page.locator("#description").fill(`Competency fixture for run ${manifest().runId}`)
    await page.locator("#category").selectOption({ label: "Técnica" })
    await page.locator("#expectedLevel").fill(CATALOG_EXPECTED_LEVEL)
    await page.locator("#weight").fill(CATALOG_WEIGHT)

    await page.getByRole("button", { name: "Criar competência" }).click()

    // Primary success signal BEFORE the list readback.
    //
    // Waiting for the name to appear in the table waits on a *secondary* effect:
    // it depends on the action returning, `revalidatePath("/app/competencies")`
    // firing, and the list re-rendering. When the write hangs — as the seniority
    // write did in run 260907184219-ec1320, POST status -1 with the dialog still
    // open — that wait burns its full timeout and reports "row not found", which
    // says nothing about whether the write was even accepted.
    //
    // Contract read from the action, the form and the dialog: on success
    // `createCompetencyAction` returns "Competência criada com sucesso.", the
    // form toasts it and calls onSuccess, which closes the dialog; on failure it
    // toasts the error and returns, leaving the dialog OPEN. Closing is
    // therefore a success-only signal.
    await expect(
      page.getByText(COMPETENCY_CREATE_SUCCESS_MESSAGE, { exact: true })
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("heading", { name: "Nova competência" })).toBeHidden({
      timeout: 15_000,
    })

    await expect(page.getByText(name, { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })

    // Durable readback: a full reload discards every trace of client state, so
    // what survives came back from the server.
    await page.reload()

    const row = page.getByRole("row", { name: new RegExp(name) })
    await expect(row).toBeVisible({ timeout: 30_000 })
    await expect(row).toContainText("Técnica")
    await expect(row).toContainText(CATALOG_EXPECTED_LEVEL)
    await expect(row).toContainText(CATALOG_WEIGHT)
  })

  test("a Seniority is created in the company catalog and survives a reload", async ({
    page,
  }) => {
    const code = seniorityCode(manifest().runId)
    const label = seniorityLabel(manifest().runId)

    await enterTenantA(page)
    await openCompanyHub(page)

    await page.getByRole("link", { name: /Gerenciar senioridades/i }).click()
    await page.waitForURL(/\/app\/company\/seniority(\/|\?|$)/, { timeout: 30_000 })

    await page.getByRole("button", { name: "Nova senioridade", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Nova senioridade" })).toBeVisible()

    await page.locator("#code").fill(code)
    await page.locator("#label").fill(label)
    await page.locator("#rank").fill(SENIORITY_RANK)

    await page.getByRole("button", { name: "Criar senioridade" }).click()

    // Primary success signal BEFORE the list readback. This is the exact test
    // that failed in run 260907184219-ec1320: the POST to /app/company/seniority
    // never returned (status -1), the "Nova senioridade" dialog was still open
    // in the captured DOM, and the spec spent 30s hunting for a label in a list
    // that was never going to update — then the whole test timed out at 60s.
    //
    // Contract read from the action, the form and the dialog: on success
    // `createSeniorityLevelAction` returns "Senioridade criada com sucesso.",
    // the form toasts it and calls onSuccess, which closes the dialog; on
    // failure it toasts the error and returns, leaving the dialog OPEN.
    await expect(
      page.getByText(SENIORITY_CREATE_SUCCESS_MESSAGE, { exact: true })
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("heading", { name: "Nova senioridade" })).toBeHidden({
      timeout: 15_000,
    })

    await expect(page.getByText(label, { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })

    await page.reload()

    const row = page.getByRole("row", { name: new RegExp(label) })
    await expect(row).toBeVisible({ timeout: 30_000 })
    await expect(row).toContainText(code)
    await expect(row).toContainText(SENIORITY_RANK)
  })

  test("the Seniority is applied to the run's Position and stays applicable", async ({
    page,
  }) => {
    const label = seniorityLabel(manifest().runId)

    await enterTenantA(page)
    await openRunPositionDetail(page)

    // Scoped by the section's own heading text. `getByRole("region")` would not
    // work: a bare <section> only exposes that role once it has an accessible
    // name, and this one is titled by a plain <h2>.
    const applicable = page
      .locator("section")
      .filter({ hasText: "Senioridades aplicáveis a este cargo" })
      .first()

    await page.getByRole("button", { name: "Adicionar senioridade", exact: true }).click()
    await expect(
      page.getByRole("heading", { name: "Adicionar senioridade ao cargo" })
    ).toBeVisible()

    // The catalog select is server-rendered from the position's available
    // levels; wait for the run's own option rather than for a duration.
    const select = page.locator("#seniorityLevelId")
    await expect(select).toBeEnabled({ timeout: 30_000 })
    await expect(select.locator("option", { hasText: label })).toHaveCount(1, {
      timeout: 30_000,
    })
    await select.selectOption({ label })

    await page.getByRole("button", { name: "Aplicar", exact: true }).click()

    // Immediate write evidence, BEFORE the reload.
    //
    // Run 260907175655-ecd9b6 failed here, and the trace showed why: the reload
    // fired 1.6ms after the server action's POST started, aborting it in flight
    // (status -1) and re-rendering the page from the pre-mutation state. The
    // product was never at fault — the test raced its own write, and had been
    // winning that race by luck until then.
    //
    // Contract read from the action and the dialog, not invented: on success
    // `addPositionSeniorityAction` returns "Senioridade aplicada ao cargo.",
    // the dialog raises it as a success toast and closes; on failure it raises
    // the error and STAYS OPEN. So the dialog closing is itself a success-only
    // signal, and both are asserted.
    await expect(page.getByText(APPLY_SUCCESS_MESSAGE, { exact: true })).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.getByRole("heading", { name: "Adicionar senioridade ao cargo" })
    ).toBeHidden({ timeout: 15_000 })

    await page.reload()

    // Scoped to the applicability section, so the assertion cannot be satisfied
    // by the seniority appearing anywhere else on the page — the matrix header,
    // for instance. Base is not listed in this section at all.
    await expect(applicable.getByText(label, { exact: true })).toBeVisible({
      timeout: 30_000,
    })
  })

  test("the first contextual expectation is created for that Seniority and persists", async ({
    page,
  }) => {
    const competency = competencyName(manifest().runId)
    const seniority = seniorityLabel(manifest().runId)

    await enterTenantA(page)
    await openRunPositionDetail(page)

    // This is the affordance E3-P1 added. Before it, a position with no
    // expectation rows had no way to acquire its first one: the matrix editor
    // only ever opened from a cell, and cells exist only for competencies that
    // already have a row.
    await page
      .getByRole("button", { name: "Adicionar competência à matriz", exact: true })
      .click()
    await expect(
      page.getByRole("heading", { name: "Adicionar competência à matriz" })
    ).toBeVisible()

    // Deliberately NOT the default. The dialog opens on Base; the contextual
    // claim needs the specific profile.
    const profile = page.locator("#add-expectation-profile")
    await expect(profile.locator("option", { hasText: seniority })).toHaveCount(1, {
      timeout: 30_000,
    })
    await profile.selectOption({ label: seniority })

    const competencySelect = page.locator("#add-expectation-competency")
    await expect(competencySelect.locator("option", { hasText: competency })).toHaveCount(
      1,
      { timeout: 30_000 }
    )
    await competencySelect.selectOption({ label: competency })

    await page
      .locator("#add-expectation-level")
      .selectOption({ label: EXPECTED_PROFICIENCY_LABEL })
    await page.locator("#add-expectation-weight").selectOption({ label: EXPECTED_WEIGHT_LABEL })

    await page.getByRole("button", { name: "Salvar expectativa", exact: true }).click()

    // Immediate write evidence, BEFORE the reload.
    //
    // Run 260907120642-8774b5 failed here with an empty matrix after reload, and
    // the artifacts could not say whether the write had been rejected or the
    // readback was wrong — the spec only learned something was amiss 30s later,
    // waiting for a cell that never existed.
    //
    // This is the product's real contract, read from the action and the dialog,
    // not an invented string: on success the action returns
    // "Expectativa de competência salva.", the dialog raises it as a success
    // toast and closes; on failure it raises the error message and STAYS OPEN.
    // So a failed write now fails right here, and the error toast that explains
    // why is captured in the trace instead of being lost.
    await expect(page.getByText(SAVE_SUCCESS_MESSAGE, { exact: true })).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.getByRole("heading", { name: "Adicionar competência à matriz" })
    ).toBeHidden({ timeout: 15_000 })

    await page.reload()

    // The cell trigger's accessible name binds competency, profile and state
    // together, so a single locator cannot be satisfied by the right level under
    // the wrong competency or the wrong seniority.
    const cell = page.getByRole("button", {
      name: `Editar ${competency} no perfil ${seniority}. Personalizado.`,
    })
    await expect(cell).toBeVisible({ timeout: 30_000 })
    await expect(cell).toContainText("Personalizado")
    await expect(cell).toContainText(EXPECTED_PROFICIENCY_LABEL)
    await expect(cell).toContainText(EXPECTED_WEIGHT_LABEL)
    await expect(cell).toContainText(EXPECTED_TYPE_LABEL)

    // The catalog values must NOT be what the matrix shows. If expectations ever
    // started falling back to `competencies.expected_level`, this is where it
    // would surface.
    await expect(cell).not.toContainText("Proficiente") // catalog level 3
    await expect(cell).not.toContainText("Baixa") // catalog weight 2

    // Base was never written: the contextual expectation is genuinely scoped to
    // the seniority rather than inherited from a Base row created by accident.
    const baseCell = page.getByRole("button", {
      name: `Editar ${competency} no perfil Base. Não definido.`,
    })
    await expect(baseCell).toBeVisible()
  })
})
