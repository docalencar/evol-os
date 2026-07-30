export function ExecutiveLoadingState() {
  return <div aria-busy="true" aria-label="Carregando Dashboard Executivo" className="space-y-4"><div className="h-28 animate-pulse rounded-xl bg-slate-100" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-xl bg-slate-100" />)}</div></div>
}
