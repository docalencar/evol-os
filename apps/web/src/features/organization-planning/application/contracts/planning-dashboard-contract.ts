import type { ScenarioDTO } from "../dto"
import type {
  PlanningComparisonViewModel,
  PlanningInsightsViewModel,
} from "../../presentation"

export type PlanningDashboardViewModel = Readonly<{
  scenario: ScenarioDTO
  content: PlanningContentEditorViewModel
  comparison: PlanningComparisonViewModel
  insights: PlanningInsightsViewModel
  generatedAt: string
  version: number
}>

export type PlanningContentEditorItem = Readonly<{
  id: string
  version: number
  departmentId: string
  name: string
  code: string | null
  description: string | null
  parentDepartmentId: string | null
}>

export type PlanningContentEditorViewModel = Readonly<{
  changeSets: readonly PlanningContentEditorItem[]
  projectedDepartments: readonly Readonly<{
    id: string
    name: string
    code: string | null
  }>[]
}>
