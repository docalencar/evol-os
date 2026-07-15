import type { ProductPriority } from "@/components/product"

import type { AssessmentViewModel } from "../view-models/assessment-view-model"
import { presentAssessmentPriority } from "./assessment-priority-presenter"
import { presentAssessmentSummary } from "./assessment-summary-presenter"

export type AssessmentHomeMetric = {
  title: string
  value: number
}

export type AssessmentHomeViewModel = {
  priority: ProductPriority | null
  metrics: AssessmentHomeMetric[]
  insights: string[]
}

export function presentAssessmentHome(
  assessments: AssessmentViewModel[]
): AssessmentHomeViewModel {
  const summary = presentAssessmentSummary(assessments)
  const priority = presentAssessmentPriority(assessments)

  const insights =
    assessments.length === 0
      ? [
          "Nenhuma avaliação cadastrada.",
          "Crie sua primeira avaliação para iniciar o acompanhamento.",
          "Utilize modelos para padronizar as avaliações.",
        ]
      : [
          `${summary.active} avaliação(ões) em andamento.`,
          `${summary.scheduled} avaliação(ões) agendada(s).`,
          `${summary.completed} avaliação(ões) concluída(s).`,
        ]

  return {
    priority,
    metrics: [
      {
        title: "Ativas",
        value: summary.active,
      },
      {
        title: "Agendadas",
        value: summary.scheduled,
      },
      {
        title: "Concluídas",
        value: summary.completed,
      },
      {
        title: "Total",
        value: summary.total,
      },
    ],
    insights,
  }
}
