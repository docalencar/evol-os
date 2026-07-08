import type { EmployeeStatus } from "../types/employee"

export const EMPLOYEE_STATUSES: EmployeeStatus[] = [
  "active",
  "inactive",
  "on_leave",
]

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  on_leave: "Afastado",
}
  