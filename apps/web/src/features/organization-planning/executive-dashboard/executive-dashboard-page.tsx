import type { ExecutiveDashboardViewModel } from "./executive-dashboard-view-model"
import { ExecutiveAlertCard } from "./executive-alert-card"
import { ExecutiveEmptyState } from "./executive-empty-state"
import { ExecutiveImpactCard } from "./executive-impact-card"
import { ExecutiveKpiCard } from "./executive-kpi-card"
import { ExecutiveMetricGrid } from "./executive-metric-grid"
import { ExecutiveSummaryCard } from "./executive-summary-card"

export function ExecutiveDashboardPage({ dashboard }: { dashboard: ExecutiveDashboardViewModel }) {
  return <main className="space-y-8"><header><p className="text-sm font-medium text-slate-500">Organization Planning</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Dashboard Executivo — {dashboard.scenario.name}</h1><p className="mt-2 text-sm text-slate-500">Versão {dashboard.scenario.version} · {dashboard.scenario.status}</p></header><ExecutiveSummaryCard summary={dashboard.summary} />{dashboard.isEmpty ? <ExecutiveEmptyState /> : <><ExecutiveMetricGrid metrics={dashboard.metrics} /><div className="grid gap-6 xl:grid-cols-2">{dashboard.headcount ? <ExecutiveKpiCard metric={dashboard.headcount} /> : null}<ExecutiveImpactCard impacts={dashboard.impacts} /></div><section aria-labelledby="executive-alerts-title" className="space-y-4"><h2 id="executive-alerts-title" className="text-xl font-semibold text-slate-900">Alertas</h2>{dashboard.alerts.length ? <div className="grid gap-4 lg:grid-cols-2">{dashboard.alerts.map((alert) => <ExecutiveAlertCard key={alert.id} alert={alert} />)}</div> : <p className="text-sm text-slate-500">Nenhum alerta identificado.</p>}</section></>}</main>
}
