import type {
  ProductPriority,
} from "@/components/product"

import type {
  AssessmentViewModel,
} from "../view-models/assessment-view-model"

export function presentAssessmentPriority(
  assessments: AssessmentViewModel[]
): ProductPriority | null {
  const active =
    assessments.find(
      (assessment) => assessment.status === "active"
    )

  if (active) {
    return {
      title: "Sua prioridade hoje",
      message: `"${active.title}" está em andamento (${active.periodLabel}).`,
      severity: "warning",
      actionLabel: "Abrir avaliação",
    }
  }

  const scheduled =
    assessments.find(
      (assessment) => assessment.status === "scheduled"
    )

  if (scheduled) {
    return {
      title: "Próxima avaliação",
      message: `"${scheduled.title}" começa em breve (${scheduled.periodLabel}).`,
      severity: "info",
      actionLabel: "Ver planejamento",
    }
  }

  return null
}
