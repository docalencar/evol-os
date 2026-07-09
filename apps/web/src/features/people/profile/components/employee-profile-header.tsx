import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { EMPLOYEE_STATUS_LABELS } from "@/features/people/constants/employee-status"
import type { EmployeeStatus } from "@/features/people/types/employee"

type EmployeeProfileHeaderProps = {
  employee: {
    id: string
    full_name: string
    email: string | null
    phone: string | null
    hire_date: string | null
    status: EmployeeStatus
  }

  positionName: string
  teamName: string
  managerName?: string | null
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function formatDate(date?: string | null) {
  if (!date) return "-"

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
  }).format(new Date(date))
}

export function EmployeeProfileHeader({
  employee,
  positionName,
  teamName,
  managerName,
}: EmployeeProfileHeaderProps) {
  return (
    <Card>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
            {getInitials(employee.full_name)}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                {employee.full_name}
              </h1>

              <Badge>
                {EMPLOYEE_STATUS_LABELS[employee.status]}
              </Badge>
            </div>

            <p className="mt-2 text-slate-600">
              {positionName} • {teamName}
            </p>

            <div className="mt-2 flex flex-wrap gap-6 text-sm text-slate-500">
              <span>
                <strong>Gestor:</strong> {managerName || "-"}
              </span>

              <span>
                <strong>Admissão:</strong> {formatDate(employee.hire_date)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/app/people">
            <Button variant="secondary">
              Voltar
            </Button>
          </Link>

          <Button>
            Editar Perfil
          </Button>
        </div>
      </div>
    </Card>
  )
}
