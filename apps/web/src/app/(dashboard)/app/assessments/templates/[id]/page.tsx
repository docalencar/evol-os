import Link from "next/link"
import { redirect } from "next/navigation"

import { z } from "zod"

import { DashboardSection } from "@/components/dashboard"
import { PageHeader } from "@/components/shared/page-header"
import {
  ASSESSMENT_TEMPLATE_STATUS_LABELS,
  ASSESSMENT_TEMPLATE_TYPE_LABELS,
  AssessmentQuestionCreateDialog,
  AssessmentQuestionTable,
  AssessmentSectionCreateDialog,
  AssessmentSectionOverviewCard,
  AssessmentTemplateEditDialog,
  getAssessmentQuestions,
  getAssessmentSections,
  getAssessmentTemplateById,
  type AssessmentQuestion,
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

  const [templateData, sectionsData] = await Promise.all([
    getAssessmentTemplateById(companyId, assessmentTemplateId),
    getAssessmentSections(companyId, assessmentTemplateId),
  ])

  if (!templateData) {
    redirect("/app/assessments")
  }

  const assessmentTemplate =
    templateData as AssessmentTemplate

  const sections = (sectionsData ?? []) as AssessmentSection[]

  const questionsBySectionEntries = await Promise.all(
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

  const questionsBySection = new Map(
    questionsBySectionEntries
  )

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
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/assessments/templates/${assessmentTemplate.id}/preview`}
              className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              Visualizar avaliação
            </Link>

            <AssessmentTemplateEditDialog
              companyId={companyId}
              template={assessmentTemplate}
            />
          </div>
        }
      />

      <DashboardSection
        title="Visão geral"
        description={`${ASSESSMENT_TEMPLATE_TYPE_LABELS[assessmentTemplate.type]} · ${ASSESSMENT_TEMPLATE_STATUS_LABELS[assessmentTemplate.status]}`}
      >
        <AssessmentSectionOverviewCard sections={sections} />
      </DashboardSection>

      <DashboardSection
        title="Seções e perguntas"
        description="Organize o conteúdo deste template em seções e perguntas."
        actions={
          <AssessmentSectionCreateDialog
            companyId={companyId}
            assessmentTemplateId={assessmentTemplate.id}
            defaultDisplayOrder={sections.length + 1}
          />
        }
      >
        {sections.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">
              Nenhuma seção cadastrada.
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Crie a primeira seção para começar a estruturar o
              template.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map((section) => {
              const questions =
                questionsBySection.get(section.id) ?? []

              return (
                <div
                  key={section.id}
                  className="rounded-lg border p-6"
                >
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {section.name}
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        {section.description ?? "Sem descrição"}
                      </p>
                    </div>

                    <AssessmentQuestionCreateDialog
                      companyId={companyId}
                      assessmentSectionId={section.id}
                      defaultDisplayOrder={questions.length + 1}
                    />
                  </div>

                  <AssessmentQuestionTable
                    companyId={companyId}
                    questions={questions}
                  />
                </div>
              )
            })}
          </div>
        )}
      </DashboardSection>
    </div>
  )
}
