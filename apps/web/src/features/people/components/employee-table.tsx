import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/data-table"

import { EMPLOYEE_STATUS_LABELS } from "../constants/employee-status"
import type { Employee, EmployeeStatus } from "../types/employee"
import { ArchiveEmployeeButton } from "./archive-employee-button"
import { EmployeeEditDialog } from "./employee-edit-dialog"

type EmployeeSelectOption = {
  id: string
  name: string
}

type EmployeeTableItem = Employee & {
  teams?: { name: string } | null
  positions?: { name: string } | null
}

type EmployeeTableProps = {
  employees: EmployeeTableItem[]
  teams: EmployeeSelectOption[]
  positions: EmployeeSelectOption[]
}

export function EmployeeTable({
  employees,
  teams,
  positions,
}: EmployeeTableProps) {
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
          key: "position",
          header: "Cargo",
          render: (employee) => employee.positions?.name || "Sem cargo",
        },
        {
          key: "team",
          header: "Time",
          render: (employee) => employee.teams?.name || "Sem time",
        },
        {
          key: "email",
          header: "E-mail",
          render: (employee) => employee.email || "Sem e-mail",
        },
        {
          key: "status",
          header: "Status",
          render: (employee) => (
            <Badge>
              {EMPLOYEE_STATUS_LABELS[employee.status as EmployeeStatus]}
            </Badge>
          ),
        },
        {
          key: "actions",
          header: "Ações",
          render: (employee) => (
            <div className="flex items-center gap-2">
              <EmployeeEditDialog
                companyId={employee.company_id}
                employee={employee}
                teams={teams}
                positions={positions}
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
