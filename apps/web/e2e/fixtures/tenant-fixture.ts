/**
 * Run-owned tenant fixture — RUNNER ONLY.
 *
 * BOOTSTRAP DATA is created here; JOURNEY ACTIONS never are.
 *
 * ## The ordering contract, read from the schema
 *
 * Two constraints pull in opposite directions:
 *
 *   `people_company_user_membership_fkey`  (migration 0071)
 *       people(company_id, user_id) → company_members(company_id, user_id)
 *       ON DELETE RESTRICT, DEFERRABLE **INITIALLY IMMEDIATE**
 *       ⇒ the membership must exist before the person.
 *
 *   `enforce_active_membership_has_people` (migration 0072)
 *       constraint trigger on company_members, AFTER INSERT OR UPDATE,
 *       DEFERRABLE **INITIALLY DEFERRED**, and it only checks rows whose
 *       status is 'active'
 *       ⇒ an *active* membership must have exactly one matching person by
 *         COMMIT.
 *
 * `create_company_with_owner` inserts the active membership before the person and
 * still works, because a plpgsql function body is a single transaction: the
 * deferred trigger runs at COMMIT, by which time the person exists.
 *
 * The harness has no such luxury. Each PostgREST call is its own transaction, so
 * neither order works with `status = 'active'`:
 *   - person first  → immediate FK violation, no membership to reference;
 *   - active membership first → deferred trigger fires at that statement's own
 *     COMMIT, finds no person, and raises.
 *
 * The way through is the third documented status. `company_members.status` is
 * `check (status in ('active', 'inactive', 'invited'))` (migration 0001), and the
 * trigger ignores anything that is not 'active'. So:
 *
 *   1. insert the membership as 'invited'  — trigger skips a non-active row
 *   2. insert the person                   — FK satisfied, membership exists
 *   3. update the membership to 'active'   — deferred check now finds the person
 *
 * `invited` is the domain's own word for "membership row exists, user is not yet
 * an active member", which is exactly the transient state here. No constraint is
 * disabled, no trigger is bypassed, no RLS is weakened, and no E2E-only schema is
 * introduced.
 *
 * The owner is not created this way: `create_company_with_owner` already does it
 * atomically and correctly, and it is the real onboarding boundary.
 */

import { adminClient, userClient } from "../helpers/admin-client"
import {
  record,
  recordUser,
  setCompany,
  updateUser,
  type Journal,
} from "../helpers/journal"
import type { SyntheticUser } from "../helpers/run-context"

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
 * Create the run's company through the real onboarding RPC, as the admin.
 *
 * The function is `security definer` and reads `auth.uid()`, so the service role
 * cannot call it — the synthetic admin's own session is both the faithful path
 * and the only one that works. It creates the company, the owner membership and
 * the owner's person row together.
 */
async function createCompanyAsOwner(
  admin: SyntheticUser,
  runId: string,
  journal: Journal,
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

  const companyId = data as string
  // Journalled before anything else touches it: the company owns the cascade.
  setCompany(journal, { id: companyId, name, slug })
  return { companyId, name, slug }
}

/** Attach a non-owner identity, following the three-step contract documented above. */
async function attachMember(
  companyId: string,
  user: SyntheticUser,
  journal: Journal,
): Promise<string> {
  const db = adminClient()

  // 1. Membership as 'invited' — the deferred trigger only checks active rows.
  const { error: pendingError } = await db.from("company_members").insert({
    company_id: companyId,
    user_id: user.userId,
    role: user.membershipRole,
    status: "invited",
  })
  if (pendingError) {
    throw new Error(
      `E2E_FIXTURE_MEMBERSHIP_PENDING_FAILED for ${user.role}: ${pendingError.message}`,
    )
  }
  record(journal, { kind: "membership", companyId, userId: user.userId })

  // 2. Person — the immediate FK now has its membership to reference.
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
  const personId = person.id as string
  record(journal, { kind: "person", id: personId })

  // 3. Activate — the deferred check now finds exactly one matching person.
  const { error: activateError } = await db
    .from("company_members")
    .update({ status: "active" })
    .eq("company_id", companyId)
    .eq("user_id", user.userId)

  if (activateError) {
    throw new Error(
      `E2E_FIXTURE_MEMBERSHIP_ACTIVATE_FAILED for ${user.role}: ${activateError.message}`,
    )
  }

  return personId
}

/** Resolve the owner's auto-created person row so teardown can report on it. */
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
  journal: Journal,
): Promise<TenantFixture> {
  const admin = users.find((user) => user.role === "admin")
  if (!admin) throw new Error("E2E_FIXTURE_NO_ADMIN: an admin identity is required.")

  const company = await createCompanyAsOwner(admin, runId, journal)

  const resolved: SyntheticUser[] = []
  for (const user of users) {
    const personId =
      user.role === "admin"
        ? await findOwnerPersonId(company.companyId, user.userId)
        : await attachMember(company.companyId, user, journal)

    const withPerson = { ...user, personId }
    updateUser(journal, withPerson)
    resolved.push(withPerson)
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
  nothingToDo: boolean
}>

/**
 * Destroy exactly what the journal records, narrowest predicate first, and never
 * anything else. Idempotent: a resource already gone is a success, not an error.
 *
 * Order matters and the previous rollback path got it wrong. Deleting an auth
 * user cascades to `company_members` (`on delete cascade`), which then collides
 * with `people_company_user_membership_fkey`'s `on delete restrict` — so the auth
 * delete fails and the user is stranded. Removing the company first cascades to
 * both memberships and people inside one transaction, leaving the auth users free
 * to go.
 */
export async function destroyRunFixtures(journal: {
  companyId: string | null
  users: readonly SyntheticUser[]
  owned?: OwnedResourceLike[]
}): Promise<CleanupReport> {
  const orphaned: CleanupReport["orphaned"] = []
  let companyDeleted = false

  const recordedCompany = journal.owned?.find(
    (resource): resource is { kind: "company"; id: string } =>
      resource.kind === "company" && typeof resource.id === "string",
  )
  const companyId = journal.companyId ?? recordedCompany?.id ?? null

  if (companyId) {
    const { error } = await adminClient().from("companies").delete().eq("id", companyId)
    if (error) orphaned.push({ kind: "company", id: companyId, reason: error.message })
    else companyDeleted = true
  }

  const { deleteSyntheticUsers } = await import("./synthetic-identity")
  const userIds = new Set<string>(journal.users.map((user) => user.userId))
  for (const resource of journal.owned ?? []) {
    if (resource.kind === "auth.user" && typeof resource.id === "string") userIds.add(resource.id)
  }

  const { deleted, failed } = await deleteSyntheticUsers([...userIds])
  for (const failure of failed) {
    orphaned.push({ kind: "auth.user", id: failure.userId, reason: failure.reason })
  }

  return Object.freeze({
    companyDeleted,
    usersDeleted: deleted,
    orphaned,
    nothingToDo: !companyId && userIds.size === 0,
  })
}

type OwnedResourceLike = { kind: string; id?: string }
