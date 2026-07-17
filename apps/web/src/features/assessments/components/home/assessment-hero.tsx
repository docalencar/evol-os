import {
  PageHero,
} from "@/components/product"
import {
  AssessmentCycleCreateDialog,
} from "@/features/assessments"

import type {
  AssessmentTemplate,
} from "@/features/assessments"

type AssessmentHeroProps = {
  companyId: string
  templates: AssessmentTemplate[]
}

export function AssessmentHero({
  companyId,
  templates,
}: AssessmentHeroProps) {
  return (
    <PageHero
      eyebrow="Gestão de desempenho"
      title="Avaliações de desempenho"
      description="Crie avaliações estruturadas, acompanhe as respostas e transforme os resultados em desenvolvimento para colaboradores e líderes."
      estimatedTime="cerca de 5 minutos para configurar"
      primaryAction={
        <AssessmentCycleCreateDialog
          companyId={companyId}
          templates={templates}
          triggerLabel="✨ Nova avaliação"
          triggerClassName="shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
        />
      }
    />
  )
}
