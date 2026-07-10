import { DashboardCard } from "@/components/dashboard"

type CompetencyRelation =
  | { name: string }
  | { name: string }[]
  | null

type EmployeeCompetencyItem = {
  id: string
  current_level: number
  source: string
  competencies: CompetencyRelation
}

type EmployeeCompetenciesCardProps = {
  competencies: EmployeeCompetencyItem[]
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  assessment: "Avaliação",
  manager: "Gestor",
  self: "Autoavaliação",
}

function getCompetencyName(relation: CompetencyRelation) {
  if (!relation) {
    return "Competência não identificada"
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name ?? "Competência não identificada"
  }

  return relation.name
}

export function EmployeeCompetenciesCard({
  competencies,
}: EmployeeCompetenciesCardProps) {
  return (
    <DashboardCard>
      {competencies.length === 0 ? (
        <p className="text-sm text-slate-600">
          Nenhuma competência foi registrada para este colaborador.
        </p>
      ) : (
        <div className="divide-y divide-slate-200">
          {competencies.map((employeeCompetency) => (
            <div
              key={employeeCompetency.id}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {getCompetencyName(employeeCompetency.competencies)}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Origem:{" "}
                  {SOURCE_LABELS[employeeCompetency.source] ??
                    employeeCompetency.source}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Nível atual
                </p>

                <p className="text-lg font-semibold text-slate-900">
                  {employeeCompetency.current_level}/5
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  )
}
