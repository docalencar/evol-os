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
 *                 company is created for this spec: tenant B is spec 02's, and
 *                 this spec DEPENDS on spec 02 having completed, exactly as
 *                 specs 03, 04, 07, 10 and 13 do. Until then that identity is
 *                 unattached — no membership, no person, no company — and is not
 *                 yet the contract's `foreign_owner`.
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
const VERSION_PUBLISHED = "Versão publicada com sucesso."

/**
 * Published state has two different browser-visible representations, and the
 * word "Publicado" is only ever ONE of them.
 *
 * On the templates INDEX it is the status badge, from the table's own
 * presentation map (`draft → Rascunho`, `published → Publicado`). That is "the
 * container reads published".
 *
 * On the template DETAIL page the word never appears at all: publication is
 * expressed by the authoring controls being withdrawn — "Publicar versão" is
 * replaced by "Tornar obsoleto" — and by the immutability notice. That is "the
 * version becomes immutable".
 *
 * Run 260921170444-21443c asserted the index's vocabulary against the detail
 * page. Publication had in fact succeeded.
 */
const PUBLISHED_STATUS = "Publicado"
const VERSION_IMMUTABLE = "Esta versão já foi publicada e não aceita alterações."

async function confirm(page: Page, message: string): Promise<void> {
  await expect(page.getByText(message, { exact: true })).toBeVisible({ timeout: 30_000 })
}

let planId = ""
let templateId = ""

/**
 * The plan's durable title, captured from canonical state in block B and used as
 * the run-scoped marker that the PDI detail surface loaded THIS run's plan.
 *
 * Never predicted from the template name: the product decides what a plan is
 * titled, so the title is read back rather than assumed.
 */
let planTitle = ""

/** A heading the PDI detail surface always renders, whatever the plan contains. */
const PLAN_SURFACE_SECTION = "Competências e ações"

/**
 * A syntactically valid plan id that cannot exist, so a denial for the REAL plan
 * can be compared against one for a plan that simply is not there.
 *
 * §6 closes with "unauthorized and nonexistent must be indistinguishable". That
 * is a relation between two observations, so asserting only that the real id
 * yields 404 states one side of it and assumes the other. Spec 13 already reads
 * the contract this way; the trailing digit differs so the two specs never probe
 * the same id.
 */
const NONEXISTENT_PLAN_ID = "00000000-0000-4000-8000-000000000002"

type DenialOutcome = Readonly<{ status: number | null; route: string; body: string }>

/** Observed entirely through the browser: no privileged read proves a negative. */
async function probePlanDenial(page: Page, id: string): Promise<DenialOutcome> {
  const response = await page.goto(`/app/development/plans/${id}`)
  await page.waitForLoadState("networkidle")
  return Object.freeze({
    status: response?.status() ?? null,
    // The id is masked so the comparison cannot fail merely because two
    // different ids were requested.
    route: new URL(page.url()).pathname.replace(id, ":plan-id"),
    body: await page.locator("body").innerText(),
  })
}

function expectIndistinguishableDenial(
  denied: DenialOutcome,
  nonexistent: DenialOutcome,
  secrets: readonly string[],
): void {
  // The 404 is kept as its own assertion: the contract names `notFound`, so
  // "both are equal" must not be satisfiable by both being something else.
  expect(denied.status).toBe(404)
  expect(nonexistent.status).toBe(404)
  expect(denied.route).toBe(nonexistent.route)
  expect(denied.body).toBe(nonexistent.body)
  for (const secret of secrets) expect(denied.body).not.toContain(secret)
}

let cached: RunManifest | null = null
function manifest(): RunManifest {
  if (!cached) cached = readManifest()
  return cached
}

/**
 * Tenant B, which the contract's `foreign_owner` must OWN (§2: "separate
 * tenant"). It is created by spec 02's real onboarding wizard and recorded in
 * the run journal — the same dependency specs 03, 04, 07, 10 and 13 declare.
 *
 * `onboarding` is only the foreign owner AFTER that has happened. Before it, the
 * identity is unattached: it has no membership, no person and no company, and
 * the product correctly sends it to first-access onboarding. Run
 * 260921185836-f8c2dd resolved the actor by role name, which skipped this
 * dependency, and then failed on a tenant-shell marker that an unattached
 * identity cannot satisfy by definition.
 */
function foreignTenant() {
  const tenant = manifest().onboardingCompany
  if (!tenant) {
    throw new Error(
      "E2E_TENANT_B_MISSING: the contract's foreign_owner is the owner of a SEPARATE " +
        "tenant, not an unattached identity. Spec 02 must complete first.",
    )
  }
  return tenant
}

function actor(role: SyntheticRole) {
  // The foreign actor is defined by its TENANT, so it is resolved from that
  // tenant's owner rather than by role name — otherwise the dependency above can
  // be silently bypassed.
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
    // Foreignness is PROVED, not assumed: this actor resolves its own, different
    // tenant. Without it the isolation negatives could pass against an actor that
    // merely happened to be denied, which is a weaker claim than the contract's.
    await expect(page.getByText(foreignTenant().companyName).first()).toBeVisible()
  }
}

/**
 * Change actor WITHIN a test: end the live session through the real UI, then log
 * the next actor in. The sign-out is the point — it proves the authorization
 * boundary rather than assuming it — so this is never softened into "log in if
 * not already signed in".
 *
 * It therefore requires a live session, and a test's FIRST actor must use
 * `enterAs`. `mode: "serial"` shares ordering and failure propagation between
 * tests; it does NOT share the `page` fixture. Run 260921172652-e6b59e opened
 * block B with `switchTo` and clicked for "Sair" on a fresh `about:blank` page
 * that had never been authenticated. Specs 13 and 14 already follow this rule.
 */
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

/**
 * Open the PDI and prove BOTH that the detail surface rendered and that it is
 * this run's plan — a URL alone proves neither.
 *
 * Run 260921182529-0ba165 anchored this on "Plano de desenvolvimento individual.",
 * which is the page's FALLBACK description: it renders only when the plan has
 * none (`plan.description ?? "..."`). Every plan in this journey inherits the
 * template's description, so that string was structurally unreachable here —
 * and the plan had in fact loaded, correctly, for its authorized subject.
 */
async function openPlan(page: Page): Promise<void> {
  await page.goto(`/app/development/plans/${planId}`)
  await expect(
    page.getByRole("heading", { name: PLAN_SURFACE_SECTION, level: 2 }),
  ).toBeVisible({ timeout: 30_000 })
  if (!planTitle) throw new Error("E2E_PLAN_TITLE_NOT_CAPTURED")
  await expect(page.getByRole("heading", { level: 1, name: planTitle })).toBeVisible()
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

/**
 * The PLAN page nests a goal's actions in the same native `<details>` disclosure
 * the template page uses, and likewise never renders it `open`. So every action
 * on a plan — reading its title, starting it, completing it, skipping it — has
 * the same precondition, and every server render and every `reload()` closes it
 * again.
 *
 * Run 260921184137-70e10c resolved `<p>Concluir curso de comunicação</p>` 33
 * times and reported it `hidden`: the manager was correctly authorized and the
 * action was correctly rendered, inside a collapsed panel.
 */
async function openPlanGoal(page: Page): Promise<Locator> {
  return expandGoal(page, developmentCompetencyName(manifest().runId))
}

/**
 * Record a review through the product's own form.
 *
 * `nextStep` is REQUIRED for a periodic review and optional for a final one. The
 * product says so twice — in the submit button's disabled condition and again
 * server-side, which refuses with "Próximo passo obrigatório para revisão
 * periódica." — and the field's own label switches between "(obrigatório)" and
 * "(opcional)" with the selected type.
 *
 * Run 260921193504-12231c filled only the summary for the second review and
 * spent 15s waiting on a button the product was correctly keeping disabled.
 *
 * The type is chosen BEFORE the text is judged, because what `nextStep` requires
 * depends on it.
 */
async function recordReview(
  page: Page,
  review: { summary: string; nextStep?: string; final?: boolean },
): Promise<void> {
  if (review.final) {
    // Enabled only once every action is terminal and one was completed, so this
    // also asserts that server-derived gate.
    const finalType = page.getByRole("button", { name: "Final", exact: true })
    await expect(finalType).toBeEnabled({ timeout: 30_000 })
    await finalType.click()
  }

  await page.locator("#review-summary").fill(review.summary)
  await page.locator("#review-next-step").fill(review.nextStep ?? "")

  // The precondition is ASSERTED rather than waited out: a disabled submit means
  // the form is incomplete by the product's rules, not that the app is slow, and
  // saying so costs one assertion instead of a fifteen-second timeout.
  const submit = page.getByRole("button", { name: "Registrar revisão" })
  await expect(submit).toBeEnabled()
  await submit.click()
  await confirm(page, REVIEW_SAVED)
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
    .select("id, status, employee_id, owner_id, template_id, title")
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
    //
    // Each half of that clause is asserted on the surface that actually renders
    // it, through the product's own semantics rather than a borrowed label.
    await page.getByRole("button", { name: "Publicar versão" }).click()
    await confirm(page, VERSION_PUBLISHED)

    // Immutable: the refreshed server render withdraws the authoring controls.
    // The absence of "Publicar versão" is asserted as well as the presence of
    // its replacement, because a page still offering to publish would mean the
    // refresh never landed — and that is the failure this must not silently pass.
    await expect(page.getByText(VERSION_IMMUTABLE)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("button", { name: "Tornar obsoleto" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Publicar versão" })).toHaveCount(0)

    // The container reads published — symmetric with the draft assertion above,
    // on the surface whose vocabulary that is.
    await templatesHome(page)
    await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText(PUBLISHED_STATUS)
    await page.goto(`/app/development/templates/${templateId}`)

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

    await enterAs(page, MANAGER)
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

    // The owner is DERIVED, not chosen. For a manager the application
    // presentation returns `owners: [actor]` and `fixedOwnerId: actor.id`, and
    // the control is rendered disabled with that value already selected — a
    // manager may only own the plans they apply. Driving it would be asserting
    // a capability the product deliberately withholds, so the spec proves the
    // resolved owner instead of setting it.
    const ownerSelect = applyDialog.locator("#ownerId")
    await expect(ownerSelect).toBeDisabled()
    await expect(ownerSelect).toHaveValue(personIdOf(MANAGER))
    await expect(
      applyDialog.getByRole("option", { name: actor(MANAGER).fullName, selected: true }),
    ).toHaveCount(1)

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
    // Captured from canonical state, never predicted, and used from here on as
    // the run-scoped proof that a PDI surface is showing THIS plan.
    planTitle = String(plan.title ?? "")
    expect(planTitle.length).toBeGreaterThan(0)
    expect(plan.employee_id).toBe(actor(SUBJECT).personId)
    // Ownership independently, from canonical state: the disabled control is a
    // presentation claim, the persisted row is the fact.
    expect(plan.owner_id).toBe(personIdOf(MANAGER))
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
    await enterAs(page, SUBJECT)
    await openPlan(page)
    await expect(page.getByText(developmentTemplateName(manifest().runId))).toBeVisible()

    // 12. the responsible manager reads it.
    await switchTo(page, MANAGER)
    await openPlan(page)
    const managerGoal = await openPlanGoal(page)
    await expect(managerGoal.getByText(ACTION_ONE, { exact: true })).toBeVisible()

    // 13-14. nonparticipant and foreign actor are refused, and refused
    // identically to a plan that does not exist — absence is not an oracle.
    for (const role of [UNRELATED, FOREIGN] as const) {
      await switchTo(page, role)
      const denied = await probePlanDenial(page, planId)
      const nonexistent = await probePlanDenial(page, NONEXISTENT_PLAN_ID)
      expectIndistinguishableDenial(denied, nonexistent, [
        planTitle,
        ACTION_ONE,
        ACTION_TWO,
        developmentCompetencyName(manifest().runId),
      ])

      // Structural absence as well as textual, anchored on the run-scoped title.
      await expect(page.getByRole("heading", { level: 1, name: planTitle })).toHaveCount(0)
      await expect(page.getByRole("heading", { name: PLAN_SURFACE_SECTION })).toHaveCount(0)
    }
  })

  // ------------------------------------------------------------------ D
  test("D. 15-17 the subject executes, management skips, progress is server-derived", async ({
    page,
  }) => {
    await enterAs(page, SUBJECT)
    await openPlan(page)

    // 15. start, then re-read durable state rather than trusting the button.
    // The goal disclosure is reopened before every action interaction: each
    // server render and each reload closes it again.
    await openPlanGoal(page)
    await actionCard(page, ACTION_ONE).getByRole("button", { name: "Iniciar ação" }).click()
    await confirm(page, ACTION_SAVED)
    await page.reload()
    await expect.poll(async () => {
      const actions = await readActions()
      return actions.find((action) => action.title === ACTION_ONE)?.status
    }, { timeout: 30_000 }).toBe("in_progress")

    // 16. complete. Canonical progress moves to 50% of two actions, derived by
    // the server; the browser never computes it.
    await openPlanGoal(page)
    await actionCard(page, ACTION_ONE).getByRole("button", { name: "Concluir ação" }).click()
    await confirm(page, ACTION_SAVED)
    await page.reload()
    await expect.poll(async () => {
      const actions = await readActions()
      return actions.find((action) => action.title === ACTION_ONE)?.status
    }, { timeout: 30_000 }).toBe("completed")
    await expect(page.getByText("50%")).toBeVisible({ timeout: 30_000 })

    // 17. the subject may not skip — skip is a management transition. Asserted
    // on the OPEN disclosure, so it proves the control is absent from a rendered
    // surface rather than merely absent from a collapsed one.
    await openPlanGoal(page)
    await expect(
      actionCard(page, ACTION_TWO).getByRole("button", { name: "Ignorar ação" }),
    ).toHaveCount(0)

    await switchTo(page, MANAGER)
    await openPlan(page)
    await openPlanGoal(page)
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
    await enterAs(page, AUTHOR)
    await openPlan(page)

    await recordReview(page, {
      summary: FIRST_REVIEW,
      nextStep: "Manter acompanhamento quinzenal.",
    })
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
    // Periodic, so the next step is mandatory — the product refuses without it
    // both in the button and server-side.
    await recordReview(page, {
      summary: SECOND_REVIEW,
      nextStep: "Acompanhar a execução até a conclusão do plano.",
    })
    await page.reload()
    await expect(page.getByText(FIRST_REVIEW, { exact: true })).toBeVisible()
    await expect(page.getByText(SECOND_REVIEW, { exact: true })).toBeVisible()
    for (const label of ["Editar revisão", "Excluir revisão", "Remover revisão"]) {
      await expect(page.getByRole("button", { name: label })).toHaveCount(0)
    }

    // 22. the final review, recorded after the last action transition. The type
    // is chosen with a button, not a checkbox, and for a final review the next
    // step is optional — which is only true once the type has been switched.
    await recordReview(page, { summary: FINAL_REVIEW, final: true })
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
    await enterAs(page, AUTHOR)
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

    // 29. and the refusals still hold after completion — still indistinguishable
    // from a plan that never existed, now that the plan carries review history
    // and a private skip reason that a terminal state must not start leaking.
    for (const role of [UNRELATED, FOREIGN] as const) {
      await switchTo(page, role)
      const denied = await probePlanDenial(page, planId)
      const nonexistent = await probePlanDenial(page, NONEXISTENT_PLAN_ID)
      expectIndistinguishableDenial(denied, nonexistent, [
        planTitle,
        ACTION_ONE,
        ACTION_TWO,
        FIRST_REVIEW,
        SECOND_REVIEW,
        FINAL_REVIEW,
        SKIP_REASON,
      ])
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
