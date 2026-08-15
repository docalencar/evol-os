import type { TenantMembershipRole } from "../application"
import type {
  PeopleAccessStateRow,
  PeopleAccessStateViewModel,
} from "../types/people-access-state"

const ROLE_LABELS: Record<TenantMembershipRole, string> = {
  owner: "Owner",
  admin: "Admin",
  hr: "RH",
  manager: "Gestor",
  employee: "Colaborador",
}

const MEMBERSHIP_ROLES = Object.keys(ROLE_LABELS) as TenantMembershipRole[]

function result(
  status: PeopleAccessStateViewModel["status"],
  label: string,
  row: PeopleAccessStateRow | null,
  actorRole: TenantMembershipRole,
  isActor: boolean,
): PeopleAccessStateViewModel {
  const role = row?.membershipRole ?? row?.invitationRole ?? null
  const invitationActionAllowed = Boolean(
    row?.invitationId &&
    row.invitationGeneration &&
    (actorRole === "owner" || row.invitationRole !== "owner"),
  )
  const coherentActiveMembership = Boolean(
    row?.membershipId && row.membershipRole && row.membershipStatus === "active",
  )
  const actorCanManageTarget = actorRole === "owner" ||
    (actorRole === "admin" && row?.membershipRole !== "owner")
  const roleOptions = coherentActiveMembership && actorCanManageTarget
    ? MEMBERSHIP_ROLES
      .filter((role) => actorRole === "owner" || role !== "owner")
      .map((role) => ({ value: role, label: ROLE_LABELS[role] }))
    : []

  return {
    status,
    label,
    roleLabel: role ? ROLE_LABELS[role] : null,
    membershipId: coherentActiveMembership ? row?.membershipId ?? null : null,
    membershipRole: coherentActiveMembership ? row?.membershipRole ?? null : null,
    membershipStatus: coherentActiveMembership ? "active" : row?.membershipStatus ?? null,
    roleOptions,
    canChangeRole: coherentActiveMembership && actorCanManageTarget,
    canDeactivate: coherentActiveMembership && actorCanManageTarget,
    canTransferOwnership: coherentActiveMembership && actorRole === "owner" &&
      row?.membershipRole !== "owner" && !isActor,
    canIssue: status === "no_access" || status === "invitation_revoked",
    canResend: invitationActionAllowed &&
      (status === "invitation_pending" || status === "invitation_expired"),
    canRevoke: invitationActionAllowed &&
      (status === "invitation_pending" || status === "invitation_expired"),
    invitationId: row?.invitationId ?? null,
    invitationGeneration: row?.invitationGeneration ?? null,
  }
}

export function presentPeopleAccessState(
  row: PeopleAccessStateRow | null,
  actorRole: TenantMembershipRole,
  available = true,
  isActor = false,
): PeopleAccessStateViewModel {
  if (!available) return result("unavailable", "Estado indisponível", null, actorRole, isActor)
  if (row?.membershipStatus === "active") return result("access_active", "Acesso ativo", row, actorRole, isActor)
  if (row?.membershipStatus === "inactive") return result("access_inactive", "Acesso inativo", row, actorRole, isActor)
  if (row?.membershipStatus === "invited") return result("access_pending", "Acesso pendente", row, actorRole, isActor)
  if (row?.invitationStatus === "pending") return result("invitation_pending", "Convite pendente", row, actorRole, isActor)
  if (row?.invitationStatus === "expired") return result("invitation_expired", "Convite expirado", row, actorRole, isActor)
  if (row?.invitationStatus === "revoked") return result("invitation_revoked", "Convite revogado", row, actorRole, isActor)
  if (row?.invitationStatus === "accepted") return result("unavailable", "Estado indisponível", row, actorRole, isActor)
  return result("no_access", "Sem acesso", row, actorRole, isActor)
}
