/**
 * Synthetic disposable identities — RUNNER ONLY.
 *
 * Users are created through the Supabase Admin API with `email_confirm: true`, so
 * they exist already confirmed without disabling the project's `Confirm email`
 * setting and without depending on mailbox delivery.
 *
 * This is a deterministic fixture mechanism, NOT proof of the signup
 * email-confirmation journey. That journey needs a provider-backed mailbox and is
 * explicitly out of scope for the baseline harness.
 */

import { adminClient } from "../helpers/admin-client"
import { e2eEnv } from "../helpers/env"
import {
  newSyntheticPassword,
  syntheticEmail,
  type SyntheticRole,
  type SyntheticUser,
} from "../helpers/run-context"

const FULL_NAMES: Record<SyntheticRole, string> = {
  admin: "E2E Admin",
  manager: "E2E Manager",
  employee: "E2E Employee",
  onboarding: "E2E Onboarding",
}

/**
 * Corporate role each synthetic identity holds in `company_members.role`.
 *
 * Values are the real enum from the schema check constraint
 * (`owner | admin | hr | manager | employee`, migration 0001). The admin identity
 * is the tenant `owner` because `create_company_with_owner` creates the company
 * with its caller as owner — that is the real onboarding boundary.
 */
const MEMBERSHIP_ROLE: Record<SyntheticRole, SyntheticUser["membershipRole"]> = {
  admin: "owner",
  manager: "manager",
  employee: "employee",
  // The onboarding identity holds NO membership when it is created. `owner` is
  // the role `create_company_with_owner` will give it once the journey runs; the
  // fixture never writes it, and `createTenantFixture` never sees this identity.
  onboarding: "owner",
}

export async function createSyntheticUser(
  runId: string,
  role: SyntheticRole,
): Promise<SyntheticUser> {
  const env = e2eEnv()
  const admin = adminClient()
  const email = syntheticEmail(runId, role, env.emailDomain)
  const password = newSyntheticPassword()
  const fullName = `${FULL_NAMES[role]} ${runId}`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, evol_e2e_run_id: runId },
  })

  if (error || !data.user) {
    throw new Error(
      `E2E_IDENTITY_CREATE_FAILED for role ${role} (${email}): ${error?.message ?? "no user returned"}`,
    )
  }

  return {
    role,
    membershipRole: MEMBERSHIP_ROLE[role],
    email,
    userId: data.user.id,
    personId: null,
    fullName,
    password,
  }
}

/**
 * Delete synthetic auth users by id. Called last in teardown, after domain rows.
 *
 * Idempotent: a user that is already gone counts as deleted, so re-running
 * cleanup after a partial failure is safe.
 */
export async function deleteSyntheticUsers(
  userIds: readonly string[],
): Promise<{ deleted: string[]; failed: Array<{ userId: string; reason: string }> }> {
  const admin = adminClient()
  const deleted: string[] = []
  const failed: Array<{ userId: string; reason: string }> = []

  for (const userId of userIds) {
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (!error || /not.?found/i.test(error.message)) deleted.push(userId)
    else failed.push({ userId, reason: error.message })
  }

  return { deleted, failed }
}
