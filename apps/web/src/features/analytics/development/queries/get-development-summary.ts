import {
  calculateDevelopmentDashboardKpis,
  calculateDevelopmentMonthlyEvolution,
  calculateDevelopmentPlanDistribution,
  getDevelopmentPlanListItems,
} from "@/features/development"

import {
  createDevelopmentSummary,
} from "../services/create-development-summary"

import type {
  DevelopmentSummary,
} from "../types/development-summary"

export async function getDevelopmentSummary(
  companyId: string
): Promise<DevelopmentSummary> {
  const developmentPlanListData =
    await getDevelopmentPlanListItems(companyId)

  const plans = developmentPlanListData.plans

  return createDevelopmentSummary({
    totalPlans: plans.length,
    kpis: calculateDevelopmentDashboardKpis(plans),
    distribution:
      calculateDevelopmentPlanDistribution(plans),
    monthlyEvolution:
      calculateDevelopmentMonthlyEvolution(plans),
  })
}
