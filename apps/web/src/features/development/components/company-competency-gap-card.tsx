import {
  AlertTriangle,
  ChartNoAxesColumnIncreasing,
} from "lucide-react"

import {
  DashboardCard,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/dashboard"

import type {
  CompanyCompetencyGap,
} from "@/features/talent"

type CompanyCompetencyGapCardProps = {
  competencies: CompanyCompetencyGap[]
}

function formatGap(value: number) {
  return value.toFixed(1)
}

export function CompanyCompetencyGapCard({
  competencies,
}: CompanyCompetencyGapCardProps) {
  return (
    <DashboardSection
      title="Competências com maior GAP"
      description="Competências mais distantes do nível esperado."
    >
      <DashboardCard>
        {competencies.length === 0 ? (
          <DashboardEmptyState
            title="Nenhum GAP identificado"
            description="As competências avaliadas estão dentro ou acima do nível esperado."
            icon={
              <ChartNoAxesColumnIncreasing
                size={20}
              />
            }
          />
        ) : (
          <div className="space-y-4">
            {competencies
              .slice(0, 5)
              .map((competency) => (
                <div
                  key={competency.competencyId}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {
                        competency.competencyName
                      }
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {
                        competency.affectedEmployees
                      }{" "}
                      {competency.affectedEmployees ===
                      1
                        ? "colaborador"
                        : "colaboradores"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-red-700">
                    <AlertTriangle size={16} />

                    <span className="font-semibold">
                      {formatGap(
                        competency.averageGap
                      )}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </DashboardCard>
    </DashboardSection>
  )
}
