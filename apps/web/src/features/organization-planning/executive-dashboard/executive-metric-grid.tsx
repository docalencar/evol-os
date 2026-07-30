import type { ExecutiveMetricViewModel } from "./executive-dashboard-view-model"
import { ExecutiveKpiCard } from "./executive-kpi-card"

export function ExecutiveMetricGrid({ metrics }: { metrics: readonly ExecutiveMetricViewModel[] }) {
  return <section aria-labelledby="executive-metrics-title" className="space-y-4"><h2 id="executive-metrics-title" className="text-xl font-semibold text-slate-900">Indicadores executivos</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <ExecutiveKpiCard key={metric.id} metric={metric} />)}</div></section>
}
