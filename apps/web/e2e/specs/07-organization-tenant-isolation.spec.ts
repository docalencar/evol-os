/**
 * E2E-2 spec 07 — organization entities do not cross the tenant boundary.
 *
 * Tenant A is the fixture tenant, where specs 05 and 06 built a Department,
 * Position, Team and Person. Tenant B is the company the onboarding journey
 * created in spec 02, whose owner is the `onboarding` identity — so no extra
 * fixture is needed for a second tenant.
 *
 * E2E-1 already proved cross-tenant denial for a *person*. That is not repeated
 * here. What is new is the organization surfaces: lists that must not show
 * another tenant's structure, and a department detail route reached by direct URL.
 *
 * ## The privileged client supplies a target, and nothing else
 *
 * `organization-lookup` resolves tenant A's department id so the boundary test
 * has a real foreign resource to aim at. Every assertion below runs through
 * tenant B's authenticated browser session; a denial demonstrated with a
 * service-role client would prove nothing about what a user can reach.
 *
 * ## Non-oracular
 *
 * A denial that looks different from "this does not exist" is itself a leak — it
 * confirms the id is real and belongs to someone. So the test does not merely
 * check that access fails: it checks that a **real foreign department id** and a
 * **random UUID that exists nowhere** produce the same observable outcome.
 *
 * Nothing sensitive about tenant A is asserted as present. Every claim about it
 * is an assertion of absence.
 */

import { randomUUID } from "node:crypto"

import { expect, test, type Page } from "@playwright/test"

import { expectAuthenticatedShell, loginThroughUi } from "../auth/login"
import { departmentId } from "../fixtures/organization-lookup"
import {
  departmentName,
  personName,
  positionName,
  teamName,
} from "../helpers/org-journey-names"
import { readManifest, type RunManifest } from "../helpers/run-context"

test.describe.configure({ mode: "serial" })

let cached: RunManifest | null = null
function manifest(): RunManifest {
  if (!cached) cached = readManifest()
  return cached
}

function tenantACompanyId(): string {
  const id = manifest().companyId
  if (!id) throw new Error("E2E_TENANT_A_MISSING: the fixture tenant was not recorded.")
  return id
}

/** Tenant B's owner — the identity that walked the onboarding journey in spec 02. */
function tenantBOwner() {
  const tenant = manifest().onboardingCompany
  if (!tenant) {
    throw new Error(
      "E2E_TENANT_B_MISSING: isolation needs two tenants. Spec 02 must complete first.",
    )
  }
  const user = manifest().users.find((candidate) => candidate.userId === tenant.ownerUserId)
  if (!user) throw new Error("E2E_TENANT_B_OWNER_MISSING")
  return user
}

/** What tenant B observes when asking for a department id by direct URL. */
type Outcome = Readonly<{ pathname: string; body: string }>

async function outcomeForDepartmentId(page: Page, id: string): Promise<Outcome> {
  await page.goto(`/app/company/departments/${id}`)
  await page.waitForLoadState("networkidle")
  return {
    pathname: new URL(page.url()).pathname,
    body: (await page.locator("body").innerText()) ?? "",
  }
}

test.describe("organization entities are confined to their tenant", () => {
  test("tenant B's company hub shows none of tenant A's departments", async ({ page }) => {
    const runId = manifest().runId

    await loginThroughUi(page, tenantBOwner())
    await expectAuthenticatedShell(page)

    await page.getByRole("link", { name: "Empresa" }).click()
    await page.waitForURL(/\/app\/company(\/|\?|$)/, { timeout: 30_000 })

    await expect(page.locator("body")).not.toContainText(departmentName(runId))
    // Tenant A's own identity must not leak onto tenant B's surfaces either.
    await expect(page.locator("body")).not.toContainText(manifest().companyName ?? "__unset__")
  })

  test("tenant B's positions and teams lists show none of tenant A's entities", async ({
    page,
  }) => {
    const runId = manifest().runId

    await loginThroughUi(page, tenantBOwner())

    await page.getByRole("link", { name: "Empresa" }).click()
    await page.waitForURL(/\/app\/company(\/|\?|$)/, { timeout: 30_000 })

    await page.getByRole("link", { name: /Gerenciar cargos/i }).click()
    await page.waitForURL(/\/app\/company\/positions(\/|\?|$)/, { timeout: 30_000 })
    await expect(page.locator("body")).not.toContainText(positionName(runId))

    await page.goBack()
    await page.getByRole("link", { name: /Gerenciar times/i }).click()
    await page.waitForURL(/\/app\/company\/teams(\/|\?|$)/, { timeout: 30_000 })
    await expect(page.locator("body")).not.toContainText(teamName(runId))
  })

  test("tenant B's people list shows none of tenant A's people", async ({ page }) => {
    const runId = manifest().runId

    await loginThroughUi(page, tenantBOwner())
    await page.getByRole("link", { name: "Pessoas" }).click()
    await page.waitForURL(/\/app\/people(\/|\?|$)/, { timeout: 30_000 })

    await expect(page.locator("body")).not.toContainText(personName(runId))
    await expect(page.locator("body")).not.toContainText(positionName(runId))
    await expect(page.locator("body")).not.toContainText(teamName(runId))
  })

  test("a direct URL to tenant A's department is denied, and leaks nothing", async ({ page }) => {
    const runId = manifest().runId
    // Privileged read, used ONLY to know which door to try.
    const foreignId = await departmentId(tenantACompanyId(), departmentName(runId))

    await loginThroughUi(page, tenantBOwner())
    await expectAuthenticatedShell(page)

    const foreign = await outcomeForDepartmentId(page, foreignId)

    // The department detail page resolves its target inside the session's own
    // tenant, finds nothing, and leaves. Whatever it lands on, it must not be the
    // department itself, and it must carry nothing about tenant A.
    expect(foreign.pathname).not.toBe(`/app/company/departments/${foreignId}`)
    expect(foreign.body).not.toContain(departmentName(runId))
    expect(foreign.body).not.toContain(manifest().companyName ?? "__unset__")
    expect(foreign.body).not.toContain(foreignId)

    // Denial, not a dropped session.
    await expect(page).not.toHaveURL(/\/login(\?|$)/)
  })

  test("the denial is indistinguishable from a department that does not exist", async ({
    page,
  }) => {
    const runId = manifest().runId
    const foreignId = await departmentId(tenantACompanyId(), departmentName(runId))
    // Exists in no tenant at all. Generated locally, never written anywhere.
    const nonexistentId = randomUUID()

    await loginThroughUi(page, tenantBOwner())

    const foreign = await outcomeForDepartmentId(page, foreignId)
    const nonexistent = await outcomeForDepartmentId(page, nonexistentId)

    // The oracle test. If a real-but-foreign id behaved differently from a
    // fictional one, the application would be confirming which ids are real.
    //
    // NOTE ON THE OBSERVED CONTRACT: the page redirects to
    // `/app/company/departments`, which is not a route this application defines —
    // departments live inline on `/app/company`. Both ids therefore land in the
    // same place, so the isolation property holds and this assertion is sound.
    // The broken redirect target is a separate product defect, reported rather
    // than fixed inside a spec, and this test deliberately asserts equivalence
    // instead of hard-coding whichever page that redirect currently produces.
    expect(foreign.pathname).toBe(nonexistent.pathname)
    expect(foreign.body).not.toContain(departmentName(runId))
  })
})
