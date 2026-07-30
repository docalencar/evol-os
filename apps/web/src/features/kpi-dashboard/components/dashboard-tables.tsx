import { DashboardCard, DashboardEmptyState } from "@/components/dashboard"
import { StatusBadge } from "./status-badge"
import type { KPIDashboardViewModel, MetricCardViewModel } from "../types"

export function KPITable({ metrics }: { metrics: readonly MetricCardViewModel[] }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead>
    <tr className="border-b text-slate-500"><th className="px-3 py-3 font-medium">Indicador</th>
      <th className="px-3 py-3 font-medium">Valor</th><th className="px-3 py-3 font-medium">Tendência</th>
      <th className="px-3 py-3 font-medium">Status</th></tr></thead><tbody>{metrics.map((metric) =>
        <tr className="border-b last:border-0" key={metric.id}><td className="px-3 py-3 font-medium text-slate-800">{metric.label}</td>
          <td className="px-3 py-3">{metric.valueLabel}</td><td className="px-3 py-3 text-slate-500">{metric.trendLabel}</td>
          <td className="px-3 py-3"><StatusBadge status={metric.status} label={metric.statusLabel} /></td></tr>)}</tbody></table></div>
}
export function WorkersTable({ workers }: { workers: KPIDashboardViewModel["workers"] }) {
  return <DashboardCard title="Workers" description="Instâncias conhecidas do Worker Runtime.">
    {workers.length === 0 ? <DashboardEmptyState title="Nenhum worker disponível"
      description="A fonte operacional ainda não publicou snapshots de workers." /> :
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500">
        <th className="py-3">Worker</th><th>Runtime</th><th>Status</th><th>Último ciclo</th><th>Leases</th></tr></thead>
        <tbody>{workers.map((worker) => <tr key={worker.id} className="border-b last:border-0"><td className="py-3">{worker.id}</td>
          <td>{worker.runtimeId}</td><td><StatusBadge status={worker.status} label={worker.statusLabel} /></td>
          <td>{worker.lastCycleLabel}</td><td>{worker.activeLeases}</td></tr>)}</tbody></table></div>}
  </DashboardCard>
}
export function RuntimeStatus({ health }: { health: KPIDashboardViewModel["health"] }) {
  return <div className="grid gap-4 md:grid-cols-3">{health.map((item) => <div key={item.label}
    className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex justify-between gap-3"><p className="font-medium">{item.label}</p>
      <StatusBadge status={item.status} label={item.statusLabel} /></div><p className="mt-2 text-sm text-slate-500">{item.description}</p></div>)}</div>
}
export function ExecutionStatus({ metrics }: { metrics: readonly MetricCardViewModel[] }) { return <KPITable metrics={metrics} /> }
