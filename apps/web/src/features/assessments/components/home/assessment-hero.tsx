import { AssessmentCycleCreateDialog } from "@/features/assessments"

import { ProductHero } from "@/components/product"

import type { AssessmentTemplate } from "@/features/assessments"

type AssessmentHeroProps = {
  companyId: string
  templates: AssessmentTemplate[]
}

export function AssessmentHero({
  companyId,
  templates,
}: AssessmentHeroProps) {
  return (
    <ProductHero
      title="Avaliações"
      description="Aplique avaliações, acompanhe respostas e desenvolva pessoas com apoio da inteligência do Evol OS."
      primaryAction={
        <AssessmentCycleCreateDialog
          companyId={companyId}
          templates={templates}
          triggerLabel="✨ Nova Avaliação"
        />
      }
    />
  )
}
