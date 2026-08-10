import type { SupabaseClient, User } from "@supabase/supabase-js"

import { isCorporateRole, type CorporateRole } from "./roles"
import { resolveActiveTenantMemberships } from "./tenant-resolution"

export type CurrentUserContext = Readonly<{
  userId: string
  companyId: string
  role: CorporateRole
}>

export class CurrentUserContextError extends Error {
  constructor(
    readonly code:
      | "unauthenticated"
      | "membership_not_found"
      | "tenant_selection_required"
      | "invalid_role",
    message: string
  ) {
    super(message)
    this.name = "CurrentUserContextError"
  }
}

type MembershipRow = Readonly<{
  company_id: string
  role: string
  status: "active" | "inactive" | "invited"
}>

export async function loadCurrentUserContext(
  supabase: SupabaseClient,
  authenticatedUser?: User
): Promise<CurrentUserContext> {
  const user = authenticatedUser ?? (await supabase.auth.getUser()).data.user

  if (!user) {
    throw new CurrentUserContextError(
      "unauthenticated",
      "Usuário não autenticado."
    )
  }

  const { data, error } = await supabase
    .from("company_members")
    .select("company_id, role, status")
    .eq("user_id", user.id)

  if (error) {
    throw new CurrentUserContextError(
      "membership_not_found",
      "Não foi possível identificar a empresa do usuário."
    )
  }

  const memberships = (data ?? []) as MembershipRow[]

  if (
    memberships.some(
      (membership) =>
        membership.status === "active" && !isCorporateRole(membership.role)
    )
  ) {
    throw new CurrentUserContextError(
      "invalid_role",
      "O vínculo do usuário possui um papel corporativo inválido."
    )
  }

  const resolution = resolveActiveTenantMemberships(
    memberships.map((membership) => ({
      companyId: membership.company_id,
      role: membership.role as CorporateRole,
      status: membership.status,
    }))
  )

  if (resolution.status === "no_membership") {
    throw new CurrentUserContextError(
      "membership_not_found",
      "O usuário não possui vínculo ativo com uma empresa."
    )
  }

  if (resolution.status === "tenant_selection_required") {
    throw new CurrentUserContextError(
      "tenant_selection_required",
      "O usuário precisa selecionar uma empresa antes de continuar."
    )
  }

  return Object.freeze({
    userId: user.id,
    companyId: resolution.companyId,
    role: resolution.membership.role,
  })
}
