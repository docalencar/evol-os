import type { DevelopmentDashboardKpis } from "@/features/development"
import type { DevelopmentMonthlyEvolution } from "@/features/development"
import type { DevelopmentPlanDistribution } from "@/features/development"

import type {
  DevelopmentSummary,
} from "../types/development-summary"

type Input = {
  totalPlans: number

  kpis: DevelopmentDashboardKpis

  distribution: DevelopmentPlanDistribution

  monthlyEvolution: DevelopmentMonthlyEvolution
}

export function createDevelopmentSummary(
  input: Input
): DevelopmentSummary {
  return {
    overview: {
      totalPlans: input.totalPlans,
    },

    kpis: input.kpis,

    distribution: input.distribution,

    monthlyEvolution: input.monthlyEvolution,
  }
}
