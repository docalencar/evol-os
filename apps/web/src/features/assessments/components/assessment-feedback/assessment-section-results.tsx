import React from "react"

import type { AssessmentResultViewModel } from "../../view-models/assessment-result-view-model"

export function AssessmentSectionResults({
  sections,
}: Readonly<{ sections: AssessmentResultViewModel["sections"] }>) {
  if (sections.length === 0) return null

  return (
    <section aria-labelledby="assessment-sections-title" className="space-y-3">
      <h2 id="assessment-sections-title" className="text-lg font-semibold">
        Resultado por seção
      </h2>

      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <article key={section.id} className="min-w-0 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-medium">{section.name}</h3>
              <span className="font-semibold">{section.scoreLabel}</span>
            </div>

            {section.score !== null ? (
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label={`Resultado da seção ${section.name}: ${section.scoreLabel}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={section.score}
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, Math.max(0, section.score))}%` }}
                />
              </div>
            ) : null}

            <p className="mt-2 text-xs text-muted-foreground">{section.weightLabel}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
