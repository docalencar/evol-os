import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

export type TenantPersonInvitationContact = Readonly<{
  personId: string
  email: string | null
}>

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export async function loadTenantPersonInvitationContact(
  supabase: SupabaseClient,
  companyId: string,
  personId: string,
): Promise<TenantPersonInvitationContact | null> {
  try {
    const { data, error } = await supabase.rpc(
      "get_tenant_person_invitation_contact_v1",
      {
        p_company_id: companyId,
        p_person_id: personId,
      },
    )

    if (error || !Array.isArray(data) || data.length !== 1) return null

    const row: unknown = data[0]
    if (
      !isRecord(row) ||
      row.person_id !== personId ||
      (typeof row.email !== "string" && row.email !== null)
    ) {
      return null
    }

    return Object.freeze({
      personId: row.person_id,
      email: row.email,
    })
  } catch {
    return null
  }
}
