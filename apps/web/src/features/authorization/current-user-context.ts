import type { SupabaseClient, User } from "@supabase/supabase-js"

import { isCorporateRole, type CorporateRole } from "./roles"

export type CurrentUserContext = Readonly<{
  userId: string
  companyId: string
  role: CorporateRole
}>

export class CurrentUserContextError extends Error {
  constructor(
    readonly code: "unauthenticated" | "membership_not_found" | "invalid_role",
    message: string
  ) {
    super(message)
    this.name = "CurrentUserContextError"
  }
}

type MembershipRow = Readonly<{
  company_id: string
  role: string
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
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new CurrentUserContextError(
      "membership_not_found",
      "Não foi possível identificar a empresa do usuário."
    )
  }

  const membership = data as MembershipRow | null
  if (!membership) {
    throw new CurrentUserContextError(
      "membership_not_found",
      "O usuário não possui vínculo ativo com uma empresa."
    )
  }

  if (!isCorporateRole(membership.role)) {
    throw new CurrentUserContextError(
      "invalid_role",
      "O vínculo do usuário possui um papel corporativo inválido."
    )
  }

  return Object.freeze({
    userId: user.id,
    companyId: membership.company_id,
    role: membership.role,
  })
}
