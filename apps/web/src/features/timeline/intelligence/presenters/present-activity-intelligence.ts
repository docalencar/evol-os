import type {
  ActivityTimelineItemViewModel,
} from "../../view-models/activity-timeline-item-view-model"

import type {
  ActivityIntelligenceCategory,
  ActivityIntelligenceInsight,
  ActivityIntelligencePriority,
  ActivityIntelligenceSummary,
  ActivityIntelligenceViewModel,
  ActivityRecommendedAction,
} from "../types"

export type PresentActivityIntelligenceInput = {
  activities: ActivityTimelineItemViewModel[]
  generatedAt?: string
}

type EntityActivityGroup = {
  key: string
  entityType: string
  entityId: string
  activities: ActivityTimelineItemViewModel[]
}

const PRIORITY_ORDER: Record<
  ActivityIntelligencePriority,
  number
> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  informational: 4,
}

function getCategory(
  activity: ActivityTimelineItemViewModel
): ActivityIntelligenceCategory {
  const value = [
    activity.module,
    activity.activityType,
    activity.entityType,
    activity.subjectType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  if (
    value.includes("employee") ||
    value.includes("people") ||
    value.includes("person")
  ) {
    return "people"
  }

  if (
    value.includes("department") ||
    value.includes("team") ||
    value.includes("position") ||
    value.includes("organization")
  ) {
    return "organization"
  }

  if (
    value.includes("leader") ||
    value.includes("manager") ||
    value.includes("leadership")
  ) {
    return "leadership"
  }

  if (
    value.includes("development") ||
    value.includes("competenc") ||
    value.includes("pdi")
  ) {
    return "development"
  }

  if (
    value.includes("assessment") ||
    value.includes("performance") ||
    value.includes("goal")
  ) {
    return "performance"
  }

  if (
    value.includes("engagement") ||
    value.includes("feedback") ||
    value.includes("survey")
  ) {
    return "engagement"
  }

  if (
    value.includes("compliance") ||
    value.includes("policy") ||
    value.includes("document")
  ) {
    return "compliance"
  }

  if (
    activity.actorType === "system" ||
    activity.actorType === "automation" ||
    activity.actorType === "integration"
  ) {
    return "system"
  }

  return "operations"
}

function getEntityHref(
  entityType: string | null,
  entityId: string | null
) {
  if (!entityType || !entityId) {
    return null
  }

  switch (entityType) {
    case "employee":
    case "person":
      return `/app/people/${entityId}`

    case "department":
      return `/app/company/departments/${entityId}`

    case "team":
      return `/app/company/teams/${entityId}`

    case "position":
      return `/app/company/positions/${entityId}`

    default:
      return null
  }
}

function createOpenEntityAction(
  activity: ActivityTimelineItemViewModel
): ActivityRecommendedAction[] {
  const href = getEntityHref(
    activity.entityType,
    activity.entityId
  )

  if (!href) {
    return []
  }

  return [
    {
      id: `open-entity:${activity.id}`,
      type: "open_entity",
      label: "Abrir registro",
      description:
        "Acesse o registro relacionado para consultar os detalhes.",
      href,
      entityType: activity.entityType,
      entityId: activity.entityId,
    },
  ]
}

function createArchivedInsight(
  activity: ActivityTimelineItemViewModel
): ActivityIntelligenceInsight {
  return {
    id: `archived:${activity.id}`,
    kind: "alert",
    priority: "high",
    category: getCategory(activity),
    title: activity.title,
    description:
      activity.description ??
      "Um registro foi arquivado e pode exigir validação dos impactos relacionados.",
    reason:
      "Arquivamentos podem afetar vínculos, responsabilidades e dados dependentes.",
    activityIds: [activity.id],
    entityType: activity.entityType,
    entityId: activity.entityId,
    subjectType: activity.subjectType,
    subjectId: activity.subjectId,
    occurredAt: activity.occurredAt,
    recommendedActions: [
      {
        id: `review:${activity.id}`,
        type: "review",
        label: "Revisar impactos",
        description:
          "Confirme se existem vínculos ou processos afetados pelo arquivamento.",
        href: getEntityHref(
          activity.entityType,
          activity.entityId
        ),
        entityType: activity.entityType,
        entityId: activity.entityId,
      },
    ],
  }
}

function createCreatedInsight(
  activity: ActivityTimelineItemViewModel
): ActivityIntelligenceInsight {
  return {
    id: `created:${activity.id}`,
    kind: "opportunity",
    priority: "informational",
    category: getCategory(activity),
    title: activity.title,
    description:
      activity.description ??
      "Um novo registro foi incluído na organização.",
    reason:
      "Novos registros podem demandar complementação de informações ou próximos passos.",
    activityIds: [activity.id],
    entityType: activity.entityType,
    entityId: activity.entityId,
    subjectType: activity.subjectType,
    subjectId: activity.subjectId,
    occurredAt: activity.occurredAt,
    recommendedActions:
      createOpenEntityAction(activity),
  }
}

function createRepeatedUpdateInsight(
  group: EntityActivityGroup
): ActivityIntelligenceInsight | null {
  const updatedActivities =
    group.activities.filter((activity) =>
      activity.activityType.endsWith(
        ".updated"
      )
    )

  if (updatedActivities.length < 2) {
    return null
  }

  const latestActivity =
    updatedActivities
      .slice()
      .sort(
        (left, right) =>
          new Date(
            right.occurredAt
          ).getTime() -
          new Date(
            left.occurredAt
          ).getTime()
      )[0]

  return {
    id: `repeated-update:${group.key}`,
    kind: "trend",
    priority: "medium",
    category:
      getCategory(latestActivity),
    title: "Alterações recorrentes identificadas",
    description:
      `${updatedActivities.length} alterações foram registradas recentemente na mesma entidade.`,
    reason:
      "Mudanças recorrentes podem indicar ajustes operacionais, informações incompletas ou necessidade de acompanhamento.",
    activityIds:
      updatedActivities.map(
        (activity) => activity.id
      ),
    entityType: group.entityType,
    entityId: group.entityId,
    subjectType:
      latestActivity.subjectType,
    subjectId:
      latestActivity.subjectId,
    occurredAt:
      latestActivity.occurredAt,
    recommendedActions: [
      {
        id: `monitor:${group.key}`,
        type: "monitor",
        label: "Acompanhar alterações",
        description:
          "Revise o histórico para compreender a sequência de mudanças.",
        href: getEntityHref(
          group.entityType,
          group.entityId
        ),
        entityType: group.entityType,
        entityId: group.entityId,
      },
    ],
  }
}

function groupActivitiesByEntity(
  activities: ActivityTimelineItemViewModel[]
) {
  const groups = new Map<
    string,
    EntityActivityGroup
  >()

  for (const activity of activities) {
    if (
      !activity.entityType ||
      !activity.entityId
    ) {
      continue
    }

    const key =
      `${activity.entityType}:${activity.entityId}`

    const current = groups.get(key)

    if (current) {
      current.activities.push(activity)
      continue
    }

    groups.set(key, {
      key,
      entityType: activity.entityType,
      entityId: activity.entityId,
      activities: [activity],
    })
  }

  return Array.from(groups.values())
}

function sortInsights(
  insights: ActivityIntelligenceInsight[]
) {
  return insights
    .slice()
    .sort((left, right) => {
      const priorityDifference =
        PRIORITY_ORDER[left.priority] -
        PRIORITY_ORDER[right.priority]

      if (priorityDifference !== 0) {
        return priorityDifference
      }

      return (
        new Date(
          right.occurredAt
        ).getTime() -
        new Date(
          left.occurredAt
        ).getTime()
      )
    })
}

function createSummary(
  activities: ActivityTimelineItemViewModel[],
  insights: ActivityIntelligenceInsight[]
): ActivityIntelligenceSummary {
  const activityDates = activities
    .map((activity) => activity.occurredAt)
    .filter(Boolean)
    .sort(
      (left, right) =>
        new Date(left).getTime() -
        new Date(right).getTime()
    )

  const countPriority = (
    priority: ActivityIntelligencePriority
  ) =>
    insights.filter(
      (insight) =>
        insight.priority === priority
    ).length

  const criticalInsights =
    countPriority("critical")

  const highPriorityInsights =
    countPriority("high")

  const mediumPriorityInsights =
    countPriority("medium")

  const attentionCount =
    criticalInsights +
    highPriorityInsights +
    mediumPriorityInsights

  let headline =
    "Nenhuma atividade recente"

  let description =
    "Ainda não existem eventos suficientes para gerar inteligência operacional."

  if (activities.length > 0) {
    if (attentionCount > 0) {
      headline =
        `${attentionCount} ponto${attentionCount === 1 ? "" : "s"} de atenção identificado${attentionCount === 1 ? "" : "s"}`

      description =
        "Revise os insights priorizados para compreender mudanças e possíveis impactos."
    } else {
      headline =
        "Atividades acompanhadas sem alertas relevantes"

      description =
        "Os eventos recentes foram analisados e não apresentam pontos relevantes de atenção."
    }
  }

  return {
    totalActivities: activities.length,
    totalInsights: insights.length,
    criticalInsights,
    highPriorityInsights,
    mediumPriorityInsights,
    lowPriorityInsights:
      countPriority("low"),
    informationalInsights:
      countPriority(
        "informational"
      ),
    periodStart:
      activityDates[0] ?? null,
    periodEnd:
      activityDates[
        activityDates.length - 1
      ] ?? null,
    headline,
    description,
  }
}

export function presentActivityIntelligence({
  activities,
  generatedAt = new Date().toISOString(),
}: PresentActivityIntelligenceInput): ActivityIntelligenceViewModel {
  const directInsights =
    activities.flatMap((activity) => {
      if (
        activity.activityType.endsWith(
          ".archived"
        )
      ) {
        return [
          createArchivedInsight(
            activity
          ),
        ]
      }

      if (
        activity.activityType.endsWith(
          ".created"
        )
      ) {
        return [
          createCreatedInsight(
            activity
          ),
        ]
      }

      return []
    })

  const repeatedUpdateInsights =
    groupActivitiesByEntity(activities)
      .map(createRepeatedUpdateInsight)
      .filter(
        (
          insight
        ): insight is ActivityIntelligenceInsight =>
          insight !== null
      )

  const insights = sortInsights([
    ...directInsights,
    ...repeatedUpdateInsights,
  ])

  return {
    summary: createSummary(
      activities,
      insights
    ),
    insights,
    sourceActivities:
      activities.slice(),
    generatedAt,
  }
}
