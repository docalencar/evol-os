import Link from "next/link"
import { redirect } from "next/navigation"

import { z } from "zod"

import { DashboardSection } from "@/components/dashboard"
import { PageHeader } from "@/components/shared/page-header"
import {
  ASSESSMENT_TEMPLATE_STATUS_LABELS,
  ASSESSMENT_TEMPLATE_TYPE_LABELS,
  AssessmentSectionCreateDialog,
  AssessmentSectionOverviewCard,
  AssessmentSectionTable,
  AssessmentTemplateEditDialog,
  getAssessmentSections,
  getAssessmentTemplateById,
  type AssessmentSection,
  type AssessmentTemplate,
} from "@/features/assessments"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type AssessmentTemplateDetailsPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function AssessmentTemplateDetailsPage({
  params,
}: AssessmentTemplateDetailsPageProps) {
  const { id } = await params

  const templateIdResult = z.string().uuid().safeParse(id)

  if (!templateIdResult.success) {
    redirect("/app/assessments")
  }

  const assessmentTemplateId = templateIdResult.data
  const { companyId } = await getCurrentCompanyContext()

  const [template, sectionsData] = await Promise.all([
    getAssessmentTemplateById(companyId, assessmentTemplateId),
    getAssessmentSections(companyId, assessmentTemplateId),
  ])

  if (!template) {
    redirect("/app/assessments")
  }

  const assessmentTemplate = template as AssessmentTemplate
  const sections = (sectionsData ?? []) as AssessmentSection[]

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/app/assessments"
          className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          Voltar para avaliações
        </Link>
      </div>

      <PageHeader
        title={assessmentTemplate.name}
        description={
          assessmentTemplate.description ??
          "Template sem descrição cadastrada."
        }
        actions={
          <AssessmentTemplateEditDialog
            companyId={companyId}
            template={assessmentTemplate}
          />
        }
      />

      <DashboardSection
        title="Visão geral"
        description={`${ASSESSMENT_TEMPLATE_TYPE_LABELS[assessmentTemplate.type]} · ${ASSESSMENT_TEMPLATE_STATUS_LABELS[assessmentTemplate.status]}`}
      >
        <AssessmentSectionOverviewCard sections={sections} />
      </DashboardSection>

      <DashboardSection
        title="Seções"
        description="Organize as perguntas do template em blocos de avaliação."
        actions={
          <AssessmentSectionCreateDialog
            companyId={companyId}
            assessmentTemplateId={assessmentTemplate.id}
            defaultDisplayOrder={sections.length}
          />
        }
      >
        <AssessmentSectionTable
          companyId={companyId}
          sections={sections}
        />
      </DashboardSection>
    </div>
  )
}
