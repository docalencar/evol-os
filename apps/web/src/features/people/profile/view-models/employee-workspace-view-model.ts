import type {
  EmployeeStatus,
} from "../../types/employee"

export type EmployeeWorkspaceMetricViewModel = {
  id:
    | "company-tenure"
    | "position"
    | "team"
    | "hire-date"
  label: string
  value: string
  description: string
}

export type EmployeeWorkspaceOrganizationViewModel = {
  positionId: string | null
  positionLabel: string

  teamId: string | null
  teamLabel: string

  managerId: string | null
  managerLabel: string

  status: EmployeeStatus
  statusLabel: string

  hireDateLabel: string
}

export type EmployeeWorkspaceContactViewModel = {
  emailLabel: string
  phoneLabel: string
  discProfileLabel: string
}

export type EmployeeWorkspaceHeaderViewModel = {
  name: string
  initials: string
  subtitle: string
  statusLabel: string
  avatarUrl: string | null
}

export type EmployeeWorkspaceOptionsViewModel = {
  teams: {
    id: string
    name: string
  }[]

  positions: {
    id: string
    name: string
  }[]

  managers: {
    id: string
    name: string
  }[]
}

export type EmployeeWorkspaceViewModel = {
  id: string
  companyId: string

  employeeName: string
  status: EmployeeStatus

  header: EmployeeWorkspaceHeaderViewModel
  organization: EmployeeWorkspaceOrganizationViewModel
  contact: EmployeeWorkspaceContactViewModel
  metrics: EmployeeWorkspaceMetricViewModel[]
  options: EmployeeWorkspaceOptionsViewModel

  hasPosition: boolean
  hasTeam: boolean
  hasManager: boolean
  hasHireDate: boolean
  hasEmail: boolean
  hasPhone: boolean
  hasDiscProfile: boolean
}
