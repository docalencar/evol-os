export const DEPARTMENT_CHANGE_TYPES = [
  "department.create",
  "department.update",
  "department.archive",
] as const

export const TEAM_CHANGE_TYPES = [
  "team.create",
  "team.update",
  "team.archive",
] as const

export const POSITION_CHANGE_TYPES = [
  "position.create",
  "position.update",
  "position.move",
  "position.archive",
] as const

export const EMPLOYEE_CHANGE_TYPES = [
  "employee.create",
  "employee.update",
  "employee.move",
  "employee.terminate",
  "employee.archive",
] as const

export const PLANNING_CHANGE_TYPES = [
  ...DEPARTMENT_CHANGE_TYPES,
  ...TEAM_CHANGE_TYPES,
  ...POSITION_CHANGE_TYPES,
  ...EMPLOYEE_CHANGE_TYPES,
] as const

export type DepartmentChangeType =
  (typeof DEPARTMENT_CHANGE_TYPES)[number]

export type TeamChangeType =
  (typeof TEAM_CHANGE_TYPES)[number]

export type PositionChangeType =
  (typeof POSITION_CHANGE_TYPES)[number]

export type EmployeeChangeType =
  (typeof EMPLOYEE_CHANGE_TYPES)[number]

export type PlanningChangeType =
  (typeof PLANNING_CHANGE_TYPES)[number]

export function isDepartmentChangeType(
  value: string
): value is DepartmentChangeType {
  return DEPARTMENT_CHANGE_TYPES.includes(
    value as DepartmentChangeType
  )
}

export function isTeamChangeType(
  value: string
): value is TeamChangeType {
  return TEAM_CHANGE_TYPES.includes(
    value as TeamChangeType
  )
}

export function isPositionChangeType(
  value: string
): value is PositionChangeType {
  return POSITION_CHANGE_TYPES.includes(
    value as PositionChangeType
  )
}

export function isEmployeeChangeType(
  value: string
): value is EmployeeChangeType {
  return EMPLOYEE_CHANGE_TYPES.includes(
    value as EmployeeChangeType
  )
}

export function isPlanningChangeType(
  value: string
): value is PlanningChangeType {
  return PLANNING_CHANGE_TYPES.includes(
    value as PlanningChangeType
  )
}
