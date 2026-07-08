import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/data-table"

import { EMPLOYEE_STATUS_LABELS } from "../constants/employee-status"
import type { EmployeeStatus } from "../types/employee"
import { ArchiveEmployeeButton } from "./archive-employee-button"
import { EmployeeEditDialog } from "./employee-edit-dialog"

type EmployeeTableItem = {
  id: string
  company_id: string
  full_name: string
  email: string | null
  phone: string | null
  hire_date: string | null
  status: EmployeeStatus
}

type EmployeeTableProps = {
  employees: EmployeeTableItem[]
}

export function EmployeeTable({ employees }: EmployeeTableProps) {
  return (
    <DataTable
      title="Colaboradores"
      data={employees}
      rowKey={(employee) => employee.id}
      emptyMessage="Nenhum colaborador cadastrado."
      columns={[
        {
          key: "full_name",
          header: "Nome",
          render: (employee) => (
            <span className="font-medium text-slate-900">
              {employee.full_name}
            </span>
          ),
        },
        {
          key: "email",
          header: "E-mail",
          render: (employee) => employee.email || "Sem e-mail",
        },
        {
          key: "phone",
          header: "Telefone",
          render: (employee) => employee.phone || "Sem telefone",
        },
        {
          key: "status",
          header: "Status",
          render: (employee) => (
            <Badge>{EMPLOYEE_STATUS_LABELS[employee.status]}</Badge>
          ),
        },
        {
          key: "actions",
          header: "Ações",
          render: (employee) => (
            <div className="flex items-center gap-2">
              <EmployeeEditDialog
                companyId={employee.company_id}
                employee={{
                  ...employee,
                  user_id: null,
                  birth_date: null,
                  manager_id: null,
                  team_id: null,
                  position_id: null,
                  disc_profile: null,
                  avatar_url: null,
                  created_at: "",
                  updated_at: "",
                }}
              />

              <ArchiveEmployeeButton
                companyId={employee.company_id}
                employeeId={employee.id}
              />
            </div>
          ),
        },
      ]}
    />
  )
}
