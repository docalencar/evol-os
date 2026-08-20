import { createServerDatabase } from "@/lib/database/server-database"
import { intentKey } from "@/features/people-organization-mutations/idempotency"

import type {
  CreateSeniorityLevelInput,
  UpdateSeniorityLevelInput,
} from "../schemas/seniority-level-schema"
import type { SeniorityLevel } from "../types/seniority-level"

type SeniorityLevelRow = {
  id: string
  code: string
  label: string
  rank: number
  active: boolean
  created_at: string
  updated_at: string
}

function mapSeniorityLevel(row: SeniorityLevelRow): SeniorityLevel {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    rank: row.rank,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createSeniorityLevelRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAllByCompany(companyId: string) {
      // Safe read boundary (migration 0101): active-only by default, membership
      // gated. No direct protected SELECT on seniority_levels.
      const { data, error } = await supabase.rpc(
        "get_tenant_seniority_levels_v1",
        { p_company_id: companyId }
      )

      if (error) {
        return { data: null, error }
      }

      return {
        data: ((data as SeniorityLevelRow[] | null) ?? []).map(
          mapSeniorityLevel
        ),
        error: null,
      }
    },

    async create(
      companyId: string,
      input: CreateSeniorityLevelInput,
      submissionId: string
    ) {
      // Trusted mutation boundary (migration 0100). The idempotency key is derived
      // server-side from the stable per-submission id via the shared intentKey
      // helper; the submission id is a selector only, never authority.
      return supabase.rpc("create_tenant_seniority_level_v1", {
        p_company_id: companyId,
        p_code: input.code,
        p_label: input.label,
        p_rank: input.rank,
        p_idempotency_key: intentKey(
          "seniority-level:create",
          companyId,
          submissionId
        ),
      })
    },

    async update(
      companyId: string,
      seniorityLevelId: string,
      input: UpdateSeniorityLevelInput
    ) {
      // Trusted mutation boundary (migration 0100). Only code/label/rank are
      // forwarded; `active` and `company_id` are never sent — archive is the
      // dedicated boundary.
      return supabase.rpc("update_tenant_seniority_level_v1", {
        p_company_id: companyId,
        p_seniority_level_id: seniorityLevelId,
        p_code: input.code,
        p_label: input.label,
        p_rank: input.rank,
      })
    },

    async archive(companyId: string, seniorityLevelId: string) {
      // Trusted mutation boundary (migration 0100): soft archive, idempotent.
      return supabase.rpc("archive_tenant_seniority_level_v1", {
        p_company_id: companyId,
        p_seniority_level_id: seniorityLevelId,
      })
    },
  }
}
