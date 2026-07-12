import {
  DEVELOPMENT_PLAN_STATUS_LABELS,
} from "../constants/development-plan"

import type {
  DevelopmentPlanDistribution,
} from "../types/development-plan-distribution"

import type {
  DevelopmentPlanListItem,
} from "../types/development-plan-list-item"

export function calculateDevelopmentPlanDistribution(
  plans: DevelopmentPlanListItem[]
): DevelopmentPlanDistribution {
  const total = plans.length

  return Object.entries(
    DEVELOPMENT_PLAN_STATUS_LABELS
  ).map(([status, label]) => {
    const count = plans.filter(
      (item) => item.plan.status === status
    ).length

    return {
      status: status as keyof typeof DEVELOPMENT_PLAN_STATUS_LABELS,
      label,
      count,
      percentage:
        total === 0
          ? 0
          : Math.round((count / total) * 100),
    }
  })
}
