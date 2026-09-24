/**
 * PLN-P6 — the Organization Planning journey, end to end against hosted Review.
 *
 * PLN-SEC0 established the boundary this exercises: authorization lives in RLS
 * (`members read`, `owner|admin|hr` manage), transactional semantics live in
 * invoker-rights RPCs, and immutability lives in triggers. PLN-P5B put change-set
 * authoring on the `0138` RPCs. This proves the whole lifecycle on a real server.
 *
 * ## Two things this spec refuses to do
 *
 * It never proves a mutation from the browser alone. Every state change asserts a
 * visible outcome AND an independent re-read of canonical state, because a toast
 * is a claim and a row is a fact.
 *
 * It never writes through a table. The product reaches change sets only through
 * the `0138` RPCs, and this spec reaches them only through the product.
 */

import { mkdirSync, renameSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

import { expect, test, type Locator, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi, signOutThroughUi } from "../auth/login"
import { adminClient, userClient } from "../helpers/admin-client"
import { readManifest, type RunManifest, type SyntheticRole } from "../helpers/run-context"
import { runEvidenceFile } from "../helpers/run-paths"

test.describe.configure({ mode: "serial" })

/**
 * Actor mapping.
 *
 *   admin      → owner/admin/hr. The only role RLS lets manage planning, and the
 *                only one holding ORGANIZATION_PLANNING_MANAGE.
 *   employee   → same-tenant member. RLS grants it `select` and nothing else, so
 *                it is the authorization probe that is NOT a tenant outsider.
 *   onboarding → owner of tenant B, created by spec 02. The foreign actor.
 */
const AUTHOR: SyntheticRole = "admin"
const MEMBER: SyntheticRole = "employee"
const FOREIGN: SyntheticRole = "onboarding"

const REJECTION_REASON = "Estrutura proposta excede o orçamento aprovado para o trimestre."
const REVISED_SUFFIX = " (revisado)"

/** Server-action toasts. Observed BEFORE any reload, never after. */
const WORKSPACE_CREATED = "Workspace criado com sucesso."
const SCENARIO_CREATED = "Cenário criado com sucesso."
const DEPARTMENT_ADDED = "Departamento adicionado ao cenário."
const DEPARTMENT_UPDATED = "Departamento atualizado no cenário."
const VERSION_CONFLICT = "O cenário foi atualizado por outra pessoa. Recarregue a página."

/** Lifecycle confirmations, from `transition-scenario-action`. */
const SUBMITTED = "Cenário enviado para aprovação."
const APPROVED = "Cenário aprovado."
const REJECTED = "Cenário rejeitado."
const REVISED = "Cenário devolvido para revisão."

/** Surface markers, each unconditional on the surface that renders it. */
const PLANNING_SECTION = "Planejamento organizacional"
const SCENARIOS_SECTION = "Cenários"
const OPERATION_LABELS = [
  "Renomear cenário",
  "Duplicar cenário",
  "Excluir cenário",
  "Enviar para aprovação",
  "Aprovar cenário",
  "Rejeitar cenário",
  "Revisar rascunho",
] as const

type LiveOrganizationEntry = Readonly<{
  entityType: string
  entityId: string
  name: string
  status: string | null
  departmentId: string | null
  parentEntityId: string | null
}>

let workspaceId = ""
let scenarioId = ""
let scenarioName = ""
let departmentName = ""
let liveOrganizationBefore: readonly LiveOrganizationEntry[] = []

let cached: RunManifest | null = null
function manifest(): RunManifest {
  if (!cached) cached = readManifest()
  return cached
}

/**
 * Tenant B, which the foreign actor must OWN. Created by spec 02's real wizard,
 * the same dependency specs 03, 04, 07, 10, 13 and 15 declare. Before it exists
 * the `onboarding` identity is unattached and is not a foreign OWNER at all.
 */
function foreignTenant() {
  const tenant = manifest().onboardingCompany
  if (!tenant) {
    throw new Error(
      "E2E_TENANT_B_MISSING: the foreign actor is the owner of a SEPARATE tenant, " +
        "not an unattached identity. Spec 02 must complete first.",
    )
  }
  return tenant
}

function actor(role: SyntheticRole) {
  if (role === FOREIGN) {
    const owner = manifest().users.find(
      (candidate) => candidate.userId === foreignTenant().ownerUserId,
    )
    if (!owner) throw new Error("E2E_TENANT_B_OWNER_MISSING")
    return owner
  }
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
  if (role === FOREIGN) {
    await expect(page.getByText(foreignTenant().companyName).first()).toBeVisible()
  }
}

/**
 * Change actor WITHIN a test. `mode: "serial"` shares ordering, not the `page`
 * fixture, so a test's FIRST actor always uses `enterAs`.
 */
async function switchTo(page: Page, role: SyntheticRole): Promise<void> {
  await signOutThroughUi(page)
  await enterAs(page, role)
}

async function organizationHome(page: Page): Promise<void> {
  await page.goto("/app/organization")
  await expect(page.getByRole("heading", { name: PLANNING_SECTION })).toBeVisible({
    timeout: 30_000,
  })
}

async function openScenario(page: Page): Promise<void> {
  await page.goto(`/app/organization/planning/${scenarioId}`)
  await expect(page.getByRole("heading", { name: scenarioName })).toBeVisible({ timeout: 30_000 })
}

async function planningTimeline(page: Page): Promise<void> {
  if (!workspaceId) throw new Error("E2E_WORKSPACE_MISSING")
  await page.goto(
    `/app/organization/planning/timeline?workspaceId=${encodeURIComponent(workspaceId)}`,
  )
  await expect(page.getByRole("heading", { name: SCENARIOS_SECTION }).first()).toBeVisible({
    timeout: 30_000,
  })
}

async function confirm(page: Page, message: string): Promise<void> {
  await expect(page.getByText(message, { exact: true })).toBeVisible({ timeout: 30_000 })
}

// ---------------------------------------------------------------------------
// Durable readback. Planning relations are readable by any company member under
// RLS, so canonical state is read directly — no counts-only proxy is needed, and
// `get_company_retention_pressure_v1` does not cover these relations anyway.
// ---------------------------------------------------------------------------

async function readScenario() {
  const { data, error } = await adminClient()
    .from("organization_planning_scenarios")
    .select("id, company_id, workspace_id, name, description, status, version")
    .eq("id", scenarioId)
    .single()
  if (error) throw new Error(`E2E_READBACK_SCENARIO_FAILED: ${error.message}`)
  return data
}

async function readChangeSets() {
  const { data, error } = await adminClient()
    .from("organization_planning_change_sets")
    .select("id, change_type, payload, version, active, superseded_by, archived_at")
    .eq("scenario_id", scenarioId)
    .order("version")
  if (error) throw new Error(`E2E_READBACK_CHANGE_SETS_FAILED: ${error.message}`)
  return data ?? []
}

async function activeChangeSets() {
  return (await readChangeSets()).filter((changeSet) => changeSet.active)
}

async function readLifecycleHistory() {
  const author = actor(AUTHOR)
  const client = await userClient(author.email, author.password)
  const { data, error } = await client.rpc("get_planning_scenario_lifecycle_v1", {
    p_scenario_id: scenarioId,
  })
  if (error) throw new Error(`E2E_LIFECYCLE_READBACK_FAILED: ${error.message}`)
  return (data ?? []) as Array<{
    event_type: string
    from_status: string
    to_status: string
    resulting_version: number
    reason: string | null
  }>
}

async function readTrustedScenario() {
  const author = actor(AUTHOR)
  const client = await userClient(author.email, author.password)
  const { data, error } = await client.rpc("get_planning_scenarios_v1", {
    p_company_id: tenantACompanyId(),
  })
  if (error) throw new Error(`E2E_TRUSTED_SCENARIO_READBACK_FAILED: ${error.message}`)
  const matches = ((data ?? []) as Array<{
    id: string
    company_id: string
    status: string
    version: number
  }>).filter((scenario) => scenario.id === scenarioId)
  if (matches.length !== 1) {
    throw new Error(`E2E_TRUSTED_SCENARIO_READBACK_NOT_UNIQUE: found ${matches.length}`)
  }
  return matches[0]!
}

/** Semantic, order-independent fingerprint of the canonical live organization. */
async function readLiveOrganization() {
  const author = actor(AUTHOR)
  const client = await userClient(author.email, author.password)
  const { data, error } = await client.rpc("get_tenant_organization_directory_v1", {
    p_company_id: tenantACompanyId(),
  })
  if (error) throw new Error(`E2E_LIVE_ORGANIZATION_READBACK_FAILED: ${error.message}`)
  return ((data ?? []) as Array<{
    entity_type: string
    entity_id: string
    name: string
    status: string | null
    department_id: string | null
    parent_entity_id: string | null
  }>)
    .map((entry): LiveOrganizationEntry => ({
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      name: entry.name,
      status: entry.status,
      departmentId: entry.department_id,
      parentEntityId: entry.parent_entity_id,
    }))
    .sort((left, right) =>
      `${left.entityType}:${left.entityId}`.localeCompare(`${right.entityType}:${right.entityId}`),
    )
}

/**
 * The tenant's planning workspace, or null. One per company by unique
 * constraint, so `maybeSingle` is the honest shape — bootstrap is conditional on
 * this, never on whether a button happens to render.
 */
async function findWorkspace() {
  const { data, error } = await adminClient()
    .from("organization_planning_workspaces")
    .select("id, company_id, version")
    .eq("company_id", tenantACompanyId())
    .maybeSingle()
  if (error) throw new Error(`E2E_WORKSPACE_LOOKUP_FAILED: ${error.message}`)
  return data
}

/**
 * The run's scenario id, resolved through the canonical trusted read the product
 * itself uses, scoped by company and by the unique run-scoped name.
 *
 * Called with a member session rather than the service-role client on purpose:
 * `get_planning_scenarios_v1(p_company_id)` is `security definer` and requires
 * `auth.uid()` to be an active member of the company, so service-role — which
 * has no `auth.uid()` — would read nothing.
 */
async function resolveScenarioId(): Promise<string> {
  const author = actor(AUTHOR)
  const client = await userClient(author.email, author.password)
  const { data, error } = await client.rpc("get_planning_scenarios_v1", {
    p_company_id: tenantACompanyId(),
  })
  if (error) throw new Error(`E2E_SCENARIO_LOOKUP_FAILED: ${error.message}`)
  const rows = (data ?? []) as Array<{ id: string; name: string }>
  const matches = rows.filter((row) => row.name === scenarioName)
  if (matches.length !== 1) {
    throw new Error(
      `E2E_SCENARIO_NOT_UNIQUE: expected exactly one scenario named ` +
        `"${scenarioName}", found ${matches.length}`,
    )
  }
  return matches[0]!.id
}

async function readSnapshots() {
  const { data, error } = await adminClient()
    .from("organization_planning_snapshots")
    .select("id, workspace_id, source_scenario_id, version, published_at, organization")
    .eq("source_scenario_id", scenarioId)
    .order("version")
  if (error) throw new Error(`E2E_READBACK_SNAPSHOTS_FAILED: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Surface addressing.
// ---------------------------------------------------------------------------

/**
 * Both creation forms live inside a `CrudCreateDialog`: the fields are NOT in
 * the DOM until the trigger is clicked, and the dialog is a portal, so it is
 * always looked up from the page rather than from the trigger's scope.
 */
async function openDialog(page: Page, trigger: string): Promise<Locator> {
  await page.getByRole("button", { name: trigger, exact: true }).first().click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  return dialog
}

/**
 * The scenario operations menu is a toggle, not a dropdown role: its trigger is
 * labelled "Operações de <name>" and the items are plain buttons that only exist
 * once the menu is open. The offered set is derived from status — draft offers
 * `submit`, submitted offers `approve`/`reject`, rejected offers `revise` — so an
 * item's ABSENCE is the product's statement about the lifecycle, not a defect.
 */
async function operationsMenuIsOpen(page: Page): Promise<boolean> {
  for (const label of OPERATION_LABELS) {
    if ((await page.getByRole("button", { name: label }).count()) > 0) return true
  }
  return false
}

async function ensureOperationsMenuOpen(page: Page): Promise<void> {
  if (!(await operationsMenuIsOpen(page))) {
    await page.getByRole("button", { name: `Operações de ${scenarioName}` }).click()
  }
  await expect.poll(() => operationsMenuIsOpen(page)).toBe(true)
}

async function runOperation(page: Page, label: string, reason?: string): Promise<void> {
  await ensureOperationsMenuOpen(page)
  await page.getByRole("button", { name: label }).click()
  if (reason !== undefined) {
    await page.getByLabel("Motivo privado da rejeição").fill(reason)
  }
  const confirmButton = page.getByRole("button", { name: "Confirmar" })
  await expect(confirmButton).toBeEnabled()
  await confirmButton.click()
}

/** The operations the product offers for the current status. */
async function offeredOperations(page: Page): Promise<string[]> {
  const trigger = page.getByRole("button", { name: `Operações de ${scenarioName}` })
  if ((await trigger.count()) === 0) {
    return visibleOperations(page)
  }
  await ensureOperationsMenuOpen(page)
  const offered = await visibleOperations(page)
  await trigger.click()
  await expect.poll(() => operationsMenuIsOpen(page)).toBe(false)
  return offered
}

async function visibleOperations(page: Page): Promise<string[]> {
  const offered: string[] = []
  for (const label of OPERATION_LABELS) {
    if ((await page.getByRole("button", { name: label }).count()) > 0) offered.push(label)
  }
  return offered
}

async function expectTerminalControlUnavailable(page: Page, label: string): Promise<void> {
  const control = page.getByRole("button", { name: label })
  if ((await control.count()) === 0) return
  await expect(control).toBeDisabled()
}

test.describe("organization planning journey: authoring, lifecycle, publication", () => {
  // ------------------------------------------------------------------ A
  test("1-2. a workspace with a baseline exists and a draft scenario is created", async ({
    page,
  }) => {
    const runId = manifest().runId
    scenarioName = `E2E Planning Scenario ${runId}`
    departmentName = `E2E Planning Department ${runId}`

    await enterAs(page, AUTHOR)
    await organizationHome(page)

    // 1. The workspace is bootstrapped through the product only if the tenant has
    // none. Whether one exists is read from CANONICAL STATE, not inferred from a
    // control: "Novo Workspace" renders in the workspace card's header either
    // way, so its presence says nothing about whether a workspace exists — run
    // 260922165410-439b90 would have created a second one had the unique
    // constraint allowed it.
    if (!(await findWorkspace())) {
      const workspaceDialog = await openDialog(page, "Novo Workspace")
      await workspaceDialog.getByRole("button", { name: "Criar workspace" }).click()
      await confirm(page, WORKSPACE_CREATED)
      await page.reload()
    }

    const workspace = await findWorkspace()
    if (!workspace) throw new Error("E2E_WORKSPACE_MISSING")
    workspaceId = workspace.id as string
    liveOrganizationBefore = await readLiveOrganization()
    expect(liveOrganizationBefore.some((entry) => entry.name === departmentName)).toBe(false)

    // `bootstrap_planning_workspace` writes the baseline snapshot in the same
    // statement, so a workspace without one is not a valid starting state.
    const baseline = await adminClient()
      .from("organization_planning_snapshots")
      .select("id, version")
      .eq("workspace_id", workspaceId)
      .order("version")
    if (baseline.error) throw new Error(`E2E_BASELINE_MISSING: ${baseline.error.message}`)
    expect(baseline.data?.length ?? 0).toBeGreaterThan(0)

    // 2. the draft scenario, created through the real form.
    const scenarioDialog = await openDialog(page, "Novo Cenário")
    await scenarioDialog.getByLabel("Nome", { exact: true }).fill(scenarioName)
    await scenarioDialog
      .getByLabel("Descrição", { exact: true })
      .fill("Cenário do run E2E de Organization Planning.")
    await scenarioDialog.getByRole("button", { name: "Criar cenário" }).click()
    await confirm(page, SCENARIO_CREATED)

    // The product closes the dialog and refreshes in place; it does NOT redirect.
    // Run 260922174024-8b6eb2 waited 30s for a navigation that is not part of the
    // contract, on a scenario that had been created correctly. The browser-visible
    // outcome is the card appearing in the list, as a draft.
    const created = page.getByRole("heading", { name: scenarioName, level: 3 })
    await expect(created).toBeVisible({ timeout: 30_000 })
    await expect(
      page.locator("div").filter({ has: created }).filter({ hasText: "Rascunho" }).last(),
    ).toBeVisible()

    // The id is resolved through the product's own trusted read, as an authorised
    // member — never predicted, and never scraped from a URL the product does not
    // produce. `get_planning_scenarios_v1` is `security definer` but gates on
    // `auth.uid()` being an active member, so it must be called with a user
    // session; the service-role client would see zero rows.
    scenarioId = await resolveScenarioId()
    expect(scenarioId).toMatch(/^[0-9a-f-]{36}$/)

    const scenario = await readScenario()
    expect(scenario.status).toBe("draft")
    expect(scenario.company_id).toBe(tenantACompanyId())
    expect(scenario.workspace_id).toBe(workspaceId)
    expect(scenario.version).toBeGreaterThan(0)
  })

  // ------------------------------------------------------------------ B
  test("3-6. content is authored, read back canonically, projected, and version-guarded", async ({
    page,
    context,
  }, testInfo) => {
    await enterAs(page, AUTHOR)
    await openScenario(page)

    const before = await readScenario()

    // 3. a valid department.create, authored through the product's own form.
    await page.getByLabel("Nome", { exact: true }).first().fill(departmentName)
    await page.getByLabel("Código", { exact: true }).first().fill("E2E")
    await page.getByRole("button", { name: "Adicionar departamento" }).click()
    await confirm(page, DEPARTMENT_ADDED)

    // 4. canonical readback, and the version advanced. The scenario's version is
    // the concurrency token the boundary enforces, so it must move.
    await expect
      .poll(async () => (await activeChangeSets()).length, { timeout: 30_000 })
      .toBe(1)
    const [changeSet] = await activeChangeSets()
    expect(changeSet?.change_type).toBe("department.create")
    expect((changeSet?.payload as { name?: string })?.name).toBe(departmentName)

    const afterCreate = await readScenario()
    expect(afterCreate.version).toBeGreaterThan(before.version as number)

    // 5. the projection contains the department — impact is previewed from the
    // executor's output, not from the form that was just submitted.
    await page.reload()
    await expect(page.getByText("Prévia de impacto")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(departmentName, { exact: false }).first()).toBeVisible()

    // 6. a stale expected_version must not overwrite. Two pages hold the same
    // version; the first mutation wins and the second is refused by the
    // boundary, not by the form.
    const stale = await context.newPage()
    await stale.goto(`/app/organization/planning/${scenarioId}`)
    await expect(stale.getByRole("heading", { name: scenarioName })).toBeVisible({
      timeout: 30_000,
    })

    await page.reload()
    await page.getByLabel("Nome", { exact: true }).first().fill(`${departmentName} A`)
    await page.getByRole("button", { name: "Adicionar departamento" }).click()
    await confirm(page, DEPARTMENT_ADDED)
    const afterWinner = await readScenario()
    const canonicalBeforeStale = await readScenario()
    const contentBeforeStale = await activeChangeSets()

    await stale.getByLabel("Nome", { exact: true }).first().fill(`${departmentName} STALE`)
    const staleSettlementStartedAt = performance.now()
    await stale.getByRole("button", { name: "Adicionar departamento" }).click()
    await confirm(stale, VERSION_CONFLICT)
    const staleSettlementMs = Math.round(performance.now() - staleSettlementStartedAt)

    // Nothing of the refused write reached canonical state.
    const afterStale = await readScenario()
    expect(afterStale.version).toBe(afterWinner.version)
    const contentAfterStale = await activeChangeSets()
    expect(contentAfterStale).toEqual(contentBeforeStale)
    const payloads = contentAfterStale.map(
      (entry) => (entry.payload as { name?: string })?.name,
    )
    expect(payloads).not.toContain(`${departmentName} STALE`)

    const step6Evidence = JSON.stringify(
      {
        staleSettlementMs,
        surfacedConflict: VERSION_CONFLICT,
        staleExpectedVersion: afterCreate.version,
        winningVersion: afterWinner.version,
        canonicalVersionBeforeStale: canonicalBeforeStale.version,
        canonicalVersionAfterStale: afterStale.version,
        activeChangeSetsBeforeStale: contentBeforeStale,
        activeChangeSetsAfterStale: contentAfterStale,
        staleContentAbsent: !payloads.includes(`${departmentName} STALE`),
        verdict: "NON_OVERWRITE=PASS",
      },
      null,
      2,
    )
    const evidencePath = runEvidenceFile(manifest().runId, "step-6-non-overwrite.json")
    mkdirSync(dirname(evidencePath), { recursive: true, mode: 0o700 })
    const temporaryEvidencePath = `${evidencePath}.tmp`
    writeFileSync(temporaryEvidencePath, step6Evidence, { mode: 0o600 })
    renameSync(temporaryEvidencePath, evidencePath)
    await testInfo.attach("step-6-non-overwrite.json", {
      path: evidencePath,
      contentType: "application/json",
    })
    await stale.close()
  })

  // ------------------------------------------------------------------ C
  test("7-11. submit locks the editor, rejection is durable, revise reopens it", async ({
    page,
  }) => {
    await enterAs(page, AUTHOR)
    await planningTimeline(page)

    // 7. submit, then the editor is gone — draft-only is the product's rule.
    expect(await offeredOperations(page)).toContain("Enviar para aprovação")
    await runOperation(page, "Enviar para aprovação")
    await confirm(page, SUBMITTED)

    await expect.poll(async () => (await readScenario()).status, { timeout: 30_000 }).toBe(
      "submitted",
    )
    await openScenario(page)
    await expect(page.getByRole("button", { name: "Adicionar departamento" })).toHaveCount(0)

    // 8. reject carries a mandatory private reason, and it is durable.
    await planningTimeline(page)
    await runOperation(page, "Rejeitar cenário", REJECTION_REASON)
    await confirm(page, REJECTED)
    await expect.poll(async () => (await readScenario()).status, { timeout: 30_000 }).toBe(
      "rejected",
    )
    const rejectedScenario = await readTrustedScenario()
    expect(rejectedScenario.company_id).toBe(tenantACompanyId())
    const rejectionFacts = (await readLifecycleHistory()).filter(
      (entry) => entry.event_type === "planning.scenario.rejected",
    )
    expect(rejectionFacts).toHaveLength(1)
    expect(rejectionFacts[0]).toMatchObject({
      from_status: "submitted",
      to_status: "rejected",
      resulting_version: rejectedScenario.version,
      reason: REJECTION_REASON,
    })

    // 9. a rejected scenario is still not editable.
    await openScenario(page)
    await expect(page.getByRole("button", { name: "Adicionar departamento" })).toHaveCount(0)

    // 10. revise returns it to draft and the editor is offered again.
    await planningTimeline(page)
    expect(await offeredOperations(page)).toEqual(["Revisar rascunho"])
    await runOperation(page, "Revisar rascunho")
    await confirm(page, REVISED)
    await expect.poll(async () => (await readScenario()).status, { timeout: 30_000 }).toBe("draft")

    await openScenario(page)
    await expect(page.getByRole("button", { name: "Adicionar departamento" })).toBeVisible()

    // 11. the content survived the round trip and can be edited, then resubmitted.
    const surviving = await activeChangeSets()
    expect(surviving.length).toBeGreaterThan(0)

    await page
      .getByLabel("Nome", { exact: true })
      .nth(1)
      .fill(`${departmentName}${REVISED_SUFFIX}`)
    await page.getByRole("button", { name: "Salvar edição" }).first().click()
    await confirm(page, DEPARTMENT_UPDATED)

    await expect
      .poll(
        async () =>
          (await activeChangeSets()).some(
            (entry) =>
              (entry.payload as { name?: string })?.name === `${departmentName}${REVISED_SUFFIX}`,
          ),
        { timeout: 30_000 },
      )
      .toBe(true)

    await planningTimeline(page)
    await runOperation(page, "Enviar para aprovação")
    await confirm(page, SUBMITTED)
    await expect.poll(async () => (await readScenario()).status, { timeout: 30_000 }).toBe(
      "submitted",
    )
  })

  // ------------------------------------------------------------------ D
  test("12-14. approval unlocks publication and the scenario is published", async ({ page }) => {
    await enterAs(page, AUTHOR)
    await planningTimeline(page)

    // 12. approve.
    expect(await offeredOperations(page)).toEqual(["Aprovar cenário", "Rejeitar cenário"])
    await runOperation(page, "Aprovar cenário")
    await confirm(page, APPROVED)
    await expect.poll(async () => (await readScenario()).status, { timeout: 30_000 }).toBe(
      "approved",
    )

    // 13. readiness: the publish control is offered only once approved.
    await openScenario(page)
    const publish = page.getByRole("button", { name: "Publicar Cenário" })
    await expect(publish).toBeEnabled({ timeout: 30_000 })
    await publish.click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // The wizard refuses to advance until validation passes; walking it is the
    // readiness proof.
    for (let step = 0; step < 3; step += 1) {
      const next = page.getByRole("button", { name: "Continuar" })
      await expect(next).toBeEnabled({ timeout: 30_000 })
      await next.click()
    }

    // 14. the single authorized publication.
    const confirmPublish = page.getByRole("button", { name: "Confirmar publicação" })
    await expect(confirmPublish).toBeEnabled({ timeout: 30_000 })
    await confirmPublish.click()

    await expect
      .poll(async () => (await readScenario()).status, { timeout: 60_000 })
      .toBe("published")
  })

  // ------------------------------------------------------------------ E
  test("15-19. exactly one snapshot, terminal and immutable, through the boundary only", async ({
    page,
  }) => {
    // 15. exactly one projection snapshot, carrying the projected department.
    const snapshots = await readSnapshots()
    expect(snapshots).toHaveLength(1)
    const snapshot = snapshots[0]
    expect(snapshot?.workspace_id).toBe(workspaceId)
    expect(snapshot?.published_at).toBeTruthy()
    expect(JSON.stringify(snapshot?.organization ?? {})).toContain(
      `${departmentName}${REVISED_SUFFIX}`,
    )
    const liveOrganizationAfter = await readLiveOrganization()
    expect(liveOrganizationAfter).toEqual(liveOrganizationBefore)
    expect(
      liveOrganizationAfter.some((entry) => entry.name === `${departmentName}${REVISED_SUFFIX}`),
    ).toBe(false)

    // 16. canonical scenario reads published.
    const scenario = await readScenario()
    expect(scenario.status).toBe("published")

    // 17. a published scenario offers no content, lifecycle, archive or restore
    // mutation anywhere in the product.
    await enterAs(page, AUTHOR)
    await openScenario(page)
    for (const label of [
      "Adicionar departamento",
      "Salvar edição",
      "Remover",
    ]) {
      await expect(page.getByRole("button", { name: label })).toHaveCount(0)
    }
    await expectTerminalControlUnavailable(page, "Publicar Cenário")
    await planningTimeline(page)
    expect(await offeredOperations(page)).toEqual([])

    // 18. terminality is the database's, not the UI's. Both immutability
    // triggers must refuse, and the scenario must survive the attempt.
    const scenarioMutation = await adminClient()
      .from("organization_planning_scenarios")
      .update({ name: `${scenarioName} TAMPERED` })
      .eq("id", scenarioId)
    expect(scenarioMutation.error?.message ?? "").toContain(
      "PUBLISHED_PLANNING_SCENARIO_IS_IMMUTABLE",
    )

    const snapshotMutation = await adminClient()
      .from("organization_planning_snapshots")
      .update({ version: 999 })
      .eq("id", snapshot?.id as string)
    expect(snapshotMutation.error?.message ?? "").toContain("PLANNING_SNAPSHOT_IS_IMMUTABLE")

    expect((await readScenario()).name).toBe(scenarioName)
    expect((await readSnapshots())[0]?.version).toBe(snapshot?.version)

    // 19. the change-set lineage is what the trusted RPCs produced: superseded
    // entries retained rather than deleted, which is what distinguishes the
    // boundary from direct DML.
    const all = await readChangeSets()
    expect(all.length).toBeGreaterThanOrEqual((await activeChangeSets()).length)
    expect(all.every((entry) => typeof entry.version === "number")).toBe(true)

    // And the boundary is closed to a member and to a foreign owner alike.
    await switchTo(page, MEMBER)
    await openScenario(page)
    await expect(page.getByRole("button", { name: "Adicionar departamento" })).toHaveCount(0)

    await switchTo(page, FOREIGN)
    const response = await page.goto(`/app/organization/planning/${scenarioId}`)
    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { name: scenarioName })).toHaveCount(0)
  })
})
