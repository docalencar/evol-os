import { DashboardCard } from "@/components/dashboard"
import type { ExecutiveMetricViewModel } from "./executive-dashboard-view-model"

export function ExecutiveKpiCard({ metric }: { metric: ExecutiveMetricViewModel }) {
  return <DashboardCard title={metric.label}><p className="text-2xl font-bold text-slate-900">{metric.valueLabel}</p>{metric.contextLabel ? <p className="mt-2 text-sm text-slate-500">{metric.contextLabel}</p> : null}</DashboardCard>
}
