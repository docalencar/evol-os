import { DashboardSection } from "@/components/dashboard/dashboard-section"
import { StatCard } from "@/components/dashboard/stat-card"

import type { AssessmentCycleResultsViewModel } from "../../view-models/assessment-cycle-results-view-model"

type AssessmentCycleResultsCardProps = {
  results: AssessmentCycleResultsViewModel
}

export function AssessmentCycleResultsCard({
  results,
}: AssessmentCycleResultsCardProps) {
  return (
    <DashboardSection
      title="Resultados da avaliação"
      description="Resumo consolidado do ciclo."
    >
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Taxa de conclusão
              </p>

              <p className="mt-2 text-4xl font-bold">
                {results.completionPercentage}%
              </p>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${results.completionPercentage}%`,
              }}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {results.metrics.map((metric) => (
            <StatCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              description={metric.description}
            />
          ))}
        </div>
      </div>
    </DashboardSection>
  )
}
