import Link from "next/link"

import {
  DashboardCard,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/dashboard"

import type {
  Employee,
  EmployeeStatus,
} from "@/features/people"

type PositionEmployeesCardProps = {
  employees: Employee[]
}

const EMPLOYEE_STATUS_LABELS: Record<
  EmployeeStatus,
  string
> = {
  active: "Ativo",
  inactive: "Inativo",
  on_leave: "Afastado",
  terminated: "Desligado",
}

const EMPLOYEE_STATUS_STYLES: Record<
  EmployeeStatus,
  string
> = {
  active:
    "bg-emerald-50 text-emerald-700",
  inactive:
    "bg-slate-100 text-slate-600",
  on_leave:
    "bg-amber-50 text-amber-700",
  terminated:
    "bg-red-50 text-red-700",
}

export function PositionEmployeesCard({
  employees,
}: PositionEmployeesCardProps) {
  return (
    <DashboardSection
      title="Colaboradores vinculados"
      description="Pessoas que atualmente ocupam este cargo."
    >
      <DashboardCard>
        {employees.length === 0 ? (
          <DashboardEmptyState
            title="Nenhum colaborador vinculado"
            description="Os colaboradores associados a este cargo aparecerão aqui."
          />
        ) : (
          <div className="divide-y divide-slate-200">
            {employees.map(
              (employee) => (
                <div
                  key={employee.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/app/people/${employee.id}`}
                      className="font-medium text-slate-900 transition-colors hover:text-blue-600 hover:underline"
                    >
                      {employee.full_name}
                    </Link>

                    <p className="mt-1 break-all text-sm text-slate-500">
                      {employee.email ??
                        "Sem e-mail cadastrado"}
                    </p>
                  </div>

                  <span
                    className={[
                      "w-fit shrink-0 rounded-full px-3 py-1 text-sm font-medium",
                      EMPLOYEE_STATUS_STYLES[
                        employee.status
                      ],
                    ].join(" ")}
                  >
                    {
                      EMPLOYEE_STATUS_LABELS[
                        employee.status
                      ]
                    }
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </DashboardCard>
    </DashboardSection>
  )
}
