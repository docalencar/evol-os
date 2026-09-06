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
  ownedCompanyIds,
  record,
  recordCompany,
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

/**
 * Why a journalled resource could not be removed.
 *
 * `REQUIRES_QUARANTINE` is the one that matters. `activity_events` is an
 * intentionally immutable audit log — `BEFORE UPDATE` and `BEFORE DELETE`
 * triggers that always raise — and it references both `companies` (ON DELETE
 * CASCADE) and `auth.users` (ON DELETE SET NULL, which is an UPDATE). So a tenant
 * that has emitted a single audit event, and the user named as its actor, become
 * permanently undeletable *by design*.
 *
 * That is not an orphan and reporting it as one invites someone to "fix" cleanup
 * by weakening the audit contract. It is a resource the product says must be
 * retired rather than erased, and it needs a decision, not a retry.
 */
export type DeletionFailureClassification = "REQUIRES_QUARANTINE" | "UNKNOWN"

export function classifyDeletionFailure(reason: string): DeletionFailureClassification {
  return /activity events are immutable/i.test(reason) ? "REQUIRES_QUARANTINE" : "UNKNOWN"
}

export type CleanupReport = Readonly<{
  /** True when at least one company went. Kept for existing readers. */
  companyDeleted: boolean
  /** Every company actually removed — one per tenant this run owned. */
  companiesDeleted: string[]
  usersDeleted: string[]
  orphaned: Array<{
    kind: string
    id: string
    reason: string
    classification?: DeletionFailureClassification
  }>
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
  const companiesDeleted: string[] = []

  // Every journalled company, not just the first. E2E-1 introduced a second
  // tenant — created through the onboarding UI — and the previous single-company
  // path would have silently left it behind while still reporting success.
  const companyIds = ownedCompanyIds(journal)

  for (const companyId of companyIds) {
    const { error } = await adminClient().from("companies").delete().eq("id", companyId)
    if (error) {
      orphaned.push({
        kind: "company",
        id: companyId,
        reason: error.message,
        classification: classifyDeletionFailure(error.message),
      })
    } else companiesDeleted.push(companyId)
  }

  const { deleteSyntheticUsers } = await import("./synthetic-identity")
  const userIds = new Set<string>(journal.users.map((user) => user.userId))
  for (const resource of journal.owned ?? []) {
    if (resource.kind === "auth.user" && typeof resource.id === "string") userIds.add(resource.id)
  }

  const { deleted, failed } = await deleteSyntheticUsers([...userIds])
  for (const failure of failed) {
    orphaned.push({
      kind: "auth.user",
      id: failure.userId,
      reason: failure.reason,
      classification: classifyDeletionFailure(failure.reason),
    })
  }

  return Object.freeze({
    companyDeleted: companiesDeleted.length > 0,
    companiesDeleted,
    usersDeleted: deleted,
    orphaned,
    nothingToDo: companyIds.length === 0 && userIds.size === 0,
  })
}

/**
 * Close the crash window around UI-created tenants.
 *
 * The onboarding journey creates a company by clicking a button. Between that
 * click and the spec journalling the result, a crash would strand a company that
 * teardown has no authority to delete — the journal would simply not know it.
 *
 * So before deleting anything, ask the database which companies this run's own
 * synthetic users **own**, and record any that are missing. This is not a
 * broadened predicate and not inference: the input is the set of full auth-user
 * UUIDs the journal already owns, the output is full company UUIDs read from
 * `company_members` filtered to `role = 'owner'`, and every one of them is
 * written to the journal *before* it becomes a deletion candidate. The journal
 * stays the only deletion authority.
 *
 * A synthetic user created minutes ago by this run cannot own a company that
 * predates the run, so this can never reach pre-existing Review data.
 *
 * ## Why this fails closed three separate ways
 *
 * Reconciliation is the one place where the harness *discovers* a deletion
 * target rather than being told about it, so every uncertain outcome must stop
 * the run rather than shrink into "nothing to adopt":
 *
 *   - a failed read returns `unavailable`, never an empty adoption list. An
 *     empty list would be indistinguishable from a healthy run with nothing to
 *     reconcile, and cleanup would then report success while a company survived;
 *   - a row with a malformed or partial company id returns `unusable`. A
 *     truncated id is a *different* predicate, not a narrower one;
 *   - two or more unknown owned companies for one user returns `ambiguous`.
 *     `create_company_with_owner` raises `USER_ALREADY_HAS_COMPANY` for a caller
 *     that already has an active membership, so one synthetic identity can only
 *     ever own one company. Seeing two means the world does not match the model,
 *     and guessing which to delete is exactly the improvisation this harness
 *     refuses to make.
 */
export type ReconciliationResult =
  | Readonly<{ status: "ok"; adopted: string[] }>
  | Readonly<{ status: "unavailable"; reason: string }>
  | Readonly<{ status: "unusable"; reason: string }>
  | Readonly<{ status: "ambiguous"; userId: string; candidates: string[] }>

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function journalledUserIds(journal: {
  users: readonly { userId: string }[]
  owned?: ReadonlyArray<{ kind: string; id?: string }>
}): string[] {
  return [
    ...new Set([
      ...journal.users.map((user) => user.userId),
      ...(journal.owned ?? [])
        .filter((r) => r.kind === "auth.user" && typeof r.id === "string")
        .map((r) => r.id as string),
    ]),
  ].filter((id) => typeof id === "string" && id.length > 0)
}

/**
 * The whole decision, as a pure function of the rows and what is already known.
 *
 * Kept separate from the query so every refusal path can be tested exhaustively
 * without a live control plane. This is the code that decides what may be
 * deleted, so it is the code that most needs to be pinned by tests.
 *
 * Note it returns candidates rather than writing them: journalling stays with the
 * caller, which does it before any deletion.
 */
export function classifyOwnershipRows(
  rows: ReadonlyArray<{ company_id: unknown; user_id: unknown }>,
  knownCompanyIds: readonly string[],
): ReconciliationResult {
  const known = new Set(knownCompanyIds)

  // Grouped per identity, so ambiguity is judged per user rather than across the
  // run as a whole — two users each owning one new company is not ambiguous.
  const unknownByUser = new Map<string, string[]>()

  for (const row of rows) {
    const companyId = row.company_id
    const userId = row.user_id

    if (typeof companyId !== "string" || !UUID_RE.test(companyId)) {
      return Object.freeze({
        status: "unusable",
        reason: "company_members returned a company_id that is not a complete UUID",
      })
    }
    if (typeof userId !== "string" || !UUID_RE.test(userId)) {
      return Object.freeze({
        status: "unusable",
        reason: "company_members returned a user_id that is not a complete UUID",
      })
    }
    if (known.has(companyId)) continue

    const existing = unknownByUser.get(userId) ?? []
    if (!existing.includes(companyId)) existing.push(companyId)
    unknownByUser.set(userId, existing)
  }

  for (const [userId, candidates] of unknownByUser) {
    if (candidates.length > 1) {
      return Object.freeze({ status: "ambiguous", userId, candidates: [...candidates].sort() })
    }
  }

  return Object.freeze({
    status: "ok",
    adopted: [...unknownByUser.values()].map((candidates) => candidates[0]),
  })
}

export async function reconcileOwnedCompanies(journal: Journal): Promise<ReconciliationResult> {
  const userIds = journalledUserIds(journal)
  if (userIds.length === 0) return Object.freeze({ status: "ok", adopted: [] })

  const { data, error } = await adminClient()
    .from("company_members")
    .select("company_id, user_id")
    .in("user_id", userIds) // the ONLY discovery key: journalled full UUIDs
    .eq("role", "owner")

  // Fail closed: an unreadable control plane is not evidence of nothing to adopt.
  if (error || !data) {
    return Object.freeze({
      status: "unavailable",
      reason: error?.message ?? "no rows returned from company_members",
    })
  }

  const verdict = classifyOwnershipRows(
    data as Array<{ company_id: unknown; user_id: unknown }>,
    ownedCompanyIds(journal),
  )

  if (verdict.status !== "ok") return verdict

  // Journalled BEFORE any of them becomes a deletion candidate.
  for (const companyId of verdict.adopted) recordCompany(journal, companyId)

  return verdict
}

type OwnedResourceLike = { kind: string; id?: string }
