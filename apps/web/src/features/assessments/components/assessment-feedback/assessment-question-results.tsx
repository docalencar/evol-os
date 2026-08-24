import React from "react"

import type { AssessmentResultViewModel } from "../../view-models/assessment-result-view-model"

export function AssessmentQuestionResults({
  questions,
  qualitativeEvidence,
}: Readonly<{
  questions: AssessmentResultViewModel["questions"]
  qualitativeEvidence: AssessmentResultViewModel["qualitativeEvidence"]
}>) {
  if (questions.length === 0 && qualitativeEvidence.length === 0) return null

  return (
    <section aria-labelledby="assessment-evidence-title" className="space-y-3">
      <h2 id="assessment-evidence-title" className="text-lg font-semibold">
        Respostas e evidências
      </h2>

      <div className="space-y-3">
        {questions.map((question) => (
          <article key={question.id} className="min-w-0 rounded-lg border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-medium leading-6">{question.prompt}</h3>
                {question.competencyLabel ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Competência: {question.competencyLabel}
                  </p>
                ) : null}
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <p className="text-sm text-muted-foreground">Resposta</p>
                <p className="max-w-xl whitespace-pre-wrap break-words font-medium">
                  {question.answerLabel}
                </p>
              </div>
            </div>

            {question.scaleLabel || question.normalizedScoreLabel ? (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                {question.scaleLabel ? <span>{question.scaleLabel}</span> : null}
                {question.normalizedScoreLabel ? (
                  <span>Resultado: {question.normalizedScoreLabel}</span>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}

        {qualitativeEvidence.map((evidence, index) => (
          <article key={`${evidence.id}-${index}`} className="rounded-lg border p-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Evidência qualitativa
            </h3>
            <p className="mt-2 whitespace-pre-wrap break-words">{evidence.answerLabel}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
