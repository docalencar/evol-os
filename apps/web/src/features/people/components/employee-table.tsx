import Link from "next/link"

import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { EMPLOYEE_STATUS_LABELS } from "../constants/employee-status"
import type { Employee, EmployeeStatus } from "../types/employee"
import { ArchiveEmployeeButton } from "./archive-employee-button"
import { EmployeeEditDialog } from "./employee-edit-dialog"

type EmployeeSelectOption = {
  id: string
  name: string
}

type Relation = { name: string } | { name: string }[] | null

type EmployeeTableItem = Employee & {
  teams?: Relation
  positions?: Relation
  manager_name?: string | null
}

function getRelationName(relation?: Relation) {
  if (!relation) return "-"
  if (Array.isArray(relation)) return relation[0]?.name || "-"
  return relation.name || "-"
}

type EmployeeTableProps = {
  employees: EmployeeTableItem[]
  teams: EmployeeSelectOption[]
  positions: EmployeeSelectOption[]
  managers: EmployeeSelectOption[]
}

export function EmployeeTable({
  employees,
  teams,
  positions,
  managers,
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
          render: (employee) => getRelationName(employee.positions),
        },
        {
          key: "team",
          header: "Time",
          render: (employee) => getRelationName(employee.teams),
        },
        {
          key: "manager",
          header: "Gestor",
          render: (employee) => employee.manager_name || "-",
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
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                render={
                  <Link href={`/app/people/${employee.id}`} />
                }
              >
                Ver perfil
              </Button>

              <EmployeeEditDialog
                companyId={employee.company_id}
                employee={employee}
                teams={teams}
                positions={positions}
                managers={managers}
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
