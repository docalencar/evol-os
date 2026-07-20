import { notFound } from "next/navigation"

import {
  AssessmentExecutionWorkspace,
  AssessmentFeedbackCard,
  getAssessmentAnswers,
  getAssessmentFeedback,
  getAssessmentResponseWorkspace,
  getAssessmentTemplateById,
  presentAssessmentFeedback,
  type AssessmentAnswer,
  type AssessmentQuestion,
  type AssessmentSection,
  type AssessmentTemplate,
} from "@/features/assessments"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function AssessmentResponsePage({
  params,
}: Props) {
  const { companyId } =
    await getCurrentCompanyContext()

  const { id } = await params

  try {
    const workspace =
      await getAssessmentResponseWorkspace(
        companyId,
        id
      )

    const [templateData, answersData] =
      await Promise.all([
        getAssessmentTemplateById(
          companyId,
          workspace.response.assessment_template_id
        ),
        getAssessmentAnswers(
          companyId,
          workspace.response.id
        ),
      ])

    if (!templateData) {
      notFound()
    }

    const template =
      templateData as AssessmentTemplate

    const sections =
      workspace.sections as AssessmentSection[]

    const questions =
      workspace.questions as AssessmentQuestion[]

    const answers =
      (answersData ?? []) as AssessmentAnswer[]

    const questionsBySection = new Map<
      string,
      AssessmentQuestion[]
    >(
      sections.map((section) => [
        section.id,
        questions.filter(
          (question) =>
            question.assessment_section_id ===
            section.id
        ),
      ])
    )

    const showFeedback =
      workspace.response.status === "submitted" ||
      workspace.response.status === "completed"

    const feedback = showFeedback
      ? presentAssessmentFeedback(
          getAssessmentFeedback(
            sections,
            questions,
            answers
          )
        )
      : null

    return (
      <div className="space-y-8">
        {feedback ? (
          <AssessmentFeedbackCard
            feedback={feedback}
          />
        ) : null}

        <AssessmentExecutionWorkspace
          companyId={companyId}
          assessmentResponseId={workspace.response.id}
          responseStatus={workspace.response.status}
          template={template}
          sections={sections}
          questionsBySection={questionsBySection}
          answers={answers}
        />
      </div>
    )
  } catch {
    notFound()
  }
}
