import type { ExecutiveDashboardSummary } from "../types/executive-dashboard-summary"

import {
  getAssessmentSummary,
  getDevelopmentSummary,
} from "@/features/analytics"

import { getOrganizationSummary } from "@/features/organization"

import { getPeopleSummary } from "@/features/people/dashboard/queries/get-people-summary"

import { presentExecutiveDashboardSummary } from "../presenters/present-executive-dashboard-summary"

type Input = {
  companyId: string
}

export async function getExecutiveDashboardSummary(
  input: Input,
): Promise<ExecutiveDashboardSummary> {
  const [
    people,
    organization,
    assessments,
    development,
  ] = await Promise.all([
    getPeopleSummary(input.companyId),
    getOrganizationSummary(input.companyId),
    getAssessmentSummary(input.companyId),
    getDevelopmentSummary(input.companyId),
  ])

  return presentExecutiveDashboardSummary({
    employees: {
      total: people.total,
      active: people.active,
      inactive: people.inactive,
    },

    departments: {
      total: organization.departments,
    },

    positions: {
      total: organization.positions,
    },

    assessmentCycles: {
      total: assessments.cycles.total,
      active: assessments.cycles.active,
      completed: assessments.cycles.completed,
    },

    assessments: {
      responses: assessments.responses.completed,
      averageScore: assessments.averageScore,
    },

    development: {
      totalPlans: development.overview.totalPlans,
      kpis: development.kpis,
      distribution: development.distribution,
      monthlyEvolution: development.monthlyEvolution,
    },
  })
}
