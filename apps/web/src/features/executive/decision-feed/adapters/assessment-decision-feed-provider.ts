import type { AssessmentExecutiveDashboard } from "@/features/assessments/types/assessment-executive-dashboard"

import type { DecisionFeedProvider } from "../aggregators"
import type {
  DecisionFeedDTO,
  DecisionFeedItemDTO,
  DecisionFeedPriority,
} from "../types"

export type AssessmentExecutiveDashboardSource = Readonly<{
  load(): Promise<AssessmentExecutiveDashboard>
}>

export class AssessmentDecisionFeedProvider
  implements DecisionFeedProvider
{
  readonly key = "assessments"

  constructor(
    private readonly generatedAt: string,
    private readonly source: AssessmentExecutiveDashboardSource,
  ) {}

  async load(): Promise<DecisionFeedDTO> {
    const dashboard = await this.source.load()

    const activeItems =
      dashboard.activeAssessments.map(
        (assessment) =>
          mapActiveAssessment(
            assessment,
            this.generatedAt,
          ),
      )

    const scheduledItems =
      dashboard.scheduledAssessments.map(
        mapScheduledAssessment,
      )

    const cancelledItem =
      createCancelledAssessmentsItem(
        dashboard.summary.cancelled,
        this.generatedAt,
      )

    return Object.freeze({
      generatedAt: this.generatedAt,
      items: Object.freeze([
        ...activeItems,
        ...scheduledItems,
        ...(cancelledItem ? [cancelledItem] : []),
      ]),
    })
  }
}

function mapActiveAssessment(
  assessment: AssessmentExecutiveDashboard["activeAssessments"][number],
  generatedAt: string,
): DecisionFeedItemDTO {
  return Object.freeze({
    id: `assessment-active:${assessment.id}`,
    source: "assessment",
    category: "people",
    priority: resolveActivePriority(
      assessment.endDate,
      generatedAt,
    ),
    title: `Avaliação em andamento: ${assessment.title}`,
    description:
      `Período: ${assessment.periodLabel}. ` +
      `Tipo: ${assessment.typeLabel}.`,
    occurredAt: assessment.startDate,
    href: `/app/assessments/cycles/${assessment.id}`,
    badges: Object.freeze([
      assessment.statusLabel,
      assessment.typeLabel,
    ]),
  })
}

function mapScheduledAssessment(
  assessment: AssessmentExecutiveDashboard["scheduledAssessments"][number],
): DecisionFeedItemDTO {
  return Object.freeze({
    id: `assessment-scheduled:${assessment.id}`,
    source: "assessment",
    category: "recommendation",
    priority: "medium",
    title: `Avaliação agendada: ${assessment.title}`,
    description:
      `Início previsto em ${assessment.startDate}. ` +
      `Período: ${assessment.periodLabel}.`,
    occurredAt: assessment.startDate,
    href: `/app/assessments/cycles/${assessment.id}`,
    badges: Object.freeze([
      assessment.statusLabel,
      assessment.typeLabel,
    ]),
  })
}

function createCancelledAssessmentsItem(
  cancelled: number,
  generatedAt: string,
): DecisionFeedItemDTO | null {
  if (cancelled === 0) {
    return null
  }

  return Object.freeze({
    id: "assessments:cancelled",
    source: "assessment",
    category: "alert",
    priority: "medium",
    title: "Avaliações canceladas",
    description:
      `${cancelled} avaliação(ões) estão com status cancelado.`,
    occurredAt: generatedAt,
    href: "/app/assessments",
    badges: Object.freeze([
      `${cancelled} canceladas`,
    ]),
  })
}

function resolveActivePriority(
  endDate: string,
  generatedAt: string,
): DecisionFeedPriority {
  const end = new Date(`${endDate}T23:59:59.999Z`)
  const now = new Date(generatedAt)

  if (Number.isNaN(end.getTime())) {
    return "high"
  }

  const remainingDays = Math.ceil(
    (end.getTime() - now.getTime()) /
      86_400_000,
  )

  if (remainingDays < 0) {
    return "critical"
  }

  if (remainingDays <= 7) {
    return "high"
  }

  return "medium"
}
