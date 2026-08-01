export function ExecutiveLoadingState() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando Centro Executivo"
      className="space-y-8"
    >
      <div className="h-52 animate-pulse rounded-xl border bg-muted" />

      <div className="h-32 animate-pulse rounded-xl border bg-muted" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border bg-muted"
          />
        ))}
      </div>

      <div className="h-48 animate-pulse rounded-xl border bg-muted" />
    </div>
  )
}