import type { PlanningDashboardViewModel } from "../application"
import { ExecutiveSummaryCard } from "./components/executive-summary-card"
import { PlanningDashboardEmptyState } from "./components/empty-state"
import { PlanningImpactCard } from "./components/planning-impact-card"
import { PlanningKpiGrid } from "./components/planning-kpi-grid"
import { PlanningOpportunitiesCard } from "./components/planning-opportunities-card"
import { PlanningRecommendationsCard } from "./components/planning-recommendations-card"
import { PlanningRisksCard } from "./components/planning-risks-card"
import { PlanningStructuralChangesCard } from "./components/planning-structural-changes-card"
import { PublicationReadinessCard } from "./components/publication-readiness-card"

type PlanningDashboardPageProps = {
  dashboard: PlanningDashboardViewModel
}

export function PlanningDashboardPage({ dashboard }: PlanningDashboardPageProps) {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-slate-500">Organization Planning</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{dashboard.scenario.name}</h1>
        {dashboard.scenario.description ? (
          <p className="mt-2 max-w-3xl text-slate-600">{dashboard.scenario.description}</p>
        ) : null}
      </header>

      <ExecutiveSummaryCard dashboard={dashboard} />

      {dashboard.comparison.summary.isEmpty ? (
        <PlanningDashboardEmptyState />
      ) : (
        <>
          <PlanningKpiGrid metrics={dashboard.comparison.metrics} kpis={dashboard.insights.kpis} />
          <PlanningImpactCard comparison={dashboard.comparison} />
          <PlanningStructuralChangesCard sections={dashboard.comparison.sections} />
        </>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <PlanningRisksCard risks={dashboard.insights.warnings} />
        <PlanningRecommendationsCard recommendations={dashboard.insights.recommendations} />
        <PlanningOpportunitiesCard opportunities={dashboard.insights.opportunities} />
        <PublicationReadinessCard generatedAt={dashboard.generatedAt} version={dashboard.version} scenario={dashboard.scenario} />
      </div>
    </div>
  )
}
