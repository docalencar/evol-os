import { DashboardSection } from "@/components/dashboard"
import {
  ProductActionPanel,
  ProductInsightList,
  ProductMetricGrid,
} from "@/components/product"

import {
  AssessmentCycleTable,
  AssessmentTemplateCreateDialog,
  AssessmentTemplateOverviewCard,
  AssessmentTemplateTable,
  presentAssessmentHome,
  presentAssessments,
  type AssessmentCycle,
  type AssessmentTemplate,
} from "@/features/assessments"

import { AssessmentHero } from "./assessment-hero"
import { AssessmentPriorityCard } from "./assessment-priority-card"

type AssessmentHomeProps = {
  companyId: string
  cycles: AssessmentCycle[]
  templates: AssessmentTemplate[]
}

export function AssessmentHome({
  companyId,
  cycles,
  templates,
}: AssessmentHomeProps) {
  const assessments = presentAssessments(cycles)
  const home = presentAssessmentHome(assessments)

  return (
    <div className="space-y-8">
      <AssessmentHero
        companyId={companyId}
        templates={templates}
      />

      <AssessmentPriorityCard priority={home.priority} />

      <ProductMetricGrid metrics={home.metrics} />

      <ProductActionPanel
        title="Ações rápidas"
        actions={[
          {
            id: "new-template",
            label: "Novo Modelo",
            action: (
              <AssessmentTemplateCreateDialog
                companyId={companyId}
              />
            ),
          },
        ]}
      />

      <ProductInsightList
        title="Insights"
        insights={home.insights}
      />

      <DashboardSection
        title="Avaliações"
        description="Acompanhe o planejamento e a execução das avaliações."
      >
        <AssessmentCycleTable
          cycles={cycles}
          templates={templates}
        />
      </DashboardSection>

      <DashboardSection
        title="Modelos de avaliação"
        description="Modelos reutilizáveis para toda a empresa."
      >
        <div className="space-y-6">
          <AssessmentTemplateOverviewCard
            templates={templates}
          />

          <AssessmentTemplateTable
            templates={templates}
          />
        </div>
      </DashboardSection>
    </div>
  )
}
