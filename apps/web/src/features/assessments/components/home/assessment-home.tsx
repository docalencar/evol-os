import {
  DashboardSection,
} from "@/components/dashboard"
import {
  NextStepCard,
  ProductActionPanel,
  ProductInsight,
  ProductInsightList,
  ProductMetricGrid,
} from "@/components/product"

import {
  AssessmentCycleCreateDialog,
  AssessmentCycleTable,
  AssessmentTemplateCreateDialog,
  AssessmentTemplateOverviewCard,
  AssessmentTemplateTable,
  presentAssessmentHome,
  presentAssessments,
  type AssessmentCycle,
  type AssessmentTemplate,
} from "@/features/assessments"

import {
  AssessmentHero,
} from "./assessment-hero"
import {
  AssessmentPriorityCard,
} from "./assessment-priority-card"

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
  const assessments =
    presentAssessments(cycles)

  const home =
    presentAssessmentHome(
      assessments,
      templates
    )

  const journeyAction =
    home.journey.kind === "create-template" ? (
      <AssessmentTemplateCreateDialog
        companyId={companyId}
      />
    ) : home.journey.kind ===
      "create-assessment" ? (
      <AssessmentCycleCreateDialog
        companyId={companyId}
        templates={templates}
        triggerLabel="Criar avaliação"
        triggerClassName="shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
      />
    ) : undefined

  return (
    <div className="space-y-8">
      <AssessmentHero
        companyId={companyId}
        templates={templates}
      />

      <ProductInsight
        variant="tip"
        title="Comece com uma avaliação simples"
      >
        Crie um modelo com perguntas claras e
        organizadas por tema. Você poderá aprimorar
        a estrutura conforme sua empresa ganhar
        experiência com o processo.
      </ProductInsight>

      <NextStepCard
        title={home.journey.title}
        description={home.journey.description}
        action={journeyAction}
      />

      <AssessmentPriorityCard
        priority={home.priority}
      />

      <ProductMetricGrid
        metrics={home.metrics}
      />

      <ProductActionPanel
        title="Ações rápidas"
        actions={[
          {
            id: "new-template",
            label: "Novo modelo",
            action: (
              <AssessmentTemplateCreateDialog
                companyId={companyId}
              />
            ),
          },
          {
            id: "new-assessment",
            label: "Nova avaliação",
            action: (
              <AssessmentCycleCreateDialog
                companyId={companyId}
                templates={templates}
                triggerLabel="Nova avaliação"
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
