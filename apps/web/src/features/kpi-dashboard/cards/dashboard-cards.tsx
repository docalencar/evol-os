import { DashboardCard } from "@/components/dashboard"
import { StatusBadge } from "../components/status-badge"
import type { KPIDashboardViewModel, MetricCardViewModel } from "../types"

export function MetricCard({ metric }: { metric: MetricCardViewModel }) {
  return <DashboardCard className="min-h-44" actions={<StatusBadge status={metric.status} label={metric.statusLabel} />}>
    <p className="text-sm font-medium text-slate-500">{metric.label}</p>
    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{metric.valueLabel}</p>
    <div className="mt-4 flex gap-3 text-xs text-slate-500"><span>{metric.variationLabel}</span><span>·</span>
      <span>{metric.trendLabel}</span></div><p className="mt-3 text-xs text-slate-400">{metric.updatedAtLabel}</p>
  </DashboardCard>
}
export function HealthCard({ item }: { item: KPIDashboardViewModel["health"][number] }) {
  return <DashboardCard title={item.label} actions={<StatusBadge status={item.status} label={item.statusLabel} />}>
    <p className="text-sm text-slate-500">{item.description}</p></DashboardCard>
}
export function TrendCard({ metric }: { metric: MetricCardViewModel }) {
  return <MetricCard metric={metric} />
}
