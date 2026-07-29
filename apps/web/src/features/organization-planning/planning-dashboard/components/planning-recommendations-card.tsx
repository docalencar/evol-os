import { DashboardCard, DashboardEmptyState } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"

import type { PlanningRecommendationViewModel } from "../../presentation"

type PlanningRecommendationsCardProps = {
  recommendations: readonly PlanningRecommendationViewModel[]
}

export function PlanningRecommendationsCard({ recommendations }: PlanningRecommendationsCardProps) {
  return (
    <DashboardCard title="Recomendações" description="Ações apresentadas pelo Planning Insights.">
      {recommendations.length === 0 ? (
        <DashboardEmptyState title="Nenhuma recomendação" description="Não há recomendações para este cenário." />
      ) : (
        <ol className="space-y-3">
          {recommendations.map((recommendation, index) => (
            <li key={recommendation.id} className="flex gap-3 rounded-lg border border-slate-200 p-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                {index + 1}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{recommendation.title}</h3>
                  <Badge>{recommendation.priorityLabel}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">{recommendation.description}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  )
}
