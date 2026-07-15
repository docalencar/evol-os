import type { AssessmentFeedbackViewModel } from "../../view-models/assessment-feedback-view-model"

type Props = {
  feedback: AssessmentFeedbackViewModel
}

export function AssessmentFeedbackCard({
  feedback,
}: Props) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">
          Seu Feedback
        </h2>

        <p className="text-muted-foreground mt-1">
          Resumo da sua avaliação.
        </p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">
          Média Geral
        </p>

        <p className="text-5xl font-bold mt-2">
          {feedback.overallScore.toFixed(1)}
        </p>
      </div>

      <div className="space-y-3">
        {feedback.competencies.map((item) => (
          <div
            key={item.sectionId}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <span>{item.sectionName}</span>

            <span className="font-semibold">
              {item.averageScore.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
