/**
 * Tenant B — resolved AFTER the browser created it. RUNNER ONLY.
 *
 * This module deliberately creates nothing. The onboarding journey creates the
 * company by clicking a button in the real UI; all that happens here is that the
 * runner reads back what the product did, so that
 *
 *   1. the ownership journal gains deletion authority over it, and
 *   2. the cross-tenant spec has a foreign tenant to be denied.
 *
 * Reading back through the privileged client is bootstrap/teardown work, not
 * proof. The journey's own proof is the UI readback in spec 02; the isolation
 * proof in spec 04 runs entirely through the browser session.
 */

import { adminClient } from "../helpers/admin-client"
import { setOnboardingCompany, type Journal } from "../helpers/journal"
import type { OwnedTenant } from "../helpers/run-context"

export type ResolvedOnboardingTenant = OwnedTenant & Readonly<{
  /** The owner's `people` row, created by `create_company_with_owner`. */
  ownerPersonId: string
}>

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
