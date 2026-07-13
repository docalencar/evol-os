import type {
  PositionEmploymentType,
  PositionHierarchicalLevel,
  PositionStatus,
  PositionTravelRequirement,
  PositionWorkModel,
} from "../../types/position"

export type DepartmentOption = {
  id: string
  name: string
}

export type PositionFormPosition = {
  id: string
  name: string
  description: string | null

  department_id: string | null
  hierarchical_level: PositionHierarchicalLevel
  status: PositionStatus

  weekly_workload_hours: number
  work_model: PositionWorkModel
  employment_type: PositionEmploymentType
  travel_requirement: PositionTravelRequirement
}