import { DashboardSection } from "@/components/dashboard"
import { PageHeader } from "@/components/shared/page-header"
import {
  AssessmentCycleCreateDialog,
  AssessmentCycleOverviewCard,
  AssessmentCycleTable,
  AssessmentTemplateCreateDialog,
  AssessmentTemplateOverviewCard,
  AssessmentTemplateTable,
  getAssessmentCycles,
  getAssessmentTemplates,
  type AssessmentCycle,
  type AssessmentTemplate,
} from "@/features/assessments"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function AssessmentsPage() {
  const { companyId } = await getCurrentCompanyContext()

  const [cyclesData, templatesData] = await Promise.all([
    getAssessmentCycles(companyId),
    getAssessmentTemplates(companyId),
  ])

  const cycles = (cyclesData ?? []) as AssessmentCycle[]
  const templates = (templatesData ?? []) as AssessmentTemplate[]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Avaliações"
        description="Planeje ciclos de desempenho e mantenha templates reutilizáveis para toda a empresa."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AssessmentTemplateCreateDialog
              companyId={companyId}
            />

            <AssessmentCycleCreateDialog companyId={companyId} />
          </div>
        }
      />

      <DashboardSection
        title="Ciclos de avaliação"
        description="Acompanhe o planejamento e a execução das avaliações da empresa."
      >
        <div className="space-y-6">
          <AssessmentCycleOverviewCard cycles={cycles} />
          <AssessmentCycleTable cycles={cycles} />
        </div>
      </DashboardSection>

      <DashboardSection
        title="Templates de avaliação"
        description="Crie estruturas reutilizáveis para padronizar as avaliações."
      >
        <div className="space-y-6">
          <AssessmentTemplateOverviewCard
            templates={templates}
          />

          <AssessmentTemplateTable templates={templates} />
        </div>
      </DashboardSection>
    </div>
  )
}
