import React from "react"

export function ScenarioComparisonLoadingState() {
  return (
    <main
      aria-busy="true"
      aria-label="Carregando comparação do cenário"
      className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-36 rounded bg-slate-200" />
        <div className="h-9 w-72 max-w-full rounded bg-slate-200" />
        <div className="h-4 w-full max-w-2xl rounded bg-slate-100" />
      </div>

      <div className="grid animate-pulse gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-32 rounded-xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>

      <div className="grid animate-pulse gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-48 rounded-xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
    </main>
  )
}
