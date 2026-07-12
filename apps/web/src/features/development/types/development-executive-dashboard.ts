import type {
  CompanyCompetencyGap,
  DevelopmentPriority,
} from "@/features/talent"

import type {
  DevelopmentDashboardKpis,
} from "../services/get-development-dashboard-kpis"

import type {
  DevelopmentPlanDistribution,
} from "./development-plan-distribution"

import type {
  DevelopmentPlanListData,
} from "./development-plan-list-item"
import type {
  DevelopmentMonthlyEvolution,
} from "./development-monthly-evolution"

export type DevelopmentExecutiveDashboard = {
  planList: DevelopmentPlanListData

  kpis: DevelopmentDashboardKpis

  competencyGaps: CompanyCompetencyGap[]

  developmentPriorities: DevelopmentPriority[]

  planDistribution: DevelopmentPlanDistribution
  
  monthlyEvolution: DevelopmentMonthlyEvolution
}