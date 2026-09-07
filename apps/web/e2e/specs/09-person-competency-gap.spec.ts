/**
 * E2E-3 spec 09 — the derived value: what this person is missing.
 *
 * Spec 08 configured the facts — a Competency, a Seniority, that Seniority
 * applied to the run's Position, and an expectation of level 4 at that
 * intersection. This spec assigns the Seniority to the run's Person, records
 * what the person can actually do, and then reads the number the product works
 * out for itself.
 *
 * ## Why this is not CRUD
 *
 * Nothing in the journey ever types a gap. Expected 4 was entered on a Position
 * weeks of product-time away from the Person; current 2 is entered on the
 * Person; the gap is computed by `deriveCanonicalPersonCompetencyCoverage` from
 * the 0123 factual boundary and rendered by `PersonCompetencyGapCard`. The test
 * asserts what the product concluded — it never calculates `expected - current`
 * itself and injects the answer.
 *
 * The proof is the transition. At current 2 the card must say
 * "Gap de desenvolvimento"; after the evidence is raised to 4 the same row must
 * say "Atende ao esperado". A stored value cannot do that; only a derivation can.
 *
 * ## Expected 4, not 3
 *
 * Spec 08 deliberately set the CATALOG default to level 3 and the contextual
 * position×seniority expectation to level 4. If this card ever showed 3, the
 * expectation would be coming from `competencies.expected_level` rather than
 * from the position×seniority row — a canonical-boundary regression, not a test
 * failure. Asserting 4 is what makes that detectable.
 *
 * ## Scoping around known legacy debt
 *
 * The same profile page also renders "Resumo de talentos" and
 * "Acompanhamento do colaborador", which still derive a sign-inverted gap
 * through a legacy adapter. That debt is deliberately out of scope here, so
 * every assertion below is scoped to the "Gap de competências" section and can
 * never be satisfied by a legacy card.
 */

import { expect, test, type Locator, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi } from "../auth/login"
import { personId } from "../fixtures/organization-lookup"
import {
  competencyName,
  personName,
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

/** Contextual expectation written by spec 08 at the position x seniority. */
const EXPECTED_LEVEL = "4"
/** Catalog default from spec 08 — must never be what the gap card reports. */
const CATALOG_LEVEL_THAT_MUST_NOT_APPEAR = "3"

const INITIAL_CURRENT_LEVEL = "2"
const FINAL_CURRENT_LEVEL = "4"

/**
 * Exact success messages the product returns and the dialogs raise as toasts
 * before closing. Read from `updateEmployeeAction` and
 * `updateEmployeeCompetencyAction` — never invented. If the product rewords
 * one, this assertion should fail and be updated deliberately rather than
 * silently decaying into "something was submitted".
 */
const PERSON_SAVE_SUCCESS_MESSAGE = "Colaborador atualizado com sucesso."
const EVIDENCE_CREATE_SUCCESS_MESSAGE =
  "Competência do colaborador criada com sucesso."
const EVIDENCE_SAVE_SUCCESS_MESSAGE =
  "Competência do colaborador atualizada com sucesso."

const DEFICIENCY_LABEL = "Gap de desenvolvimento"
const MEETS_LABEL = "Atende ao esperado"

async function enterTenantA(page: Page): Promise<void> {
  await loginThroughUi(page, tenantAAdmin())
  await expectAuthenticatedShell(page)
}

/** Open the run-owned Person profile by its exact journalled id. */
async function openRunPersonProfile(page: Page): Promise<void> {
  const id = await personId(tenantACompanyId(), personName(manifest().runId))

  await page.getByRole("link", { name: "Pessoas" }).click()
  await page.waitForURL(/\/app\/people(\/|\?|$)/, { timeout: 30_000 })

  // The list holds every person in the tenant, including the fixture identities,
  // so "Ver perfil" must be taken from the row naming THIS run's person — never
  // the first one on the page.
  //
  // The role is `button`, not `link`. "Ver perfil" is
  // `<Button nativeButton={false} render={<Link/>}>`, so Base UI emits an anchor
  // carrying an explicit `role="button"` that overrides the anchor's implicit
  // link role. Spec 06 hit this, documented it, and fixed it; this helper asked
  // for `link` anyway and timed out against a control that was present, visible
  // and working. Same product, same correct control, wrong locator.
  const row = page.getByRole("row", { name: new RegExp(personName(manifest().runId)) })
  await expect(row).toBeVisible({ timeout: 30_000 })
  await row.getByRole("button", { name: /Ver perfil/i }).click()

  await page.waitForURL(new RegExp(`/app/people/${id}(\\?|$)`), { timeout: 30_000 })
}

/**
 * The canonical gap surface, and only that one. "Resumo de talentos" and
 * "Acompanhamento do colaborador" are separate sections deriving a legacy,
 * sign-inverted value; nothing here may resolve to them.
 */
function canonicalGapSection(page: Page): Locator {
  return page.locator("section").filter({ hasText: "Gap de competências" }).first()
}

/** The gap row for one competency: Competência | Atual | Esperado | Gap | Situação. */
function gapRow(page: Page, competency: string): Locator {
  return canonicalGapSection(page).getByRole("row", { name: new RegExp(competency) })
}

test.describe("a person's competency gap is derived, not entered", () => {
  test("the run's Seniority is assigned to the run's Person and reads back", async ({
    page,
  }) => {
    const seniority = seniorityLabel(manifest().runId)

    await enterTenantA(page)
    await openRunPersonProfile(page)

    // "Editar perfil", not "Editar". `EmployeeEditDialog` takes an optional
    // `trigger`; its fallback is `<Button>Editar</Button>`, which is what the
    // People table renders — but the profile header passes its own
    // `<Button>Editar perfil</Button>`. Run 260907130453-0a716b asked for the
    // fallback's name with `exact: true` and matched nothing, against a control
    // that was present, visible and the only one on the page.
    //
    // No `.first()`: the name is unique here, and disambiguating by position
    // would quietly pick a winner if a second control ever shared the name.
    await page.getByRole("button", { name: "Editar perfil", exact: true }).click()

    // If the wrong control were clicked, this heading would not be
    // "Editar colaborador" and the test fails here rather than silently
    // asserting against the wrong dialog.
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: "Editar colaborador" })).toBeVisible()

    // The wizard renders only the active step, so each one must be completed.
    // Step 1: personal — already valid for an existing person.
    await dialog.getByRole("button", { name: /^Continuar$/ }).click()

    // Step 2: organization. "Senioridade" only renders once a Cargo is set,
    // which spec 06 already did, and its options are exactly the profiles
    // applicable to that Cargo — which spec 08 made include this seniority.
    const seniorityField = dialog.locator("#employee-seniority")
    await expect(seniorityField).toBeVisible({ timeout: 30_000 })
    await expect(seniorityField.locator("option", { hasText: seniority })).toHaveCount(1, {
      timeout: 30_000,
    })
    await seniorityField.selectOption({ label: seniority })

    await dialog.getByRole("button", { name: /^Continuar$/ }).click()
    // Step 3: professional.
    await dialog.getByRole("button", { name: /^Continuar$/ }).click()
    // Step 4: review, then the real mutation.
    await dialog.getByRole("button", { name: "Salvar alterações", exact: true }).click()

    // Immediate write evidence, BEFORE the reload — the same race that broke
    // spec 08 in run 260907175655-ecd9b6: the reload fired 2.7ms after the
    // server action's POST started, so the navigation fetched server-rendered
    // HTML from before the write committed. The 30s `toBeVisible` that followed
    // could never see the change, because Playwright does not reload while
    // waiting.
    //
    // Contract read from `updateEmployeeAction` and the form: on success it
    // returns "Colaborador atualizado com sucesso.", the form raises it as a
    // toast and calls onSuccess, which closes the dialog; on failure it raises
    // the error and STAYS OPEN. Closing is therefore a success-only signal.
    await expect(page.getByText(PERSON_SAVE_SUCCESS_MESSAGE, { exact: true })).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.getByRole("heading", { name: "Editar colaborador" })
    ).toBeHidden({ timeout: 15_000 })

    await page.reload()

    // Durable readback through the profile's own sidebar.
    await expect(page.getByText(seniority, { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })
  })

  test("with evidence below the expectation the product reports a gap", async ({
    page,
  }) => {
    const competency = competencyName(manifest().runId)

    await enterTenantA(page)
    await openRunPersonProfile(page)

    await page
      .getByRole("button", { name: "Adicionar competência", exact: true })
      .click()

    // "Adicionar competência" names three different things here: the trigger,
    // the dialog title, and the form's own submit button. Everything from here
    // is scoped to the dialog so the submit cannot resolve back to the trigger.
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: "Adicionar competência" })).toBeVisible()

    const competencyField = dialog.locator("#competencyId")
    await expect(competencyField.locator("option", { hasText: competency })).toHaveCount(
      1,
      { timeout: 30_000 }
    )
    await competencyField.selectOption({ label: competency })
    await dialog.locator("#currentLevel").selectOption(INITIAL_CURRENT_LEVEL)

    await dialog.getByRole("button", { name: "Adicionar competência", exact: true }).click()

    // Same guarantee here. The structural guard caught this one after the other
    // two were fixed by hand — evidence that pinning instances misses siblings.
    // `createEmployeeCompetencyAction` returns "Competência do colaborador
    // criada com sucesso."; the form toasts it and onSuccess closes the dialog.
    await expect(
      page.getByText(EVIDENCE_CREATE_SUCCESS_MESSAGE, { exact: true })
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: "Adicionar competência" })
    ).toBeHidden({ timeout: 15_000 })

    // Fresh load: the gap is computed server-side on render, so this is the only
    // honest way to read it.
    await page.reload()

    const row = gapRow(page, competency)
    await expect(row).toBeVisible({ timeout: 30_000 })

    const cells = row.getByRole("cell")
    await expect(cells.nth(1)).toHaveText(INITIAL_CURRENT_LEVEL) // Atual
    await expect(cells.nth(2)).toHaveText(EXPECTED_LEVEL) // Esperado
    await expect(cells.nth(3)).toHaveText("+2") // Gap, rendered signed
    await expect(cells.nth(4)).toContainText(DEFICIENCY_LABEL) // Situação

    // The expectation must come from the position x seniority row, never from
    // the catalog default spec 08 set to 3.
    await expect(cells.nth(2)).not.toHaveText(CATALOG_LEVEL_THAT_MUST_NOT_APPEAR)
  })

  test("raising the evidence to the expectation flips the derived status", async ({
    page,
  }) => {
    const competency = competencyName(manifest().runId)

    await enterTenantA(page)
    await openRunPersonProfile(page)

    // Scope to the registered-evidence section. The run's competency is the only
    // evidence this person has, so exactly one "Editar" lives here — asserted
    // rather than assumed, because clicking the wrong one would silently edit
    // different evidence.
    const registered = page
      .locator("section")
      .filter({ hasText: "Competências registradas" })
      .first()
    await expect(registered.getByText(competency, { exact: true })).toBeVisible({
      timeout: 30_000,
    })

    const editButtons = registered.getByRole("button", { name: "Editar", exact: true })
    await expect(editButtons).toHaveCount(1)
    await editButtons.click()

    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: "Editar competência" })).toBeVisible()

    await dialog.locator("#currentLevel").selectOption(FINAL_CURRENT_LEVEL)
    await dialog.getByRole("button", { name: "Salvar alterações", exact: true }).click()

    // Same guarantee for this write. This test never reached a browser, but it
    // carried the identical click→reload shape, so it would have raced too.
    // `updateEmployeeCompetencyAction` returns "Competência do colaborador
    // atualizada com sucesso."; the form toasts it and onSuccess closes the
    // dialog. On failure it toasts the error and stays open.
    await expect(
      page.getByText(EVIDENCE_SAVE_SUCCESS_MESSAGE, { exact: true })
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: "Editar competência" })
    ).toBeHidden({ timeout: 15_000 })

    await page.reload()

    const row = gapRow(page, competency)
    await expect(row).toBeVisible({ timeout: 30_000 })

    const cells = row.getByRole("cell")
    await expect(cells.nth(1)).toHaveText(FINAL_CURRENT_LEVEL) // Atual
    await expect(cells.nth(2)).toHaveText(EXPECTED_LEVEL) // Esperado
    await expect(cells.nth(3)).toHaveText("0") // Gap closed
    await expect(cells.nth(4)).toContainText(MEETS_LABEL) // Situação flipped

    // The transition is the point: the previous state must be gone from this row.
    await expect(cells.nth(4)).not.toContainText(DEFICIENCY_LABEL)
  })
})
