export type PersonCompetencyAssignmentState =
  | "no_position"
  | "missing_profile"
  | "stale_assignment"
  | "active_assignment_with_no_expectations"
  | "active_assignment_with_expectations"

export type PersonCompetencyEvidenceState = "assessed" | "unassessed"

// Raw factual row returned by
// get_tenant_person_competency_expectations_v1 (migration 0123).
export type PersonCompetencyExpectationRow = Readonly<{
  assignment_state: string
  person_id: string
  position_id: string | null
  position_seniority_profile_id: string | null
  seniority_level_id: string | null
  competency_id: string | null
  competency_name: string | null
  expected_level: number | null
  weight: number | null
  required: boolean | null
  competency_type: string | null
  expectation_notes: string | null
  expectation_source: string | null
  inherited: boolean | null
  employee_competency_id: string | null
  current_level: number | null
  evidence_source: string | null
  validated_at: string | null
}>

export type CanonicalPersonCompetencyGap = Readonly<{
  competencyId: string
  competencyName: string
  expectedLevel: number
  currentLevel: number | null
  gap: number | null
  evidenceState: PersonCompetencyEvidenceState
  weight: number
  required: boolean
  competencyType: string
  inherited: boolean
  expectationSource: string
  expectationNotes: string | null
  employeeCompetencyId: string | null
  evidenceSource: string | null
  validatedAt: string | null
}>

export type CanonicalPersonCompetencyCoverage = Readonly<{
  assignmentState: PersonCompetencyAssignmentState
  personId: string
  positionId: string | null
  positionSeniorityProfileId: string | null
  seniorityLevelId: string | null
  competencies: readonly CanonicalPersonCompetencyGap[]
}>
