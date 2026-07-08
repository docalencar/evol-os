export type EmployeeStatus = "active" | "inactive" | "on_leave"

export type Employee = {
  id: string
  companyId: string
  fullName: string
  email: string | null
  phone: string | null
  birthDate: string | null
  hireDate: string | null
  status: EmployeeStatus
  departmentId: string | null
  roleId: string | null
  managerId: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}