import {
  getDepartments,
} from "@/features/organization/departments"
import {
  getPositions,
  type Position,
} from "@/features/organization/positions"
import {
  getEmployees,
} from "@/features/people"

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
  const [departments, positions, employees] =
    await Promise.all([
      getDepartments(companyId),
      getPositions(companyId),
      getEmployees(companyId),
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
