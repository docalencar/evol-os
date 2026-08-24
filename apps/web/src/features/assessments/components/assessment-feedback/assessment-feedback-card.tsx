import type { AssessmentScoredResult } from "@/features/assessment-feedback-read"

type Props = {
  feedback: AssessmentScoredResult
}

const perspectiveLabels = {
  self: "Autoavaliação",
  manager: "Gestor",
  direct_report: "Liderado direto",
  legacy_unknown: "Perspectiva histórica",
} as const

function formatEvidence(question: AssessmentScoredResult["questions"][number]) {
  if (question.type === "scale") {
    return question.rawScore === null
      ? "Sem resposta"
      : `${question.rawScore} (${question.normalizedScore?.toFixed(1)}%)`
  }
  if (question.type === "yes_no") {
    return question.answerBoolean === null ? "Sem resposta" : question.answerBoolean ? "Sim" : "Não"
  }
  if (question.type === "number") return question.answerNumber ?? "Sem resposta"
  return question.answerText ?? "Sem resposta"
}

export function AssessmentFeedbackCard({
  feedback,
}: Props) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">
          Resultado da avaliação
        </h2>

        <p className="text-muted-foreground mt-1">
          {perspectiveLabels[feedback.perspective]} · fórmula normalizada por pesos.
        </p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">
          Resultado normalizado
        </p>

        <p className="text-5xl font-bold mt-2">
          {feedback.overallScore === null ? "--" : `${feedback.overallScore.toFixed(1)}%`}
        </p>
      </div>

      <div className="space-y-3">
        {feedback.sections.map((item) => (
          <div
            key={item.snapshotSectionId}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <span>{item.name}</span>

            <span className="font-semibold">
              {item.score === null ? "--" : `${item.score.toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>

      {feedback.questions.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold">Respostas e evidências</h3>
          {feedback.questions.map((question) => (
            <div key={question.snapshotQuestionId} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-4">
                <span>{question.prompt}</span>
                <span className="font-semibold text-right">{formatEvidence(question)}</span>
              </div>
              {question.type === "scale" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Escala {question.scaleMin}–{question.scaleMax} · peso {question.weight}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
