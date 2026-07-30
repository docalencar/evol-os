import { DashboardCard, DashboardEmptyState } from "@/components/dashboard"
import { StatusBadge } from "./status-badge"
import type { KPIDashboardViewModel } from "../types"

export function Timeline({ items }: { items: KPIDashboardViewModel["timeline"] }) {
  return <DashboardCard title="Timeline operacional" description="Eventos em ordem cronológica decrescente.">
    {items.length === 0 ? <DashboardEmptyState title="Timeline vazia"
      description="Nenhum evento operacional foi disponibilizado para consulta." /> : <ol className="space-y-4">{items.map((item) =>
        <li key={item.id} className="grid gap-2 border-l-2 border-slate-200 pl-4 sm:grid-cols-[9rem_1fr_auto]">
          <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.kindLabel}</p>
            <time className="text-xs text-slate-400">{item.occurredAtLabel}</time></div><div><p className="font-medium text-slate-900">{item.title}</p>
            <p className="text-sm text-slate-500">{item.description}</p></div><StatusBadge status={item.status} label={item.statusLabel} />
        </li>)}</ol>}
  </DashboardCard>
}
