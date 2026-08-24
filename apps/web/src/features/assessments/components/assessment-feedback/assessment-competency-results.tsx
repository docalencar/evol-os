import React from "react"

import type { AssessmentResultViewModel } from "../../view-models/assessment-result-view-model"

export function AssessmentCompetencyResults({
  competencies,
}: Readonly<{ competencies: AssessmentResultViewModel["competencies"] }>) {
  if (competencies.length === 0) return null

  return (
    <section aria-labelledby="assessment-competencies-title" className="space-y-3">
      <div>
        <h2 id="assessment-competencies-title" className="text-lg font-semibold">
          Competências
        </h2>
        <p className="text-sm text-muted-foreground">Resultado nesta avaliação</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {competencies.map((competency) => (
          <article key={competency.id} className="rounded-lg border p-4">
            <h3 className="font-medium">{competency.name}</h3>
            <p className="mt-2 text-2xl font-semibold">{competency.scoreLabel}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
