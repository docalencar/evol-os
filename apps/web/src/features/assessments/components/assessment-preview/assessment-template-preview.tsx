import type { AssessmentQuestion } from "../../types/assessment-question"
import type { AssessmentSection } from "../../types/assessment-section"
import type { AssessmentTemplate } from "../../types/assessment-template"
import { AssessmentQuestionPreview } from "./assessment-question-preview"

type AssessmentTemplatePreviewProps = {
  template: AssessmentTemplate
  sections: AssessmentSection[]
  questionsBySection: Map<string, AssessmentQuestion[]>
}

export function AssessmentTemplatePreview({
  template,
  sections,
  questionsBySection,
}: AssessmentTemplatePreviewProps) {
  const visibleSections = sections.filter(
    (section) => section.active
  )

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="rounded-xl border bg-card p-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          {template.name}
        </h1>

        <p className="mt-2 text-muted-foreground">
          {template.description ??
            "Avaliação sem descrição cadastrada."}
        </p>

        {template.instructions ? (
          <div className="mt-5 rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium">Instruções</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {template.instructions}
            </p>
          </div>
        ) : null}
      </div>

      {visibleSections.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">
            Este template ainda não possui seções ativas.
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Volte ao workspace e adicione o conteúdo da avaliação.
          </p>
        </div>
      ) : (
        visibleSections.map((section) => {
          const questions = (
            questionsBySection.get(section.id) ?? []
          ).filter((question) => question.active)

          return (
            <section
              key={section.id}
              className="space-y-5 rounded-xl border bg-card p-6"
            >
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {section.name}
                </h2>

                {section.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {section.description}
                  </p>
                ) : null}
              </div>

              {questions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhuma pergunta ativa nesta seção.
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <AssessmentQuestionPreview
                      key={question.id}
                      question={question}
                      index={index + 1}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground opacity-60"
        >
          Enviar avaliação
        </button>
      </div>
    </div>
  )
}
