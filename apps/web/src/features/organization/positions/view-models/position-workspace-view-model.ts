export type PositionWorkspaceMetricViewModel = {
  id:
    | "employees"
    | "active-employees"
    | "on-leave-employees"
    | "competencies"
    | "requirements"
  label: string
  value: string
  description: string
}

export type PositionWorkspaceContextViewModel = {
  departmentId: string | null
  departmentLabel: string
  hierarchicalLevelLabel: string
  statusLabel: string
}

export type PositionWorkspaceArrangementViewModel = {
  weeklyWorkloadLabel: string
  workModelLabel: string
  employmentTypeLabel: string
  travelRequirementLabel: string
}

export type PositionWorkspaceEmployeeViewModel = {
  id: string
  name: string
  email: string
  statusLabel: string
  profileHref: string
}

export type PositionWorkspaceViewModel = {
  id: string
  companyId: string
  name: string
  description: string

  context: PositionWorkspaceContextViewModel
  arrangement: PositionWorkspaceArrangementViewModel
  metrics: PositionWorkspaceMetricViewModel[]

  employees: PositionWorkspaceEmployeeViewModel[]
  visibleEmployees: PositionWorkspaceEmployeeViewModel[]
  remainingEmployees: number
  hasEmployees: boolean
}
