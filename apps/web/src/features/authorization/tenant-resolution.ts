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

export function resolveActiveTenantMemberships(
  candidates: readonly TenantMembershipCandidate[]
): TenantResolution {
  const memberships = candidates
    .filter((candidate) => candidate.status === "active")
    .map(({ companyId, role }) => ({ companyId, role }))

  if (memberships.length === 0) {
    return Object.freeze({ status: "no_membership" })
  }

  if (memberships.length === 1) {
    const membership = Object.freeze({ ...memberships[0] })

    return Object.freeze({
      status: "resolved",
      companyId: membership.companyId,
      membership,
    })
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

  return Object.freeze({
    status: "tenant_selection_required",
    memberships: Object.freeze(orderedMemberships),
  })
}
