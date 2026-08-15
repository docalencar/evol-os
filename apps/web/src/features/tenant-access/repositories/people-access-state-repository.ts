import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import type { PeopleAccessStateRow } from "../types/people-access-state"

const rowSchema = z.object({
  person_id: z.string().uuid(),
  membership_role: z.enum(["owner", "admin", "hr", "manager", "employee"]).nullable(),
  membership_status: z.enum(["active", "inactive", "invited"]).nullable(),
  invitation_id: z.string().uuid().nullable(),
  invitation_role: z.enum(["owner", "admin", "hr", "manager", "employee"]).nullable(),
  invitation_status: z.enum(["pending", "expired", "revoked", "accepted"]).nullable(),
  invitation_generation: z.number().int().positive().nullable(),
  invitation_expires_at: z.string().datetime({ offset: true }).nullable(),
}).strict()

function parseRows(payload: unknown): readonly PeopleAccessStateRow[] | null {
  const parsed = z.array(rowSchema).safeParse(payload)
  if (!parsed.success) return null

  return parsed.data.map((row) => ({
    personId: row.person_id,
    membershipRole: row.membership_role,
    membershipStatus: row.membership_status,
    invitationId: row.invitation_id,
    invitationRole: row.invitation_role,
    invitationStatus: row.invitation_status,
    invitationGeneration: row.invitation_generation,
    invitationExpiresAt: row.invitation_expires_at,
  }))
}

export function createPeopleAccessStateRepository(supabase: SupabaseClient) {
  return {
    async findAllByCompany(companyId: string): Promise<readonly PeopleAccessStateRow[] | null> {
      const { data, error } = await supabase.rpc("get_people_access_state_v1", {
        p_company_id: companyId,
      })

      if (error) return null
      return parseRows(data)
    },
  }
}

export { parseRows as parsePeopleAccessStateRows }
