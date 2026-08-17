import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { z } from "zod"

import {
  AssessmentTemplatePreview,
} from "@/features/assessments"
import { getAssessmentTemplateStructureReadModel } from "@/features/assessment-feedback-read"
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

  const { template, sections, questions } =
    await getAssessmentTemplateStructureReadModel(
      companyId,
      assessmentTemplateId
    )

  if (!template) {
    notFound()
  }

  const questionsBySection = new Map(
    sections.map((section) => [
      section.id,
      questions.filter((question) =>
        question.assessment_section_id === section.id
      ),
    ])
  )

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
