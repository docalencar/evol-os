export type {
  CompetencyGap,
  CompetencyGapInput,
  CompetencyGapStatus,
} from "./types/competency-gap"

export type { TalentCard } from "./types/talent-card"

export { calculateCompetencyGap } from "./services/calculate-competency-gap"
export { calculateTalentCard } from "./services/calculate-talent-card"

export { getEmployeeCompetencyGaps } from "./queries/get-employee-competency-gaps"

export { CompetencyGapCard } from "./components/competency-gap-card"
export { TalentSummaryCard } from "./components/talent-summary-card"