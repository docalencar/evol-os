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

/** Delete synthetic auth users. Called last in teardown, after domain records. */
export async function deleteSyntheticUsers(
  users: readonly SyntheticUser[],
): Promise<{ deleted: string[]; failed: Array<{ userId: string; reason: string }> }> {
  const admin = adminClient()
  const deleted: string[] = []
  const failed: Array<{ userId: string; reason: string }> = []

  for (const user of users) {
    const { error } = await admin.auth.admin.deleteUser(user.userId)
    if (error) failed.push({ userId: user.userId, reason: error.message })
    else deleted.push(user.userId)
  }

  return { deleted, failed }
}
