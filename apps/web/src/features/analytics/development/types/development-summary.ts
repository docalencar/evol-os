import type {
  DevelopmentDashboardKpis,
} from "@/features/development"

import type {
  DevelopmentMonthlyEvolution,
} from "@/features/development"

import type {
  DevelopmentPlanDistribution,
} from "@/features/development"

export type DevelopmentSummary = {
  overview: {
    totalPlans: number
  }

  kpis: DevelopmentDashboardKpis

  distribution: DevelopmentPlanDistribution

  monthlyEvolution: DevelopmentMonthlyEvolution
}
