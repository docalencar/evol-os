import type { DashboardCompetencyIntelligence } from "@/features/dashboard-read/types/dashboard-competency-development"

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

  competencyDevelopment: DashboardCompetencyIntelligence

  planDistribution: DevelopmentPlanDistribution
  
  monthlyEvolution: DevelopmentMonthlyEvolution
}
