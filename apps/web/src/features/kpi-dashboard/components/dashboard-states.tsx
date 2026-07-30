import { DashboardEmptyState } from "@/components/dashboard"
export function KPIDashboardLoadingState() { return <div aria-busy="true" aria-label="Carregando Executive Dashboard"
  className="space-y-6"><div className="h-24 animate-pulse rounded-xl bg-slate-100" /><div className="grid gap-4 md:grid-cols-3">
    {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-44 animate-pulse rounded-xl bg-slate-100" />)}</div></div> }
export function KPIDashboardEmptyState() { return <DashboardEmptyState title="Indicadores ainda indisponíveis"
  description="O dashboard está pronto e aguardando avaliações publicadas pelo KPI Engine." /> }
