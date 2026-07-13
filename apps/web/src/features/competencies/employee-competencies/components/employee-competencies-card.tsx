import {
  DashboardCard,
  DashboardEmptyState,
} from "@/components/dashboard"

import type {
  Competency,
} from "@/features/competencies"

import type {
  EmployeeCompetencySource,
} from "../types/employee-competency"

import {
  ArchiveEmployeeCompetencyButton,
} from "./archive-employee-competency-button"

import {
  EmployeeCompetencyCreateDialog,
} from "./employee-competency-create-dialog"

import {
  EmployeeCompetencyEditDialog,
} from "./employee-competency-edit-dialog"

type CompetencyRelation =
  | {
      name: string
    }
  | {
      name: string
    }[]
  | null

type EmployeeCompetencyItem = {
  id: string

  competency_id: string

  current_level: number

  source: EmployeeCompetencySource

  validated_at: string | null

  notes: string | null

  competencies: CompetencyRelation
}

type EmployeeCompetenciesCardProps = {
  companyId: string

  employeeId: string

  competencies: Competency[]

  employeeCompetencies: EmployeeCompetencyItem[]
}

const SOURCE_LABELS: Record<
  EmployeeCompetencySource,
  string
> = {
  manual: "Manual",
  assessment: "Avaliação",
  manager: "Gestor",
  self: "Autoavaliação",
}

function getCompetencyName(
  relation: CompetencyRelation
) {
  if (!relation) {
    return "Competência não identificada"
  }

  if (Array.isArray(relation)) {
    return (
      relation[0]?.name ??
      "Competência não identificada"
    )
  }

  return relation.name
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
    }
  ).format(
    new Date(`${value}T00:00:00`)
  )
}

export function EmployeeCompetenciesCard({
  companyId,
  employeeId,
  competencies,
  employeeCompetencies,
}: EmployeeCompetenciesCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <EmployeeCompetencyCreateDialog
          companyId={companyId}
          employeeId={employeeId}
          competencies={competencies}
          employeeCompetencies={
            employeeCompetencies
          }
        />
      </div>

      <DashboardCard>
        {employeeCompetencies.length ===
        0 ? (
          <DashboardEmptyState
            title="Nenhuma competência registrada"
            description="Adicione uma competência e informe o nível atual do colaborador."
          />
        ) : (
          <div className="divide-y divide-slate-200">
            {employeeCompetencies.map(
              (employeeCompetency) => {
                const competencyName =
                  getCompetencyName(
                    employeeCompetency.competencies
                  )

                const validatedAt =
                  formatDate(
                    employeeCompetency.validated_at
                  )

                return (
                  <div
                    key={
                      employeeCompetency.id
                    }
                    className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        {competencyName}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span>
                          Origem:{" "}
                          {
                            SOURCE_LABELS[
                              employeeCompetency
                                .source
                            ]
                          }
                        </span>

                        {validatedAt ? (
                          <span>
                            Validada em:{" "}
                            {validatedAt}
                          </span>
                        ) : null}
                      </div>

                      {employeeCompetency.notes ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {
                            employeeCompetency.notes
                          }
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-24 rounded-lg bg-slate-50 px-4 py-2 text-center">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Nível atual
                        </p>

                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {
                            employeeCompetency.current_level
                          }
                          /5
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <EmployeeCompetencyEditDialog
                          companyId={
                            companyId
                          }
                          employeeId={
                            employeeId
                          }
                          competencies={
                            competencies
                          }
                          employeeCompetency={{
                            id:
                              employeeCompetency.id,

                            competencyId:
                              employeeCompetency.competency_id,

                            currentLevel:
                              employeeCompetency.current_level,

                            source:
                              employeeCompetency.source,

                            validatedAt:
                              employeeCompetency.validated_at,

                            notes:
                              employeeCompetency.notes,
                          }}
                        />

                        <ArchiveEmployeeCompetencyButton
                          companyId={
                            companyId
                          }
                          employeeId={
                            employeeId
                          }
                          employeeCompetencyId={
                            employeeCompetency.id
                          }
                          competencyName={
                            competencyName
                          }
                        />
                      </div>
                    </div>
                  </div>
                )
              }
            )}
          </div>
        )}
      </DashboardCard>
    </div>
  )
}