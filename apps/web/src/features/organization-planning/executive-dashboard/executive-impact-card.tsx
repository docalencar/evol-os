import { DashboardCard } from "@/components/dashboard"
import type { ExecutiveImpactViewModel } from "./executive-dashboard-view-model"

export function ExecutiveImpactCard({ impacts }: { impacts: readonly ExecutiveImpactViewModel[] }) {
  return <DashboardCard title="Impactos organizacionais" description="Consolidação apresentada pela comparação oficial."><dl className="grid gap-3 sm:grid-cols-2">{impacts.map((impact) => <div key={impact.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3"><dt className="text-sm text-slate-600">{impact.label}</dt><dd className="font-semibold text-slate-900">{impact.totalLabel}</dd></div>)}</dl></DashboardCard>
}
