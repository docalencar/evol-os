/**
 * Run-owned tenant fixture — RUNNER ONLY.
 *
 * Boundary between the two kinds of setup, per the fixture contract:
 *
 *   BOOTSTRAP DATA   prerequisites a journey assumes, created here.
 *   JOURNEY ACTIONS  the thing a spec is meant to prove, never created here.
 *
 * The company itself is created through the **real** trusted domain boundary
 * `create_company_with_owner`, called with the synthetic admin's own session. That
 * function is `security definer` and reads `auth.uid()`, so it cannot be called
 * with the service role — using the real session is both more faithful and the
 * only thing that works.
 *
 * Additional members are inserted with the service role. Doing it "properly" would
 * mean driving the invitation issue/accept flow, which is itself an MVP journey
 * (J04) — bootstrapping through it would make the harness circular.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

import { adminClient, userClient } from "../helpers/admin-client"
import type { RunManifest, SyntheticUser } from "../helpers/run-context"

export type TenantFixture = Readonly<{
  companyId: string
  companyName: string
  companySlug: string
  users: SyntheticUser[]
}>

function companyIdentity(runId: string): { name: string; slug: string } {
  return { name: `E2E Review ${runId}`, slug: `e2e-review-${runId}` }
}

/**
 * Create the run's company via the real onboarding RPC, as the admin identity.
 *
 * Side effects of the RPC (schema 0044): inserts `companies`, an `owner` row in
 * `company_members`, and the owner's `people` row. We therefore do not create any
 * of those three for the admin ourselves.
 */
async function createCompanyAsOwner(
  admin: SyntheticUser,
  runId: string,
): Promise<{ companyId: string; name: string; slug: string }> {
  const { name, slug } = companyIdentity(runId)
  const asAdmin = await userClient(admin.email, admin.password)

  const { data, error } = await asAdmin.rpc("create_company_with_owner", {
    p_name: name,
    p_slug: slug,
  })
  await asAdmin.auth.signOut()

  if (error || !data) {
    throw new Error(
      `E2E_TENANT_CREATE_FAILED: create_company_with_owner returned ` +
        `${error?.message ?? "no company id"}`,
    )
  }

  return { companyId: data as string, name, slug }
}

/**
 * Attach a non-owner identity to the run's company.
 *
 * Ordering is forced by the schema: `enforce_active_membership_people_invariant`
 * (migration 0072) rejects an active membership unless exactly one matching
 * `people` row already exists, so the person is inserted first.
 */
async function attachMember(
  companyId: string,
  user: SyntheticUser,
): Promise<string> {
  const db = adminClient()

  const { data: person, error: personError } = await db
    .from("people")
    .insert({
      company_id: companyId,
      user_id: user.userId,
      full_name: user.fullName,
      email: user.email,
      status: "active",
    })
    .select("id")
    .single()

  if (personError || !person) {
    throw new Error(
      `E2E_FIXTURE_PERSON_FAILED for ${user.role}: ${personError?.message ?? "no row"}`,
    )
  }

  const { error: membershipError } = await db.from("company_members").insert({
    company_id: companyId,
    user_id: user.userId,
    role: user.membershipRole,
    status: "active",
  })

  if (membershipError) {
    throw new Error(
      `E2E_FIXTURE_MEMBERSHIP_FAILED for ${user.role}: ${membershipError.message}`,
    )
  }

  return person.id as string
}

/** Resolve the owner's auto-created `people` row so teardown can report on it. */
async function findOwnerPersonId(companyId: string, userId: string): Promise<string | null> {
  const { data } = await adminClient()
    .from("people")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle()
  return (data?.id as string | undefined) ?? null
}

export async function createTenantFixture(
  runId: string,
  users: readonly SyntheticUser[],
): Promise<TenantFixture> {
  const admin = users.find((user) => user.role === "admin")
  if (!admin) throw new Error("E2E_FIXTURE_NO_ADMIN: an admin identity is required.")

  const company = await createCompanyAsOwner(admin, runId)

  const resolved: SyntheticUser[] = []
  for (const user of users) {
    if (user.role === "admin") {
      resolved.push({
        ...user,
        personId: await findOwnerPersonId(company.companyId, user.userId),
      })
      continue
    }
    resolved.push({ ...user, personId: await attachMember(company.companyId, user) })
  }

  return Object.freeze({
    companyId: company.companyId,
    companyName: company.name,
    companySlug: company.slug,
    users: resolved,
  })
}

export type CleanupReport = Readonly<{
  companyDeleted: boolean
  usersDeleted: string[]
  orphaned: Array<{ kind: string; id: string; reason: string }>
}>

/**
 * Teardown, narrowest predicate first.
 *
 * Deleting the company cascades to `company_members` and `people`
 * (`on delete cascade`, migration 0001) inside one transaction, which also
 * satisfies the deferred `protect_active_membership_people_link` constraint:
 * by commit time no active membership remains to protect.
 *
 * Auth users are removed last. On failure nothing is retried with a broader
 * predicate — the orphan is reported by exact id instead.
 */
export async function destroyRunFixtures(manifest: RunManifest): Promise<CleanupReport> {
  const orphaned: CleanupReport["orphaned"] = []
  let companyDeleted = false

  if (manifest.companyId) {
    const { error } = await adminClient()
      .from("companies")
      .delete()
      .eq("id", manifest.companyId)

    if (error) {
      orphaned.push({ kind: "company", id: manifest.companyId, reason: error.message })
    } else {
      companyDeleted = true
    }
  }

  const { deleteSyntheticUsers } = await import("./synthetic-identity")
  const { deleted, failed } = await deleteSyntheticUsers(manifest.users)
  for (const failure of failed) {
    orphaned.push({ kind: "auth.user", id: failure.userId, reason: failure.reason })
  }

  return Object.freeze({ companyDeleted, usersDeleted: deleted, orphaned })
}
