import { notFound } from "next/navigation"

import {
  AssessmentExecutionWorkspace,
  getAssessmentAnswers,
  getAssessmentResponseWorkspace,
  getAssessmentTemplateById,
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

    return (
      <AssessmentExecutionWorkspace
        companyId={companyId}
        assessmentResponseId={workspace.response.id}
        responseStatus={workspace.response.status}
        template={template}
        sections={sections}
        questionsBySection={questionsBySection}
        answers={answers}
      />
    )
  } catch {
    notFound()
  }
}
