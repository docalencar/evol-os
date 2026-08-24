import React from "react"

import type { AssessmentResultViewModel } from "../../view-models/assessment-result-view-model"
import { AssessmentCompetencyResults } from "./assessment-competency-results"
import { AssessmentQuestionResults } from "./assessment-question-results"
import { AssessmentResultSummary } from "./assessment-result-summary"
import { AssessmentSectionResults } from "./assessment-section-results"

export function AssessmentFeedbackCard({
  result,
}: Readonly<{ result: AssessmentResultViewModel }>) {
  return (
    <div className="space-y-7 rounded-xl border bg-card p-5 sm:p-6">
      {result.mode === "administrative" ? (
        <aside className="rounded-lg border border-blue-200 bg-blue-50 p-4" aria-label="Modo de visualização">
          <p className="font-semibold text-blue-900">Visualização administrativa</p>
          <p className="mt-1 text-sm text-blue-800">
            Este resultado está disponível somente para consulta.
          </p>
        </aside>
      ) : null}

      {result.mode === "evaluator" ? (
        <aside className="rounded-lg border border-emerald-200 bg-emerald-50 p-4" aria-label="Modo de visualização">
          <p className="font-semibold text-emerald-900">Avaliação enviada</p>
          <p className="mt-1 text-sm text-emerald-800">
            Suas respostas estão disponíveis somente para consulta.
          </p>
        </aside>
      ) : null}

      <AssessmentResultSummary result={result} />
      <AssessmentSectionResults sections={result.sections} />
      <AssessmentCompetencyResults competencies={result.competencies} />
      <AssessmentQuestionResults
        questions={result.questions}
        qualitativeEvidence={result.qualitativeEvidence}
      />
    </div>
  )
}
