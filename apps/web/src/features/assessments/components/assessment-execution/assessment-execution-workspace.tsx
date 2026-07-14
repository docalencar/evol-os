import type { AssessmentAnswer } from "../../types/assessment-answer"
import type { AssessmentQuestion } from "../../types/assessment-question"
import type { AssessmentSection } from "../../types/assessment-section"
import type { AssessmentTemplate } from "../../types/assessment-template"
import { createAssessmentExecutionViewModel } from "../../services/create-assessment-execution-view-model"
import { AssessmentFooter } from "./assessment-footer"
import { AssessmentProgressCard } from "./assessment-progress-card"
import { AssessmentQuestionCard } from "./assessment-question-card"
import { AssessmentSectionAccordion } from "./assessment-section-accordion"
import { AssessmentSidebar } from "./assessment-sidebar"

type AssessmentExecutionWorkspaceProps = {
  companyId: string
  assessmentResponseId: string
  template: AssessmentTemplate
  sections: AssessmentSection[]
  questionsBySection: Map<string, AssessmentQuestion[]>
  answers: AssessmentAnswer[]
}

export function AssessmentExecutionWorkspace({
  companyId,
  assessmentResponseId,
  template,
  sections,
  questionsBySection,
  answers,
}: AssessmentExecutionWorkspaceProps) {
  const allQuestions = Array.from(
    questionsBySection.values()
  ).flat()

  const viewModel =
    createAssessmentExecutionViewModel({
      companyId,
      assessmentResponseId,
      template,
      sections,
      questions: allQuestions,
      questionsBySection,
      answers,
      currentSection: sections.length > 0 ? 1 : 0,
      totalSections: sections.length,
    })

  return (
    <div className="space-y-8">
      <AssessmentProgressCard
        title={viewModel.title}
        description={viewModel.description}
        answered={viewModel.answered}
        total={viewModel.total}
        currentSection={viewModel.currentSection}
        totalSections={viewModel.totalSections}
        estimatedMinutes={viewModel.estimatedMinutes}
        status={viewModel.status}
      />

      <div className="flex items-start gap-8">

        <AssessmentSidebar
          sections={sections}
          questionsBySection={questionsBySection}
          answers={answers}
        />

        <main className="min-w-0 flex-1 space-y-8">

          {sections.map((section, sectionIndex) => {
        const questions =
          questionsBySection.get(section.id) ?? []

        const questionIds = new Set(
          questions.map((question) => question.id)
        )

        const answeredInSection = answers.filter((answer) =>
          questionIds.has(answer.assessment_question_id)
        ).length

        return (
          <div
            id={`section-${section.id}`}
            key={section.id}
          >
            <AssessmentSectionAccordion
            title={section.name}
            description={section.description}
            answered={answeredInSection}
            total={questions.length}
            defaultOpen={sectionIndex === 0}
          >
            {questions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhuma pergunta ativa nesta seção.
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((question) => (
                  <AssessmentQuestionCard
                    key={question.id}
                    companyId={companyId}
                    assessmentResponseId={assessmentResponseId}
                    question={question}
                    answer={answers.find(
                      (answer) =>
                        answer.assessment_question_id ===
                        question.id
                    )}
                  />
                ))}
              </div>
            )}
            </AssessmentSectionAccordion>
          </div>
        )
          })}

        </main>

      </div>


      <AssessmentFooter
        companyId={viewModel.companyId}
        assessmentResponseId={viewModel.assessmentResponseId}
        answered={viewModel.answered}
        total={viewModel.total}
        canSubmit={viewModel.canSubmit}
        missingRequired={viewModel.missingRequired}
      />

    </div>
  )
}
