import type { SupabaseClient, User } from "@supabase/supabase-js"

import {
  CurrentUserActiveTenantsError,
  loadCurrentUserActiveTenants,
} from "./current-user-active-tenants"
import type { CorporateRole } from "./roles"
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

export async function loadCurrentUserContext(
  supabase: SupabaseClient,
  authenticatedUser?: User,
  preferredCompanyId?: string | null
): Promise<CurrentUserContext> {
  const user = authenticatedUser ?? (await supabase.auth.getUser()).data.user

  if (!user) {
    throw new CurrentUserContextError(
      "unauthenticated",
      "Usuário não autenticado."
    )
  }

  let activeTenants
  try {
    activeTenants = await loadCurrentUserActiveTenants(supabase)
  } catch (error) {
    if (
      error instanceof CurrentUserActiveTenantsError &&
      error.code === "invalid_role"
    ) {
      throw new CurrentUserContextError(
        "invalid_role",
        "O vínculo do usuário possui um papel corporativo inválido.",
      )
    }
    throw new CurrentUserContextError(
      "membership_not_found",
      "Não foi possível identificar a empresa do usuário."
    )
  }

  const resolution = resolveActiveTenantMemberships(
    activeTenants.map((tenant) => ({
      companyId: tenant.companyId,
      role: tenant.role,
      status: "active" as const,
    })),
    preferredCompanyId
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
