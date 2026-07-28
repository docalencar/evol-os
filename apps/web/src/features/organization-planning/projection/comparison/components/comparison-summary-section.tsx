import React from "react"
import type { ComparisonSummaryViewModel } from "../view-models"

type ComparisonSummarySectionProps = Readonly<{
  summary: ComparisonSummaryViewModel
}>

const metricLabels = {
  headcount: "Colaboradores",
  vacancies: "Vagas",
  departments: "Departamentos",
  positions: "Cargos",
} as const

export function ComparisonSummarySection({
  summary,
}: ComparisonSummarySectionProps) {
  return (
    <section aria-labelledby="comparison-summary-title" className="space-y-4">
      <div>
        <p className="text-sm font-medium text-blue-700">Resumo estrutural</p>
        <h2
          id="comparison-summary-title"
          className="text-xl font-semibold text-slate-950"
        >
          {summary.totalChanges} alterações no cenário
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(metricLabels).map(([key, label]) => {
          const metric = summary.metrics[key as keyof typeof metricLabels]

          return (
            <article
              key={key}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm text-slate-600">{label}</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold text-slate-950">
                  {metric.after}
                </p>
                <p className="text-sm font-medium text-slate-700">
                  {formatDelta(metric.delta)}
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Antes: {metric.before}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function formatDelta(delta: number): string {
  if (delta > 0) {
    return `+${delta}`
  }

  return String(delta)
}
