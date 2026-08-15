import type { CorporateRole } from "@/features/authorization"

import type { TenantMembershipRole } from "../application"

export type InvitationRoleOption = Readonly<{
  value: TenantMembershipRole
  label: string
}>

const INVITATION_ROLE_OPTIONS: readonly InvitationRoleOption[] = Object.freeze([
  { value: "owner", label: "Proprietário" },
  { value: "admin", label: "Administrador" },
  { value: "hr", label: "RH" },
  { value: "manager", label: "Gestor" },
  { value: "employee", label: "Colaborador" },
])

export function getInvitationRoleOptionsForActor(
  actorRole: CorporateRole,
): readonly InvitationRoleOption[] {
  if (actorRole === "owner") return INVITATION_ROLE_OPTIONS
  if (actorRole === "admin") {
    return INVITATION_ROLE_OPTIONS.filter((option) => option.value !== "owner")
  }
  return []
}
