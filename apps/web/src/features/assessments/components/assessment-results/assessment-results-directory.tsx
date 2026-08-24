import Link from "next/link"
import React from "react"

import type { AssessmentResultDirectoryViewModel } from "../../view-models/assessment-result-directory-view-model"

export function AssessmentResultsDirectory({
  directory,
}: Readonly<{ directory: AssessmentResultDirectoryViewModel }>) {
  if (directory.isEmpty) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Você ainda não possui resultados disponíveis.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {directory.cycles.map((cycle) => (
        <section
          key={cycle.cycleId}
          aria-labelledby={`assessment-result-cycle-${cycle.cycleId}`}
          className="rounded-xl border bg-card p-5 sm:p-6"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3
                id={`assessment-result-cycle-${cycle.cycleId}`}
                className="break-words text-lg font-semibold"
              >
                {cycle.cycleName}
              </h3>
              <p className="text-sm text-muted-foreground">{cycle.modelName}</p>
            </div>
            <p className="shrink-0 text-sm text-muted-foreground">{cycle.dateLabel}</p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cycle.results.map((result) => (
              <article key={result.responseId} className="flex min-w-0 flex-col rounded-lg border p-4">
                <p className="text-sm font-medium text-primary">{result.perspectiveLabel}</p>
                <p className="mt-2 break-words text-3xl font-bold">{result.scoreLabel}</p>
                {result.scoreDescription ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {result.scoreDescription}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground">
                  {result.statusLabel}
                  {result.submittedAtLabel ? ` em ${result.submittedAtLabel}` : ""}
                </p>
                <Link
                  href={result.href}
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Ver resultado
                </Link>
              </article>
            ))}
          </div>

          {cycle.comparison ? (
            <div className="mt-5 rounded-lg border bg-card p-4 shadow-sm">
              <h4 className="text-base font-semibold">Diferença de percepção</h4>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Autoavaliação</p>
                  <p className="mt-1 text-xl font-semibold">
                    {cycle.comparison.self.scoreLabel}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gestor</p>
                  <p className="mt-1 text-xl font-semibold">
                    {cycle.comparison.manager.scoreLabel}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Diferença
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {cycle.comparison.differenceLabel}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Diferença de percepção compara a nota da Autoavaliação com a
                avaliação do Gestor. Ela não representa, por si só, um resultado
                positivo ou negativo.
              </p>
            </div>
          ) : cycle.comparisonUnavailableMessage ? (
            <p className="mt-5 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              {cycle.comparisonUnavailableMessage}
            </p>
          ) : null}
        </section>
      ))}
    </div>
  )
}
