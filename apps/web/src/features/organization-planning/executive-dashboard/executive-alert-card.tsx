import { DashboardCard } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import type { ExecutiveAlertViewModel } from "./executive-dashboard-view-model"

export function ExecutiveAlertCard({ alert }: { alert: ExecutiveAlertViewModel }) {
  return <DashboardCard title={alert.title} actions={<Badge>{alert.badge}</Badge>}><p className="text-sm leading-6 text-slate-600">{alert.description}</p><p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">{alert.category}</p></DashboardCard>
}
