import {
  getEmployeeIntelligenceList,
} from "@/features/people"

import type { TalentOverview } from "../types/talent-overview"

export async function getTalentOverview(
  companyId: string
): Promise<TalentOverview> {
  const employees =
    await getEmployeeIntelligenceList(companyId)

  let promotionReady = 0
  let developing = 0
  let attention = 0

  for (const employee of employees) {
    const hasCompletedAssessment =
      employee.assessments.completedAssessments > 0

    const hasActiveDevelopmentPlan =
      employee.development.activePlans > 0

    const hasCompletedDevelopmentPlan =
      employee.development.completedPlans > 0

    if (
      hasCompletedAssessment &&
      hasCompletedDevelopmentPlan &&
      !hasActiveDevelopmentPlan
    ) {
      promotionReady++
      continue
    }

    if (hasActiveDevelopmentPlan) {
      developing++
      continue
    }

    attention++
  }

  return {
    promotionReady,
    developing,
    attention,
  }
}
