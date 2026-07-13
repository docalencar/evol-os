import {
  DashboardCard,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/dashboard"

import type {
  Competency,
} from "@/features/competencies"

import {
  PositionCompetencyCreateDialog,
} from "@/features/competencies/position-competencies"

type CompetencyRelation =
  | {
      name: string
    }
  | {
      name: string
    }[]
  | null

type PositionCompetencyItem = {
  id: string

  competency_id: string

  expected_level: number

  weight: number

  required: boolean

  competencies: CompetencyRelation
}

type PositionCompetenciesCardProps = {
  companyId: string

  positionId: string

  competencies: Competency[]

  positionCompetencies: PositionCompetencyItem[]
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

export function PositionCompetenciesCard({
  companyId,
  positionId,
  competencies,
  positionCompetencies,
}: PositionCompetenciesCardProps) {
  return (
    <DashboardSection
      title="Competências esperadas"
      description="Defina as competências necessárias para exercer este cargo."
      actions={
        <PositionCompetencyCreateDialog
          companyId={companyId}
          positionId={positionId}
          competencies={competencies}
          positionCompetencies={
            positionCompetencies
          }
        />
      }
    >
      <DashboardCard>
        {positionCompetencies.length ===
        0 ? (
          <DashboardEmptyState
            title="Nenhuma competência configurada"
            description="Adicione as competências esperadas para permitir o cálculo de GAP dos colaboradores deste cargo."
          />
        ) : (
          <div className="divide-y divide-slate-200">
            {positionCompetencies.map(
              (positionCompetency) => (
                <div
                  key={
                    positionCompetency.id
                  }
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {getCompetencyName(
                        positionCompetency.competencies
                      )}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Nível esperado:{" "}
                      {
                        positionCompetency.expected_level
                      }
                      /5
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      Peso{" "}
                      {
                        positionCompetency.weight
                      }
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {positionCompetency.required
                        ? "Obrigatória"
                        : "Opcional"}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </DashboardCard>
    </DashboardSection>
  )
}