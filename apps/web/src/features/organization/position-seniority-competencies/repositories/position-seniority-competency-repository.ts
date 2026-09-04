import { createServerDatabase } from "@/lib/database/server-database"

import type {
  CompetencyCellSource,
  PositionSeniorityCompetencyCell,
} from "../types/position-seniority-competency-cell"

// Row shape returned by get_tenant_position_seniority_competency_matrix_v1 (0122).
// Kept in snake_case to mirror the RETURNS TABLE contract exactly before mapping.
type MatrixRow = {
  position_seniority_profile_id: string
  seniority_level_id: string | null
  is_base_profile: boolean
  profile_active: boolean
  competency_id: string
  expected_level: number | null
  weight: number | null
  required: boolean | null
  type: string | null
  notes: string | null
  source: string
  inherited: boolean
  base_row_id: string | null
  override_row_id: string | null
}

function normalizeSource(source: string): CompetencyCellSource {
  // Defensive narrowing of the RPC's text `source` to the canonical union; any
  // unexpected value is treated as NOT DEFINED rather than trusted blindly.
  return source === "base" || source === "override" ? source : "none"
}

function mapCell(row: MatrixRow): PositionSeniorityCompetencyCell {
  return {
    positionSeniorityProfileId: row.position_seniority_profile_id,
    seniorityLevelId: row.seniority_level_id,
    isBaseProfile: row.is_base_profile,
    profileActive: row.profile_active,
    competencyId: row.competency_id,
    expectedLevel: row.expected_level,
    weight: row.weight,
    required: row.required,
    type: row.type,
    notes: row.notes,
    source: normalizeSource(row.source),
    inherited: row.inherited,
    baseRowId: row.base_row_id,
    overrideRowId: row.override_row_id,
  }
}

export async function createPositionSeniorityCompetencyRepository() {
  const supabase = await createServerDatabase()

  return {
    // Trusted effective-matrix read boundary (0122): membership-gated, closed
    // table (no direct SELECT). The RPC resolves override ?? Base; we only map.
    async findMatrixByPosition(
      companyId: string,
      positionId: string,
      includeArchivedProfiles = false
    ) {
      const { data, error } = await supabase.rpc(
        "get_tenant_position_seniority_competency_matrix_v1",
        {
          p_company_id: companyId,
          p_position_id: positionId,
          p_include_archived_profiles: includeArchivedProfiles,
        }
      )
      if (error) {
        return { data: null, error }
      }
      return {
        data: ((data as MatrixRow[] | null) ?? []).map(mapCell),
        error: null,
      }
    },
  }
}
