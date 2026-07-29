export function PlanningDashboardLoadingState() {
  return (
    <div aria-busy="true" aria-label="Carregando dashboard de planejamento" className="space-y-6">
      <div className="h-28 animate-pulse rounded-card bg-slate-100" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-card bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-card bg-slate-100" />
        <div className="h-72 animate-pulse rounded-card bg-slate-100" />
      </div>
    </div>
  )
}
