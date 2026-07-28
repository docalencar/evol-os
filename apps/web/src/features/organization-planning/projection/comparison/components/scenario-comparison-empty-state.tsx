import React from "react"

export function ScenarioComparisonEmptyState() {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <h2 className="text-lg font-semibold text-slate-950">
        Nenhuma alteração encontrada
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        A estrutura projetada é equivalente à estrutura base. Quando o cenário
        produzir mudanças, elas aparecerão nesta comparação.
      </p>
    </section>
  )
}
