import type { ExecutiveDashboardSummary } from "../types/executive-dashboard-summary"

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
  ] = await Promise.all([
    getPeopleSummary(input.companyId),
    getOrganizationSummary(input.companyId),
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
      total: 0,
      active: 0,
      completed: 0,
    },

    assessments: {
      responses: 0,
      averageScore: null,
    },
  })
}
