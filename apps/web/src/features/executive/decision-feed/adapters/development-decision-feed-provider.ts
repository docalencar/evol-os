import type { DevelopmentExecutiveDashboard } from "@/features/development/types/development-executive-dashboard"
import type { DashboardCompetencyDevelopmentItem } from "@/features/dashboard-read/types/dashboard-competency-development"

import type { DecisionFeedProvider } from "../aggregators"
import type {
  DecisionFeedDTO,
  DecisionFeedItemDTO,
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

    const priorityItems = dashboard.competencyDevelopment.priorities
      .map(mapCanonicalCompetencyDeficiency)

    const cancelledPlansItem =
      createCancelledPlansItem(
        dashboard.kpis.cancelledPlans,
        this.generatedAt,
      )

    return Object.freeze({
      generatedAt: this.generatedAt,
      items: Object.freeze([
        ...priorityItems,
        ...(cancelledPlansItem
          ? [cancelledPlansItem]
          : []),
      ]),
    })
  }
}

function mapCanonicalCompetencyDeficiency(
  deficiency: DashboardCompetencyDevelopmentItem,
): DecisionFeedItemDTO {
  return Object.freeze({
    id: `development-competency-deficiency:${deficiency.personId}:${deficiency.competencyId}`,
    source: "development",
    category: "recommendation",
    priority: "medium",
    title: `Desenvolvimento: ${deficiency.personName}`,
    description: `${deficiency.competencyName}: deficiência de ${deficiency.gap}.`,
    occurredAt: null,
    href: `/app/people/${deficiency.personId}`,
    badges: Object.freeze([
      "Deficiência",
      `Gap ${deficiency.gap}`,
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
