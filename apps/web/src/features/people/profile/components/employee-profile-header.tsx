import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { EmployeeEditDialog } from "../../components/employee-edit-dialog"
import { EMPLOYEE_STATUS_LABELS } from "../../constants/employee-status"
import type {
  Employee,
  EmployeeStatus,
} from "../../types/employee"

type EmployeeSelectOption = {
  id: string
  name: string
}

type EmployeeProfileHeaderProps = {
  companyId: string
  employee: Employee
  positionName: string
  teamName: string
  teams: EmployeeSelectOption[]
  positions: EmployeeSelectOption[]
  managers: EmployeeSelectOption[]
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function EmployeeProfileHeader({
  companyId,
  employee,
  positionName,
  teamName,
  teams,
  positions,
  managers,
}: EmployeeProfileHeaderProps) {
  return (
    <Card>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
            {getInitials(employee.full_name)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words text-3xl font-bold text-slate-900">
                {employee.full_name}
              </h1>

              <Badge>
                {
                  EMPLOYEE_STATUS_LABELS[
                    employee.status as EmployeeStatus
                  ]
                }
              </Badge>
            </div>

            <p className="mt-2 break-words text-slate-600">
              {positionName} • {teamName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/app/people">
            <Button variant="secondary">
              Voltar
            </Button>
          </Link>

          <EmployeeEditDialog
            companyId={companyId}
            employee={employee}
            teams={teams}
            positions={positions}
            managers={managers}
            trigger={<Button>Editar perfil</Button>}
          />
        </div>
      </div>
    </Card>
  )
}
