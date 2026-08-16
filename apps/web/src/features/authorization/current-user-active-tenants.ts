import type { SupabaseClient } from "@supabase/supabase-js"

import { isCorporateRole, type CorporateRole } from "./roles"

export type CurrentUserActiveTenant = Readonly<{
  companyId: string
  companyName: string
  role: CorporateRole
}>

export class CurrentUserActiveTenantsError extends Error {
  constructor(
    readonly code: "read_failed" | "invalid_response" | "invalid_role",
    message: string,
  ) {
    super(message)
    this.name = "CurrentUserActiveTenantsError"
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseRow(row: unknown): CurrentUserActiveTenant {
  if (
    !isRecord(row) ||
    typeof row.company_id !== "string" ||
    row.company_id.trim().length === 0 ||
    typeof row.company_name !== "string" ||
    row.company_name.trim().length === 0 ||
    typeof row.membership_role !== "string"
  ) {
    throw new CurrentUserActiveTenantsError(
      "invalid_response",
      "Não foi possível validar os vínculos do usuário.",
    )
  }

  if (!isCorporateRole(row.membership_role)) {
    throw new CurrentUserActiveTenantsError(
      "invalid_role",
      "O vínculo do usuário possui um papel corporativo inválido.",
    )
  }

  return Object.freeze({
    companyId: row.company_id,
    companyName: row.company_name,
    role: row.membership_role,
  })
}

export async function loadCurrentUserActiveTenants(
  supabase: SupabaseClient,
): Promise<readonly CurrentUserActiveTenant[]> {
  let response: Readonly<{ data: unknown; error: unknown }>

  try {
    response = await supabase.rpc("get_current_user_active_tenants_v1")
  } catch {
    throw new CurrentUserActiveTenantsError(
      "read_failed",
      "Não foi possível carregar os vínculos do usuário.",
    )
  }

  if (response.error) {
    throw new CurrentUserActiveTenantsError(
      "read_failed",
      "Não foi possível carregar os vínculos do usuário.",
    )
  }

  if (!Array.isArray(response.data)) {
    throw new CurrentUserActiveTenantsError(
      "invalid_response",
      "Não foi possível validar os vínculos do usuário.",
    )
  }

  return Object.freeze(
    response.data
      .map(parseRow)
      .sort((left, right) =>
        left.companyId < right.companyId
          ? -1
          : left.companyId > right.companyId
            ? 1
            : 0,
      ),
  )
}
