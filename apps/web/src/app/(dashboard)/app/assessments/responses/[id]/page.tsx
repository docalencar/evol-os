import { notFound } from "next/navigation"

import {
  AssessmentExecutionWorkspace,
  AssessmentFeedbackCard,
  getAssessmentFeedback,
  presentAssessmentFeedback,
  type AssessmentQuestion,
} from "@/features/assessments"
import { getAssessmentResponsePageReadModel } from "@/features/assessment-feedback-read"
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
      await getAssessmentResponsePageReadModel(
        companyId,
        id
      )

    if (!workspace) {
      notFound()
    }

    const { template, sections, questions, answers } = workspace

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
