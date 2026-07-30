import { DashboardCard } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import type { ExecutiveDashboardViewModel } from "./executive-dashboard-view-model"

export function ExecutiveSummaryCard({ summary }: { summary: ExecutiveDashboardViewModel["summary"] }) {
  return <DashboardCard title="Resumo executivo" actions={<Badge>{summary.riskLabel}</Badge>}><p className="text-lg leading-8 text-slate-700">{summary.headline}</p></DashboardCard>
}
