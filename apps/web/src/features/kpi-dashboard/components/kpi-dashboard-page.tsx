import { DashboardCard, DashboardSection } from "@/components/dashboard"
import { HealthCard, MetricCard } from "../cards"
import type { KPIDashboardViewModel } from "../types"
import { ExecutionStatus, KPITable, RuntimeStatus, WorkersTable } from "./dashboard-tables"
import { Timeline } from "./dashboard-timeline"
import { KPIDashboardEmptyState } from "./dashboard-states"

export function KPIDashboardPage({ dashboard }: { dashboard: KPIDashboardViewModel }) {
  return <main className="space-y-8"><header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
    <div><p className="text-sm font-medium text-slate-500">Evol OS · KPI Engine</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{dashboard.title}</h1>
      <p className="mt-2 text-sm text-slate-500">{dashboard.subtitle}</p></div><p className="text-xs text-slate-400">Atualizado em {dashboard.generatedAtLabel}</p></header>
    {dashboard.isEmpty ? <KPIDashboardEmptyState /> : null}
    <DashboardSection title="Executive Summary" description="Indicadores essenciais para decisão executiva.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{dashboard.summary.map((metric) => <MetricCard key={metric.id} metric={metric} />)}</div>
    </DashboardSection>
    <DashboardSection title="Operational Health" description="Saúde das camadas de execução."><div className="grid gap-4 md:grid-cols-3">
      {dashboard.health.map((item) => <HealthCard key={item.label} item={item} />)}</div><div className="mt-4"><RuntimeStatus health={dashboard.health} /></div></DashboardSection>
    <div className="grid gap-6 xl:grid-cols-2"><DashboardCard title="Execution KPIs"><ExecutionStatus metrics={dashboard.execution} /></DashboardCard>
      <DashboardCard title="Planning KPIs" description="Cenário, headcount e impacto financeiro."><dl className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Cenário atual</dt><dd className="mt-1 font-medium">{dashboard.planningContext.currentScenario}</dd></div>
        <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Cenário base</dt><dd className="mt-1 font-medium">{dashboard.planningContext.baseScenario}</dd></div>
      </dl><KPITable metrics={dashboard.planning} /></DashboardCard></div>
    <WorkersTable workers={dashboard.workers} /><Timeline items={dashboard.timeline} />
    <div className="grid gap-6 lg:grid-cols-2"><DashboardCard title="Alerts Preview">
      {dashboard.alerts.length ? <ul className="space-y-2 text-sm text-amber-800">{dashboard.alerts.map((alert) =>
        <li key={alert} className="rounded-lg bg-amber-50 p-3">{alert}</li>)}</ul> : <p className="text-sm text-slate-500">Nenhum alerta disponível.</p>}
    </DashboardCard><DashboardCard title="AI Insights" description="Espaço preparado para inteligência executiva.">
      <p className="text-sm text-slate-500">Recomendações, anomalias e predições serão adicionadas em uma evolução futura.</p></DashboardCard></div>
  </main>
}
