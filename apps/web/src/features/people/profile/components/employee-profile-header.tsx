import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { EmployeeEditDialog } from "../../components/employee-edit-dialog"
import type {
  Employee,
} from "../../types/employee"
import type {
  EmployeeWorkspaceHeaderViewModel,
  EmployeeWorkspaceOptionsViewModel,
} from "../view-models/employee-workspace-view-model"

type EmployeeProfileHeaderProps = {
  companyId: string
  employee: Employee
  header: EmployeeWorkspaceHeaderViewModel
  options: EmployeeWorkspaceOptionsViewModel
}

export function EmployeeProfileHeader({
  companyId,
  employee,
  header,
  options,
}: EmployeeProfileHeaderProps) {
  return (
    <Card>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
            {header.initials}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words text-3xl font-bold text-slate-900">
                {header.name}
              </h1>

              <Badge>
                {header.statusLabel}
              </Badge>
            </div>

            <p className="mt-2 break-words text-slate-600">
              {header.subtitle}
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
            teams={options.teams}
            positions={options.positions}
            managers={options.managers}
            trigger={
              <Button>
                Editar perfil
              </Button>
            }
          />
        </div>
      </div>
    </Card>
  )
}
