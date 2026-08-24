import React from "react"

import type { AssessmentResultViewModel } from "../../view-models/assessment-result-view-model"

export function AssessmentResultSummary({
  result,
}: Readonly<{ result: AssessmentResultViewModel }>) {
  return (
    <section aria-labelledby="assessment-result-title" className="space-y-5">
      <div>
        <p className="text-sm font-medium text-primary">{result.perspective.label}</p>
        <h1 id="assessment-result-title" className="mt-1 text-2xl font-semibold">
          Resultado da avaliação
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Resultado normalizado</p>
          <p className="mt-1 break-words text-4xl font-bold sm:text-5xl">
            {result.score.label}
          </p>
          {result.score.description ? (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {result.score.description}
            </p>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-1">
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{result.statusLabel}</dd>
          </div>
          {result.submittedAtLabel ? (
            <div>
              <dt className="text-muted-foreground">Enviada em</dt>
              <dd className="font-medium">{result.submittedAtLabel}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </section>
  )
}
