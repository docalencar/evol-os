import { createServerDatabase } from "@/lib/database/server-database"

import type { PositionSeniorityProfile } from "../types/position-seniority-profile"

type ProfileRow = {
  id: string
  position_id: string
  seniority_level_id: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type SeniorityCatalogEntry = {
  id: string
  code: string
  label: string
  rank: number
  active: boolean
}

type CatalogRow = {
  id: string
  code: string
  label: string
  rank: number
  active: boolean
}

function mapProfile(row: ProfileRow): PositionSeniorityProfile {
  return {
    id: row.id,
    positionId: row.position_id,
    seniorityLevelId: row.seniority_level_id,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createPositionSeniorityProfileRepository() {
  const supabase = await createServerDatabase()

  return {
    async findByPosition(companyId: string, positionId: string) {
      // Safe read boundary (0102): membership-gated, active-only. No direct SELECT.
      const { data, error } = await supabase.rpc(
        "get_tenant_position_seniority_profiles_v1",
        { p_company_id: companyId, p_position_id: positionId }
      )
      if (error) {
        return { data: null, error }
      }
      return {
        data: ((data as ProfileRow[] | null) ?? []).map(mapProfile),
        error: null,
      }
    },

    async findSeniorityCatalog(companyId: string) {
      // Read the full catalog (including inactive) via the 0101 boundary so that
      // a profile referencing a now-archived seniority can still resolve its
      // label. The `active` flag distinguishes the levels the add selector offers.
      const { data, error } = await supabase.rpc(
        "get_tenant_seniority_levels_v1",
        { p_company_id: companyId, p_include_inactive: true }
      )
      if (error) {
        return { data: null, error }
      }
      return {
        data: ((data as CatalogRow[] | null) ?? []).map((row) => ({
          id: row.id,
          code: row.code,
          label: row.label,
          rank: row.rank,
          active: row.active,
        })),
        error: null,
      }
    },

    async add(
      companyId: string,
      positionId: string,
      seniorityLevelId: string
    ) {
      // Trusted mutation boundary (0102): idempotent on the natural key
      // (position, seniority) — re-adding returns already_applicable.
      return supabase.rpc("add_tenant_position_seniority_profile_v1", {
        p_company_id: companyId,
        p_position_id: positionId,
        p_seniority_level_id: seniorityLevelId,
      })
    },

    async archive(companyId: string, positionSeniorityProfileId: string) {
      // Trusted mutation boundary (0102): soft archive; the base profile is
      // rejected (BASE_PROFILE_NOT_ARCHIVABLE); the global catalog is untouched.
      return supabase.rpc("archive_tenant_position_seniority_profile_v1", {
        p_company_id: companyId,
        p_position_seniority_profile_id: positionSeniorityProfileId,
      })
    },
  }
}
