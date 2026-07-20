import type {
  ActivityIntelligenceAIContext,
} from "@/features/timeline"

import type {
  ExecutiveAiContext,
  ExecutiveAiContextEntityType,
  ExecutiveAiContextMetric,
} from "../types"

export type CreateExecutiveAiContextInput = {
  entityType: ExecutiveAiContextEntityType
  entityId: string
  companyId: string
  title: string
  metrics: ExecutiveAiContextMetric[]
  metadata?: Record<string, string>
  activity: ActivityIntelligenceAIContext
}

export function createExecutiveAiContext({
  entityType,
  entityId,
  companyId,
  title,
  metrics,
  metadata = {},
  activity,
}: CreateExecutiveAiContextInput): ExecutiveAiContext {
  return {
    entityType,
    entityId,
    companyId,

    title,

    summary:
      activity.summary.description,

    metrics,

    insights:
      activity.insights.map(
        (insight) => ({
          type: insight.kind,
          title: insight.title,
          description:
            insight.description,
        })
      ),

    recommendations:
      activity.insights.flatMap(
        (insight) =>
          insight.recommendedActions.map(
            (action) => ({
              title: action.label,
              description:
                action.description ??
                "",
            })
          )
      ),

    timeline:
      activity.insights.map(
        (insight) => ({
          title: insight.title,
          description:
            insight.description,
          occurredAt:
            insight.occurredAt,
        })
      ),

    metadata,
  }
}
