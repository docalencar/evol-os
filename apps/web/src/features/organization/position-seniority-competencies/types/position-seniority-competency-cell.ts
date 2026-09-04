// Serializable transport type for one effective cell of the Position × Seniority
// competency matrix, as resolved by the trusted RPC
// get_tenant_position_seniority_competency_matrix_v1 (migration 0122).
//
// The DATABASE owns effective-inheritance resolution. This type is a faithful
// camelCase transport of the RPC's already-resolved rows — the application must
// NOT recompute `override ?? base` here.

// Canonical RPC `source` domain. `none` == NOT DEFINED (no active Base or override).
export type CompetencyCellSource = "base" | "override" | "none"

export type PositionSeniorityCompetencyCell = {
  positionSeniorityProfileId: string
  seniorityLevelId: string | null // NULL for the Base profile
  isBaseProfile: boolean
  profileActive: boolean
  competencyId: string
  // Effective expectation fields. All NULL when source === "none" (never fabricated).
  expectedLevel: number | null
  weight: number | null
  required: boolean | null
  type: string | null
  notes: string | null
  source: CompetencyCellSource
  inherited: boolean // true only when a specific profile falls back to Base
  baseRowId: string | null // active Base row for the competency, when it exists
  overrideRowId: string | null // active override row on a specific profile, when present
}
