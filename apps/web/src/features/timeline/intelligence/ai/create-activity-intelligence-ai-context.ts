import type {
  ActivityIntelligenceCategory,
  ActivityIntelligencePriority,
  ActivityIntelligenceViewModel,
  ActivityRecommendedActionType,
} from "../types"

export type ActivityIntelligenceAIActionContext = {
  type: ActivityRecommendedActionType
  label: string
  description: string | null
  href: string | null
  entityType: string | null
  entityId: string | null
}

export type ActivityIntelligenceAIInsightContext = {
  priority: ActivityIntelligencePriority
  category: ActivityIntelligenceCategory
  kind:
    | "alert"
    | "risk"
    | "opportunity"
    | "trend"
    | "recommendation"
    | "summary"
  title: string
  description: string
  reason: string | null
  occurredAt: string
  entityType: string | null
  entityId: string | null
  subjectType: string | null
  subjectId: string | null
  activityIds: string[]
  recommendedActions:
    ActivityIntelligenceAIActionContext[]
}

export type ActivityIntelligenceAIContext = {
  purpose:
    "activity_intelligence_executive_analysis"
  generatedAt: string
  period: {
    start: string | null
    end: string | null
  }
  summary: {
    headline: string
    description: string
    totalActivities: number
    totalInsights: number
    criticalInsights: number
    highPriorityInsights: number
    mediumPriorityInsights: number
    lowPriorityInsights: number
    informationalInsights: number
  }
  insights: ActivityIntelligenceAIInsightContext[]
  source: {
    activityIds: string[]
    activityTypes: string[]
    modules: string[]
    entityTypes: string[]
  }
  instructions: string[]
}

export type CreateActivityIntelligenceAIContextInput = {
  intelligence: ActivityIntelligenceViewModel
  maxInsights?: number
}

function uniqueValues(
  values: Array<string | null | undefined>
) {
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          Boolean(value)
      )
    )
  )
}

export function createActivityIntelligenceAIContext({
  intelligence,
  maxInsights = 10,
}: CreateActivityIntelligenceAIContextInput): ActivityIntelligenceAIContext {
  const insights =
    intelligence.insights
      .slice(0, maxInsights)
      .map((insight) => ({
        priority: insight.priority,
        category: insight.category,
        kind: insight.kind,
        title: insight.title,
        description: insight.description,
        reason: insight.reason,
        occurredAt: insight.occurredAt,
        entityType: insight.entityType,
        entityId: insight.entityId,
        subjectType: insight.subjectType,
        subjectId: insight.subjectId,
        activityIds:
          insight.activityIds.slice(),
        recommendedActions:
          insight.recommendedActions.map(
            (action) => ({
              type: action.type,
              label: action.label,
              description:
                action.description,
              href: action.href,
              entityType:
                action.entityType,
              entityId: action.entityId,
            })
          ),
      }))

  return {
    purpose:
      "activity_intelligence_executive_analysis",
    generatedAt:
      intelligence.generatedAt,
    period: {
      start:
        intelligence.summary
          .periodStart,
      end:
        intelligence.summary.periodEnd,
    },
    summary: {
      headline:
        intelligence.summary.headline,
      description:
        intelligence.summary
          .description,
      totalActivities:
        intelligence.summary
          .totalActivities,
      totalInsights:
        intelligence.summary
          .totalInsights,
      criticalInsights:
        intelligence.summary
          .criticalInsights,
      highPriorityInsights:
        intelligence.summary
          .highPriorityInsights,
      mediumPriorityInsights:
        intelligence.summary
          .mediumPriorityInsights,
      lowPriorityInsights:
        intelligence.summary
          .lowPriorityInsights,
      informationalInsights:
        intelligence.summary
          .informationalInsights,
    },
    insights,
    source: {
      activityIds: uniqueValues(
        intelligence.sourceActivities.map(
          (activity) => activity.id
        )
      ),
      activityTypes: uniqueValues(
        intelligence.sourceActivities.map(
          (activity) =>
            activity.activityType
        )
      ),
      modules: uniqueValues(
        intelligence.sourceActivities.map(
          (activity) =>
            activity.module
        )
      ),
      entityTypes: uniqueValues(
        intelligence.sourceActivities.map(
          (activity) =>
            activity.entityType
        )
      ),
    },
    instructions: [
      "Use apenas as informações fornecidas neste contexto.",
      "Não invente fatos, pessoas, causas ou impactos não presentes nos dados.",
      "Diferencie claramente fatos registrados de interpretações.",
      "Priorize riscos críticos e de alta prioridade.",
      "Apresente recomendações práticas e compatíveis com as ações disponíveis.",
      "Não substitua decisões humanas sensíveis.",
      "Mantenha a análise objetiva, executiva e transparente.",
    ],
  }
}
