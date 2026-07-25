import type {
  SnapshotEmployeeDiscProfile,
  SnapshotEmployeeStatus,
  SnapshotPositionEmploymentType,
  SnapshotPositionHierarchicalLevel,
  SnapshotPositionStatus,
  SnapshotPositionTravelRequirement,
  SnapshotPositionWorkModel,
} from "../types"

export type OrganizationDepartmentReadRow = {
  id: string
  name: string
  description: string | null
  manager_id: string | null
  deleted_at: string | null
}

export type OrganizationTeamReadRow = {
  id: string
  name: string
  description: string | null
  department_id: string | null
  parent_team_id: string | null
  manager_id: string | null
  deleted_at: string | null
}

export type OrganizationPositionReadRow = {
  id: string
  name: string
  description: string | null
  department_id: string | null
  hierarchical_level: SnapshotPositionHierarchicalLevel
  status: SnapshotPositionStatus
  weekly_workload_hours: number
  work_model: SnapshotPositionWorkModel
  employment_type: SnapshotPositionEmploymentType
  travel_requirement: SnapshotPositionTravelRequirement
  deleted_at: string | null
}

export type OrganizationEmployeeReadRow = {
  id: string
  user_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  birth_date: string | null
  hire_date: string | null
  status: SnapshotEmployeeStatus
  manager_id: string | null
  team_id: string | null
  position_id: string | null
  disc_profile: SnapshotEmployeeDiscProfile | null
  avatar_url: string | null
}

export type OrganizationReadModel = Readonly<{
  departments: readonly OrganizationDepartmentReadRow[]
  teams: readonly OrganizationTeamReadRow[]
  positions: readonly OrganizationPositionReadRow[]
  employees: readonly OrganizationEmployeeReadRow[]
}>
