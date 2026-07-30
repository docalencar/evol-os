import { DashboardCard } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import type { ExecutiveDashboardViewModel } from "../executive-dashboard"

export function ExecutiveOverviewCard({ dashboard }: { dashboard: ExecutiveDashboardViewModel }) {
  return <DashboardCard title="Visão geral" actions={<Badge>{dashboard.scenario.status}</Badge>}><dl className="grid gap-4 sm:grid-cols-3"><div><dt className="text-xs uppercase text-slate-400">Cenário</dt><dd className="font-semibold text-slate-900">{dashboard.scenario.name}</dd></div><div><dt className="text-xs uppercase text-slate-400">Versão</dt><dd className="font-semibold text-slate-900">{dashboard.scenario.version}</dd></div><div><dt className="text-xs uppercase text-slate-400">Gerado em</dt><dd className="font-semibold text-slate-900">{dashboard.generatedAt}</dd></div></dl></DashboardCard>
}
