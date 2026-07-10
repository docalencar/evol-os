export type {
  CompetencyGap,
  CompetencyGapInput,
  CompetencyGapStatus,
} from "./types/competency-gap"

export type { TalentCard } from "./types/talent-card"
export type { EmployeeInsights } from "./types/employee-insights"

export { calculateCompetencyGap } from "./services/calculate-competency-gap"
export { calculateTalentCard } from "./services/calculate-talent-card"
export { calculateRisk } from "./services/calculate-risk"
export { getBiggestGap } from "./services/get-biggest-gap"
export { createEmployeeInsights } from "./services/create-employee-insights"

export { getEmployeeCompetencyGaps } from "./queries/get-employee-competency-gaps"

export { CompetencyGapCard } from "./components/competency-gap-card"
export { TalentSummaryCard } from "./components/talent-summary-card"