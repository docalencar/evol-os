export function TimelineLoadingState() {
  return (
    <div aria-busy="true" aria-label="Carregando Timeline de cenários" className="space-y-8">
      <div className="h-24 animate-pulse rounded-card bg-slate-100" />
      <div className="space-y-6 pl-14 sm:pl-20">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-56 animate-pulse rounded-card bg-slate-100" />
        ))}
      </div>
    </div>
  )
}
