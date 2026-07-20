import type {
  ProductPriority,
} from "@/components/product"

import type {
  AssessmentTemplate,
} from "../types/assessment-template"
import type {
  AssessmentViewModel,
} from "../view-models/assessment-view-model"
import {
  presentAssessmentPriority,
} from "./assessment-priority-presenter"
import {
  presentAssessmentSummary,
} from "./assessment-summary-presenter"

export type AssessmentHomeMetric = {
  title: string
  value: number
}

export type AssessmentHomeJourney =
  | {
      kind: "create-template"
      title: string
      description: string
    }
  | {
      kind: "create-assessment"
      title: string
      description: string
    }
  | {
      kind: "monitor-assessments"
      title: string
      description: string
    }

export type AssessmentHomeViewModel = {
  priority: ProductPriority | null
  metrics: AssessmentHomeMetric[]
  insights: string[]
  journey: AssessmentHomeJourney
}

function presentAssessmentJourney(
  assessments: AssessmentViewModel[],
  templates: AssessmentTemplate[]
): AssessmentHomeJourney {
  if (templates.length === 0) {
    return {
      kind: "create-template",
      title: "Crie seu primeiro modelo de avaliação",
      description:
        "O modelo reúne as seções e perguntas que serão reutilizadas nas avaliações da empresa.",
    }
  }

  if (assessments.length === 0) {
    return {
      kind: "create-assessment",
      title: "Crie sua primeira avaliação",
      description:
        "Escolha um modelo, defina o período e selecione quem participará da avaliação.",
    }
  }

  return {
    kind: "monitor-assessments",
    title: "Acompanhe as avaliações em andamento",
    description:
      "Confira prazos, respostas pendentes e o progresso de cada avaliação na tabela abaixo.",
  }
}

export function presentAssessmentHome(
  assessments: AssessmentViewModel[],
  templates: AssessmentTemplate[]
): AssessmentHomeViewModel {
  const summary =
    presentAssessmentSummary(assessments)

  const priority =
    presentAssessmentPriority(assessments)

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
    journey: presentAssessmentJourney(
      assessments,
      templates
    ),
  }
}
