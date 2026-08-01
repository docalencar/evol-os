import type { DevelopmentExecutiveDashboard } from "@/features/development/types/development-executive-dashboard"
import type { DevelopmentPriority } from "@/features/talent/types/development-priority"

import type { DecisionFeedProvider } from "../aggregators"
import type {
  DecisionFeedDTO,
  DecisionFeedItemDTO,
  DecisionFeedPriority,
} from "../types"

export type DevelopmentExecutiveDashboardSource = Readonly<{
  load(): Promise<DevelopmentExecutiveDashboard>
}>

export class DevelopmentDecisionFeedProvider
  implements DecisionFeedProvider
{
  readonly key = "development"

  constructor(
    private readonly generatedAt: string,
    private readonly source: DevelopmentExecutiveDashboardSource,
  ) {}

  async load(): Promise<DecisionFeedDTO> {
    const dashboard = await this.source.load()

    const priorityItems = dashboard.developmentPriorities
      .filter((priority) => priority.risk !== "low")
      .map(mapDevelopmentPriority)

    const cancelledPlansItem =
      createCancelledPlansItem(
        dashboard.kpis.cancelledPlans,
        this.generatedAt,
      )

    const competencyGapItem =
      createLargestCompetencyGapItem(
        dashboard.competencyGaps,
        this.generatedAt,
      )

    return Object.freeze({
      generatedAt: this.generatedAt,
      items: Object.freeze([
        ...priorityItems,
        ...(cancelledPlansItem
          ? [cancelledPlansItem]
          : []),
        ...(competencyGapItem
          ? [competencyGapItem]
          : []),
      ]),
    })
  }
}

function mapDevelopmentPriority(
  priority: DevelopmentPriority,
): DecisionFeedItemDTO {
  const gapDescription = priority.biggestGap
    ? `Maior gap identificado: ${priority.biggestGap}.`
    : "Maior gap não identificado."

  return Object.freeze({
    id: `development-priority:${priority.employeeId}`,
    source: "development",
    category: "people",
    priority: mapRiskToPriority(priority.risk),
    title: `Desenvolvimento: ${priority.employeeName}`,
    description: [
      `${priority.criticalGaps} gap(s) crítico(s)`,
      `${priority.attentionGaps} gap(s) em atenção.`,
      gapDescription,
    ].join(" "),
    occurredAt: null,
    href: `/app/people/${priority.employeeId}`,
    badges: Object.freeze([
      getRiskLabel(priority.risk),
      `${priority.criticalGaps} críticos`,
      `${priority.attentionGaps} em atenção`,
    ]),
  })
}

function createCancelledPlansItem(
  cancelledPlans: number,
  generatedAt: string,
): DecisionFeedItemDTO | null {
  if (cancelledPlans === 0) {
    return null
  }

  return Object.freeze({
    id: "development:cancelled-plans",
    source: "development",
    category: "alert",
    priority: "medium",
    title: "Planos de desenvolvimento cancelados",
    description:
      `${cancelledPlans} plano(s) de desenvolvimento estão com status cancelado.`,
    occurredAt: generatedAt,
    href: "/app/development",
    badges: Object.freeze([
      `${cancelledPlans} cancelados`,
    ]),
  })
}

function createLargestCompetencyGapItem(
  gaps: DevelopmentExecutiveDashboard["competencyGaps"],
  generatedAt: string,
): DecisionFeedItemDTO | null {
  const largestGap = [...gaps]
    .filter(
      (gap) =>
        gap.affectedEmployees > 0 &&
        gap.worstGap > 0,
    )
    .sort(
      (left, right) =>
        right.worstGap - left.worstGap ||
        right.affectedEmployees -
          left.affectedEmployees ||
        left.competencyId.localeCompare(
          right.competencyId,
        ),
    )
    .at(0)

  if (!largestGap) {
    return null
  }

  return Object.freeze({
    id: `development-competency-gap:${largestGap.competencyId}`,
    source: "development",
    category: "recommendation",
    priority: "medium",
    title:
      `Gap de competência: ${largestGap.competencyName}`,
    description:
      `${largestGap.affectedEmployees} colaborador(es) são afetados. ` +
      `Gap médio: ${largestGap.averageGap}. ` +
      `Maior gap: ${largestGap.worstGap}.`,
    occurredAt: generatedAt,
    href: "/app/development",
    badges: Object.freeze([
      `${largestGap.affectedEmployees} afetados`,
      `Gap máximo ${largestGap.worstGap}`,
    ]),
  })
}

function mapRiskToPriority(
  risk: DevelopmentPriority["risk"],
): DecisionFeedPriority {
  switch (risk) {
    case "high":
      return "critical"

    case "medium":
      return "high"

    case "low":
      return "low"
  }
}

function getRiskLabel(
  risk: DevelopmentPriority["risk"],
): string {
  switch (risk) {
    case "high":
      return "Risco alto"

    case "medium":
      return "Risco médio"

    case "low":
      return "Risco baixo"
  }
}