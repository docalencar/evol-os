export type EmployeeSnapshot = {
  evolId?: string
  employeeCode?: string
  cpf?: string
  fullName: string
  email?: string
  department?: string
  team?: string
  position?: string
  manager?: string
}

export type DepartmentSnapshot = {
  name: string
}

export type TeamSnapshot = {
  name: string
  department?: string
}

export type PositionSnapshot = {
  name: string
  department?: string
}

export type OrganizationSnapshot = {
  departments: DepartmentSnapshot[]
  teams: TeamSnapshot[]
  positions: PositionSnapshot[]
  employees: EmployeeSnapshot[]
}
