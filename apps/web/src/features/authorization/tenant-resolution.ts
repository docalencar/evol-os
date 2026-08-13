import type { CorporateRole } from "./roles"

export type TenantMembershipCandidate = Readonly<{
  companyId: string
  role: CorporateRole
  status: "active" | "inactive" | "invited"
}>

export type ActiveTenantMembership = Omit<TenantMembershipCandidate, "status">

export type TenantResolution =
  | Readonly<{ status: "no_membership" }>
  | Readonly<{
      status: "resolved"
      companyId: string
      membership: ActiveTenantMembership
    }>
  | Readonly<{
      status: "tenant_selection_required"
      memberships: readonly ActiveTenantMembership[]
    }>

function normalizePreferredCompanyId(
  preferredCompanyId?: string | null,
): string | null {
  if (typeof preferredCompanyId !== "string") return null
  const trimmed = preferredCompanyId.trim()
  return trimmed.length > 0 ? trimmed : null
}

function resolvedFor(membership: ActiveTenantMembership): TenantResolution {
  const frozen = Object.freeze({ ...membership })
  return Object.freeze({
    status: "resolved",
    companyId: frozen.companyId,
    membership: frozen,
  })
}

// Deterministic tenant resolution. The preferred company id is CONTEXT, never
// authority: it can only select among the user's own active memberships, never
// grant one. With a single active membership the user always enters it,
// regardless of any preference (preserving the current single-tenant behavior).
// With multiple, a preference that exactly matches one active membership
// resolves it; an absent, empty, foreign, inactive or unknown preference falls
// back to `tenant_selection_required` — never to a first/sorted-first row.
export function resolveActiveTenantMemberships(
  candidates: readonly TenantMembershipCandidate[],
  preferredCompanyId?: string | null,
): TenantResolution {
  const memberships = candidates
    .filter((candidate) => candidate.status === "active")
    .map(({ companyId, role }) => ({ companyId, role }))

  if (memberships.length === 0) {
    return Object.freeze({ status: "no_membership" })
  }

  if (memberships.length === 1) {
    // Single active membership: always resolve it, ignoring any preference.
    return resolvedFor(memberships[0])
  }

  const orderedMemberships = memberships
    .map((membership) => Object.freeze({ ...membership }))
    .sort((left, right) =>
      left.companyId < right.companyId
        ? -1
        : left.companyId > right.companyId
          ? 1
          : 0
    )

  const preferred = normalizePreferredCompanyId(preferredCompanyId)
  if (preferred !== null) {
    const preferredMembership = orderedMemberships.find(
      (membership) => membership.companyId === preferred,
    )
    if (preferredMembership) {
      return resolvedFor(preferredMembership)
    }
  }

  return Object.freeze({
    status: "tenant_selection_required",
    memberships: Object.freeze(orderedMemberships),
  })
}
