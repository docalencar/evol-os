import {
  getManagementDepartments,
  getManagementPeople,
  getManagementPositions,
} from "@/features/dashboard-read"
import {
  type Position,
} from "@/features/organization/positions"

import type {
  EmployeeStatus,
} from "@/features/people"

export type JobOpeningDepartmentOption = {
  id: string
  name: string
}

export type JobOpeningPositionOption = {
  id: string
  name: string
  departmentId: string | null
  status: Position["status"]
}

export type JobOpeningEmployeeOption = {
  id: string
  fullName: string
  status: EmployeeStatus
}

export type JobOpeningFormOptions = {
  departments: JobOpeningDepartmentOption[]
  positions: JobOpeningPositionOption[]
  employees: JobOpeningEmployeeOption[]
}

export async function getJobOpeningFormOptions(
  companyId: string
): Promise<JobOpeningFormOptions> {
  // Wizard options load through the approved tenant read boundaries
  // (0083/0085 management projections) — no direct protected-table SELECT.
  const [departments, positions, employees] =
    await Promise.all([
      getManagementDepartments(companyId),
      getManagementPositions(companyId),
      getManagementPeople(companyId),
    ])

  return {
    departments: (departments ?? []).map(
      (department) => ({
        id: department.id,
        name: department.name,
      })
    ),
    positions: positions.map(
      (position) => ({
        id: position.id,
        name: position.name,
        departmentId:
          position.department_id,
        status: position.status,
      })
    ),
    employees: (employees ?? []).map(
      (employee) => ({
        id: employee.id,
        fullName: employee.full_name,
        status: employee.status,
      })
    ),
  }
}
