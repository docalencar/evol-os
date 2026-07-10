import type { CompetencyGap } from "../types/competency-gap"
import type { EmployeeInsights } from "../types/employee-insights"
import { calculateTalentCard } from "./calculate-talent-card"
import { calculateRisk } from "./calculate-risk"
import { getBiggestGap } from "./get-biggest-gap"

export function createEmployeeInsights(
  gaps: CompetencyGap[]
): EmployeeInsights {
  const talentCard = calculateTalentCard(gaps)

  return {
    talentCard,
    biggestGap: getBiggestGap(gaps),
    risk: calculateRisk(gaps),
    promotionReady: talentCard.promotionReady,
  }
}
