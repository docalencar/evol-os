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

export type Position = {
  id: string
  company_id: string

  name: string
  description: string | null

  department_id: string | null

  hierarchical_level: PositionHierarchicalLevel

  status: PositionStatus

  deleted_at: string | null

  created_at: string
  updated_at: string
}