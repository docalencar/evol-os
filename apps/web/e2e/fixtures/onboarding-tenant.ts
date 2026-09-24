/**
 * Tenant B — resolved AFTER the browser created it. RUNNER ONLY.
 *
 * The reusable ensure helper creates through the real onboarding UI only when the
 * current run has no tenant B. Resolution then reads back what the product did so
 * that
 *
 *   1. the ownership journal gains deletion authority over it, and
 *   2. the cross-tenant spec has a foreign tenant to be denied.
 *
 * Reading back through the privileged client is bootstrap/teardown work, not
 * proof. The journey's own proof is the UI readback; isolation proofs run through
 * the foreign owner's authenticated browser session.
 */

import { expect, type Page } from "@playwright/test"

import { expectTenantContext, loginExpectingOnboarding, loginThroughUi } from "../auth/login"
import { adminClient } from "../helpers/admin-client"
import { readJournal, setOnboardingCompany, type Journal } from "../helpers/journal"
import type { OwnedTenant, SyntheticUser } from "../helpers/run-context"

export type ResolvedOnboardingTenant = OwnedTenant & Readonly<{
  /** The owner's `people` row, created by `create_company_with_owner`. */
  ownerPersonId: string
}>

/** Ensure this run owns a genuinely foreign tenant through the real product. */
export async function ensureRunOwnedForeignTenant(
  page: Page,
  user: SyntheticUser,
  runId: string,
): Promise<ResolvedOnboardingTenant> {
  const journal = readJournal()
  if (!journal) throw new Error("E2E_JOURNAL_MISSING: cannot own the foreign tenant.")

  if (journal.onboardingCompany) {
    if (journal.onboardingCompany.ownerUserId !== user.userId) {
      throw new Error("E2E_FOREIGN_TENANT_OWNER_MISMATCH")
    }
    const ownerPersonId = await resolveOwnerPersonId(
      journal.onboardingCompany.companyId,
      user.userId,
    )
    await loginThroughUi(page, user)
    await expectTenantContext(page, journal.onboardingCompany.companyName)
    return Object.freeze({ ...journal.onboardingCompany, ownerPersonId })
  }

  const companyName = `E2E Onboarding ${runId}`
  await loginExpectingOnboarding(page, user)
  await page.locator("#company-name").fill(companyName)
  await page.getByRole("button", { name: /^Continuar$/ }).click()
  await expect(page.getByText(companyName).first()).toBeVisible()
  await Promise.all([
    page.waitForURL(/\/app(\/|$)/, { timeout: 60_000 }),
    page.getByRole("button", { name: /Criar empresa e continuar/i }).click(),
  ])
  await expectTenantContext(page, companyName)

  const tenant = await resolveAndJournalOnboardingTenant(journal, user.userId)
  if (tenant.companyName !== companyName || tenant.ownerUserId !== user.userId) {
    throw new Error("E2E_FOREIGN_TENANT_IDENTITY_MISMATCH")
  }
  return tenant
}

/**
 * Find the company the given synthetic user owns, and record it as run-owned.
 *
 * Scoped by the exact auth-user UUID and `role = 'owner'`. A synthetic identity
 * minutes old cannot own anything but what this run's journey just created, so
 * this can never resolve pre-existing Review data.
 */
export async function resolveAndJournalOnboardingTenant(
  journal: Journal,
  ownerUserId: string,
): Promise<ResolvedOnboardingTenant> {
  const db = adminClient()

  const { data: membership, error: membershipError } = await db
    .from("company_members")
    .select("company_id")
    .eq("user_id", ownerUserId)
    .eq("role", "owner")
    .eq("status", "active")
    .maybeSingle()

  if (membershipError) {
    throw new Error(`E2E_ONBOARDING_TENANT_LOOKUP_FAILED: ${membershipError.message}`)
  }
  if (!membership?.company_id) {
    throw new Error(
      "E2E_ONBOARDING_TENANT_MISSING: the onboarding user owns no active company. " +
        "The UI journey did not create one.",
    )
  }

  const companyId = membership.company_id as string

  const { data: company, error: companyError } = await db
    .from("companies")
    .select("id, name, slug")
    .eq("id", companyId)
    .single()

  if (companyError || !company) {
    throw new Error(
      `E2E_ONBOARDING_TENANT_UNREADABLE: ${companyError?.message ?? "no company row"}`,
    )
  }

  // Journalled before the caller does anything else with it.
  const tenant: OwnedTenant = {
    companyId,
    companyName: company.name as string,
    companySlug: (company.slug as string | null) ?? null,
    ownerUserId,
  }
  setOnboardingCompany(journal, tenant)

  const { data: person, error: personError } = await db
    .from("people")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", ownerUserId)
    .maybeSingle()

  if (personError || !person?.id) {
    throw new Error(
      "E2E_ONBOARDING_OWNER_PERSON_MISSING: create_company_with_owner should have " +
        `created the owner's person row. ${personError?.message ?? ""}`.trim(),
    )
  }

  return Object.freeze({ ...tenant, ownerPersonId: person.id as string })
}

/**
 * Read back the owner's person id for an already-journalled tenant.
 *
 * This supplies the cross-tenant spec with its *target* UUID. Supplying a target
 * is not the same as proving the denial: the denial itself is asserted entirely
 * through the authenticated browser session, which never sees this client. A
 * privileged read here would be indefensible if it were used to conclude
 * anything about access — it is used only to know which door to try.
 */
export async function resolveOwnerPersonId(
  companyId: string,
  ownerUserId: string,
): Promise<string> {
  const { data, error } = await adminClient()
    .from("people")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", ownerUserId)
    .maybeSingle()

  if (error || !data?.id) {
    throw new Error(
      `E2E_TENANT_B_PERSON_UNRESOLVED: ${error?.message ?? "no person row for the owner"}`,
    )
  }
  return data.id as string
}
