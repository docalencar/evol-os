export const POSITION_HIERARCHICAL_LEVELS = [
  "intern",
  "assistant",
  "analyst",
  "specialist",
  "coordinator",
  "supervisor",
  "manager",
  "director",
  "executive",
] as const

export type PositionHierarchicalLevel =
  (typeof POSITION_HIERARCHICAL_LEVELS)[number]

export const POSITION_STATUSES = [
  "draft",
  "active",
  "inactive",
  "obsolete",
] as const

export type PositionStatus = (typeof POSITION_STATUSES)[number]

export const POSITION_WORK_MODELS = [
  "on_site",
  "hybrid",
  "remote",
] as const

export type PositionWorkModel = (typeof POSITION_WORK_MODELS)[number]

export const POSITION_EMPLOYMENT_TYPES = [
  "clt",
  "pj",
  "intern",
  "apprentice",
  "temporary",
  "outsourced",
  "contractor",
  "other",
] as const

export type PositionEmploymentType =
  (typeof POSITION_EMPLOYMENT_TYPES)[number]

export const POSITION_TRAVEL_REQUIREMENTS = [
  "none",
  "occasional",
  "frequent",
] as const

export type PositionTravelRequirement =
  (typeof POSITION_TRAVEL_REQUIREMENTS)[number]

export type Position = {
  id: string
  company_id: string

  name: string
  description: string | null

  department_id: string | null
  hierarchical_level: PositionHierarchicalLevel
  status: PositionStatus

  weekly_workload_hours: number
  work_model: PositionWorkModel
  employment_type: PositionEmploymentType
  travel_requirement: PositionTravelRequirement

  deleted_at: string | null
  created_at: string
  updated_at: string
}