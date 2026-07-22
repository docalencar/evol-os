import type {
  EmployeeStatus,
} from "../../../people/types/employee"

import {
  isDateInPeriod,
  type MonthPeriod,
} from "./create-month-periods"

const VALID_EMPLOYEE_STATUSES: readonly EmployeeStatus[] = [
  "active",
  "inactive",
  "on_leave",
  "terminated",
]

type EmployeeHireInput = {
  hireDate: string
  status: EmployeeStatus
}

export function calculateHires(
  employees: readonly EmployeeHireInput[],
  period: MonthPeriod
) {
  return employees.filter((employee) => {
    if (!VALID_EMPLOYEE_STATUSES.includes(employee.status)) {
      return false
    }

    const hireDate = new Date(
      `${employee.hireDate}T00:00:00.000Z`
    )

    return isDateInPeriod(hireDate, period)
  }).length
}
