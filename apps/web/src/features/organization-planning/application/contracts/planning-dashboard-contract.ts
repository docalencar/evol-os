import type { ScenarioDTO } from "../dto"
import type {
  PlanningComparisonViewModel,
  PlanningInsightsViewModel,
} from "../../presentation"

export type PlanningDashboardViewModel = Readonly<{
  scenario: ScenarioDTO
  comparison: PlanningComparisonViewModel
  insights: PlanningInsightsViewModel
  generatedAt: string
  version: number
}>
