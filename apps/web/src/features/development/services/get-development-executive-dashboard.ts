import {
  getCompanyCompetencyGaps,
  getDevelopmentPriorities,
} from "@/features/talent"

import {
  calculateDevelopmentDashboardKpis,
} from "./get-development-dashboard-kpis"

import {
  calculateDevelopmentMonthlyEvolution,
} from "./calculate-development-monthly-evolution"

import {
  calculateDevelopmentPlanDistribution,
} from "./calculate-development-plan-distribution"

import {
  getDevelopmentPlanListItems,
} from "./get-development-plan-list-items"

import type {
  DevelopmentExecutiveDashboard,
} from "../types/development-executive-dashboard"

export async function getDevelopmentExecutiveDashboard(
  companyId: string
): Promise<DevelopmentExecutiveDashboard> {
  const [
    planList,
    competencyGaps,
    developmentPriorities,
  ] = await Promise.all([
    getDevelopmentPlanListItems(
      companyId
    ),

    getCompanyCompetencyGaps(
      companyId
    ),

    getDevelopmentPriorities(
      companyId
    ),
  ])

  return {
    planList,

    kpis:
      calculateDevelopmentDashboardKpis(
        planList.plans
      ),

    competencyGaps,

    developmentPriorities,

    planDistribution:
      calculateDevelopmentPlanDistribution(
        planList.plans
      ),

    monthlyEvolution:
      calculateDevelopmentMonthlyEvolution(
        planList.plans
      ),
  }
}