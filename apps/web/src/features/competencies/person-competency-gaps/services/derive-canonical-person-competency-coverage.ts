import type {
  CanonicalPersonCompetencyCoverage,
  CanonicalPersonCompetencyGap,
  PersonCompetencyAssignmentState,
  PersonCompetencyExpectationRow,
} from "../types/person-competency-gap"

const ASSIGNMENT_STATES = new Set<PersonCompetencyAssignmentState>([
  "no_position",
  "missing_profile",
  "stale_assignment",
  "active_assignment_with_no_expectations",
  "active_assignment_with_expectations",
])

const SENTINEL_STATES = new Set<PersonCompetencyAssignmentState>([
  "no_position",
  "missing_profile",
  "stale_assignment",
  "active_assignment_with_no_expectations",
])

const EXPECTATION_FACT_KEYS = [
  "competency_id",
  "competency_name",
  "expected_level",
  "weight",
  "required",
  "competency_type",
  "expectation_notes",
  "expectation_source",
  "inherited",
  "employee_competency_id",
  "current_level",
  "evidence_source",
  "validated_at",
] as const

export class InvalidPersonCompetencyExpectationRowsError extends Error {
  constructor(reason: string) {
    super(`INVALID_PERSON_COMPETENCY_EXPECTATION_ROWS: ${reason}`)
    this.name = "InvalidPersonCompetencyExpectationRowsError"
  }
}

function fail(reason: string): never {
  throw new InvalidPersonCompetencyExpectationRowsError(reason)
}

function parseAssignmentState(value: string): PersonCompetencyAssignmentState {
  if (!ASSIGNMENT_STATES.has(value as PersonCompetencyAssignmentState)) {
    fail(`unknown assignment_state '${value}'`)
  }

  return value as PersonCompetencyAssignmentState
}

function requireLevel(value: number | null, field: string): number {
  if (!Number.isInteger(value) || value === null || value < 1 || value > 5) {
    fail(`${field} must be an integer from 1 to 5`)
  }

  return value
}

function requireFact<T>(value: T | null, field: string): T {
  if (value === null) {
    fail(`${field} is required for active expectations`)
  }

  return value
}

function assertSameEnvelope(
  first: PersonCompetencyExpectationRow,
  row: PersonCompetencyExpectationRow
): void {
  const sameEnvelope =
    row.person_id === first.person_id &&
    row.position_id === first.position_id &&
    row.position_seniority_profile_id ===
      first.position_seniority_profile_id &&
    row.seniority_level_id === first.seniority_level_id

  if (!sameEnvelope) {
    fail("rows contain incompatible person assignment identifiers")
  }
}

function assertSentinel(row: PersonCompetencyExpectationRow): void {
  const populatedFact = EXPECTATION_FACT_KEYS.find((key) => row[key] !== null)

  if (populatedFact) {
    fail(`sentinel row contains competency fact '${populatedFact}'`)
  }
}

function assertAssignmentEnvelope(
  state: PersonCompetencyAssignmentState,
  row: PersonCompetencyExpectationRow
): void {
  if (state === "no_position") {
    if (
      row.position_id !== null ||
      row.position_seniority_profile_id !== null ||
      row.seniority_level_id !== null
    ) {
      fail("no_position must not contain position or profile identifiers")
    }
    return
  }

  if (state === "missing_profile") {
    if (
      row.position_id === null ||
      row.position_seniority_profile_id !== null ||
      row.seniority_level_id !== null
    ) {
      fail("missing_profile requires only a position identifier")
    }
    return
  }

  if (row.position_id === null || row.position_seniority_profile_id === null) {
    fail(`${state} requires position and profile identifiers`)
  }
}

function mapCompetency(
  row: PersonCompetencyExpectationRow
): CanonicalPersonCompetencyGap {
  const competencyId = requireFact(row.competency_id, "competency_id")
  const competencyName = requireFact(row.competency_name, "competency_name")
  const expectedLevel = requireLevel(row.expected_level, "expected_level")
  const weight = requireFact(row.weight, "weight")
  const required = requireFact(row.required, "required")
  const competencyType = requireFact(row.competency_type, "competency_type")
  const expectationSource = requireFact(
    row.expectation_source,
    "expectation_source"
  )
  const inherited = requireFact(row.inherited, "inherited")
  const currentLevel =
    row.current_level === null
      ? null
      : requireLevel(row.current_level, "current_level")

  return Object.freeze({
    competencyId,
    competencyName,
    expectedLevel,
    currentLevel,
    gap: currentLevel === null ? null : expectedLevel - currentLevel,
    evidenceState: currentLevel === null ? "unassessed" : "assessed",
    weight,
    required,
    competencyType,
    inherited,
    expectationSource,
    expectationNotes: row.expectation_notes,
    employeeCompetencyId: row.employee_competency_id,
    evidenceSource: row.evidence_source,
    validatedAt: row.validated_at,
  })
}

export function deriveCanonicalPersonCompetencyCoverage(
  rows: readonly PersonCompetencyExpectationRow[]
): CanonicalPersonCompetencyCoverage {
  const first = rows[0]

  if (!first) {
    fail("the trusted boundary returned no rows")
  }

  const assignmentState = parseAssignmentState(first.assignment_state)
  assertAssignmentEnvelope(assignmentState, first)

  for (const row of rows) {
    if (parseAssignmentState(row.assignment_state) !== assignmentState) {
      fail("rows contain multiple assignment states")
    }
    assertSameEnvelope(first, row)
  }

  if (SENTINEL_STATES.has(assignmentState)) {
    if (rows.length !== 1) {
      fail("sentinel assignment states must contain exactly one row")
    }
    assertSentinel(first)

    return Object.freeze({
      assignmentState,
      personId: first.person_id,
      positionId: first.position_id,
      positionSeniorityProfileId: first.position_seniority_profile_id,
      seniorityLevelId: first.seniority_level_id,
      competencies: Object.freeze([]),
    })
  }

  return Object.freeze({
    assignmentState,
    personId: first.person_id,
    positionId: first.position_id,
    positionSeniorityProfileId: first.position_seniority_profile_id,
    seniorityLevelId: first.seniority_level_id,
    competencies: Object.freeze(rows.map(mapCompetency)),
  })
}
