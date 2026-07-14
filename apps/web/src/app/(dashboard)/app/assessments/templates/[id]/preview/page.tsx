import Link from "next/link"
import { redirect } from "next/navigation"

import { z } from "zod"

import {
  AssessmentTemplatePreview,
  getAssessmentQuestions,
  getAssessmentSections,
  getAssessmentTemplateById,
  type AssessmentQuestion,
  type AssessmentSection,
  type AssessmentTemplate,
} from "@/features/assessments"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type AssessmentTemplatePreviewPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function AssessmentTemplatePreviewPage({
  params,
}: AssessmentTemplatePreviewPageProps) {
  const { id } = await params

  const templateIdResult = z.string().uuid().safeParse(id)

  if (!templateIdResult.success) {
    redirect("/app/assessments")
  }

  const assessmentTemplateId = templateIdResult.data
  const { companyId } = await getCurrentCompanyContext()

  const [templateData, sectionsData] = await Promise.all([
    getAssessmentTemplateById(companyId, assessmentTemplateId),
    getAssessmentSections(companyId, assessmentTemplateId),
  ])

  if (!templateData) {
    redirect("/app/assessments")
  }

  const template = templateData as AssessmentTemplate
  const sections = (sectionsData ?? []) as AssessmentSection[]

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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/app/assessments/templates/${template.id}`}
          className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          Voltar para o template
        </Link>

        <span className="text-sm text-muted-foreground">
          Modo de visualização
        </span>
      </div>

      <AssessmentTemplatePreview
        template={template}
        sections={sections}
        questionsBySection={questionsBySection}
      />
    </div>
  )
}
