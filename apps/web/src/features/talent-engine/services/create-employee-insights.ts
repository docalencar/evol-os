import {
  calculateTalentCard,
  type CompetencyGap,
} from "@/features/talent"

import type { EmployeeInsights } from "../types/employee-insights"
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
