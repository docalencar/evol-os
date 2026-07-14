import type { AssessmentQuestion } from "../../types/assessment-question"

type AssessmentQuestionPreviewProps = {
  question: AssessmentQuestion
  index: number
}

export function AssessmentQuestionPreview({
  question,
  index,
}: AssessmentQuestionPreviewProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-background p-5">
      <div>
        <p className="font-medium text-slate-900">
          {index}. {question.question}
          {question.required ? (
            <span className="ml-1 text-red-500">*</span>
          ) : null}
        </p>

        {question.help_text ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {question.help_text}
          </p>
        ) : null}
      </div>

      {question.question_type === "scale" ? (
        <div className="flex flex-wrap gap-2">
          {Array.from(
            {
              length:
                question.scale_max - question.scale_min + 1,
            },
            (_, position) => question.scale_min + position
          ).map((value) => (
            <label
              key={value}
              className="flex min-w-12 cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <input
                type="radio"
                name={`preview-question-${question.id}`}
                value={value}
                className="sr-only"
                disabled
              />

              {value}
            </label>
          ))}
        </div>
      ) : null}

      {question.question_type === "yes_no" ? (
        <div className="flex gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm">
            <input
              type="radio"
              name={`preview-question-${question.id}`}
              disabled
            />
            Sim
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm">
            <input
              type="radio"
              name={`preview-question-${question.id}`}
              disabled
            />
            Não
          </label>
        </div>
      ) : null}

      {question.question_type === "text" ? (
        <textarea
          disabled
          placeholder="Resposta do colaborador"
          className="min-h-28 w-full rounded-md border bg-muted/30 p-3 text-sm"
        />
      ) : null}

      {question.question_type === "number" ? (
        <input
          type="number"
          disabled
          placeholder="Digite um número"
          className="h-10 w-full rounded-md border bg-muted/30 px-3 text-sm"
        />
      ) : null}
    </div>
  )
}
