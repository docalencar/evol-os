import Link from "next/link"
import { redirect } from "next/navigation"

import { z } from "zod"

import {
  AssessmentExecutionWorkspace,
  getAssessmentAnswers,
  getAssessmentQuestions,
  getAssessmentResponseById,
  getAssessmentSections,
  getAssessmentTemplateById,
  type AssessmentAnswer,
  type AssessmentQuestion,
  type AssessmentResponse,
  type AssessmentSection,
  type AssessmentTemplate,
} from "@/features/assessments"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type AssessmentResponsePageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function AssessmentResponsePage({
  params,
}: AssessmentResponsePageProps) {
  const { id } = await params

  const responseIdResult = z.string().uuid().safeParse(id)

  if (!responseIdResult.success) {
    redirect("/app/assessments")
  }

  const { companyId } = await getCurrentCompanyContext()

  const responseData = await getAssessmentResponseById(
    companyId,
    responseIdResult.data
  )

  if (!responseData) {
    redirect("/app/assessments")
  }

  const response = responseData as AssessmentResponse

  const [templateData, sectionsData, answersData] =
    await Promise.all([
      getAssessmentTemplateById(
        companyId,
        response.assessment_template_id
      ),
      getAssessmentSections(
        companyId,
        response.assessment_template_id
      ),
      getAssessmentAnswers(companyId, response.id),
    ])

  if (!templateData) {
    redirect("/app/assessments")
  }

  const template = templateData as AssessmentTemplate
  const sections = (sectionsData ?? []) as AssessmentSection[]
  const answers = (answersData ?? []) as AssessmentAnswer[]

  const questionEntries = await Promise.all(
    sections.map(async (section) => {
      const questionsData = await getAssessmentQuestions(
        companyId,
        section.id
      )

      return [
        section.id,
        (questionsData ?? []) as AssessmentQuestion[],
      ] as const
    })
  )

  const questionsBySection = new Map(questionEntries)

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link
        href="/app/assessments"
        className="text-sm underline"
      >
        ← Voltar
      </Link>

      <AssessmentExecutionWorkspace
        companyId={companyId}
        assessmentResponseId={response.id}
        template={template}
        sections={sections}
        questionsBySection={questionsBySection}
        answers={answers}
      />
    </div>
  )
}
