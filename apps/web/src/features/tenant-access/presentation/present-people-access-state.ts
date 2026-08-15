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

function result(
  status: PeopleAccessStateViewModel["status"],
  label: string,
  row: PeopleAccessStateRow | null,
  actorRole: TenantMembershipRole,
): PeopleAccessStateViewModel {
  const role = row?.membershipRole ?? row?.invitationRole ?? null
  const invitationActionAllowed = Boolean(
    row?.invitationId &&
    row.invitationGeneration &&
    (actorRole === "owner" || row.invitationRole !== "owner"),
  )

  return {
    status,
    label,
    roleLabel: role ? ROLE_LABELS[role] : null,
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
): PeopleAccessStateViewModel {
  if (!available) return result("unavailable", "Estado indisponível", null, actorRole)
  if (row?.membershipStatus === "active") return result("access_active", "Acesso ativo", row, actorRole)
  if (row?.membershipStatus === "inactive") return result("access_inactive", "Acesso inativo", row, actorRole)
  if (row?.membershipStatus === "invited") return result("access_pending", "Acesso pendente", row, actorRole)
  if (row?.invitationStatus === "pending") return result("invitation_pending", "Convite pendente", row, actorRole)
  if (row?.invitationStatus === "expired") return result("invitation_expired", "Convite expirado", row, actorRole)
  if (row?.invitationStatus === "revoked") return result("invitation_revoked", "Convite revogado", row, actorRole)
  if (row?.invitationStatus === "accepted") return result("unavailable", "Estado indisponível", row, actorRole)
  return result("no_access", "Sem acesso", row, actorRole)
}
