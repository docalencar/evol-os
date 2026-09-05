export {
  deriveCanonicalPersonCompetencyCoverage,
  InvalidPersonCompetencyExpectationRowsError,
} from "./services/derive-canonical-person-competency-coverage"

export { getCanonicalPersonCompetencyCoverage } from "./queries/get-canonical-person-competency-coverage"

export type {
  CanonicalPersonCompetencyCoverage,
  CanonicalPersonCompetencyGap,
  PersonCompetencyAssignmentState,
  PersonCompetencyEvidenceState,
  PersonCompetencyExpectationRow,
} from "./types/person-competency-gap"
