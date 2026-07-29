import { StatCard } from "@/components/dashboard"

import type {
  PlanningComparisonMetricViewModel,
  PlanningKpiCardViewModel,
} from "../../presentation"
import { PlanningDashboardIcon } from "./planning-dashboard-icon"

type PlanningKpiGridProps = {
  metrics: readonly PlanningComparisonMetricViewModel[]
  kpis: readonly PlanningKpiCardViewModel[]
}

const visibleKpiIds = new Set([
  "teams_created",
  "employees_transferred",
  "employees_terminated",
])

export function PlanningKpiGrid({ metrics, kpis }: PlanningKpiGridProps) {
  const visibleKpis = kpis.filter((kpi) => visibleKpiIds.has(kpi.id))

  return (
    <section aria-labelledby="planning-kpis-title" className="space-y-4">
      <div>
        <h2 id="planning-kpis-title" className="text-xl font-semibold text-slate-900">
          Indicadores do cenário
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Valores apresentados pelas camadas de comparação e insights.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard
            key={metric.id}
            label={metric.label}
            value={metric.afterLabel}
            description={`Antes: ${metric.beforeLabel} · Delta: ${metric.deltaLabel}`}
            icon={<PlanningDashboardIcon icon={metric.icon} className="size-5" />}
          />
        ))}

        {visibleKpis.map((kpi) => (
          <StatCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.valueLabel}
            icon={<PlanningDashboardIcon icon={kpi.icon} className="size-5" />}
          />
        ))}
      </div>
    </section>
  )
}
