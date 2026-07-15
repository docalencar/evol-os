import type {
  AttentionItem,
  AttentionPriority,
} from "../types/attention-item"
import type {
  AttentionQueueItemViewModel,
  AttentionQueueViewModel,
} from "../view-models/attention-queue-view-model"

const PRIORITY_LABELS: Record<AttentionPriority, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
}

function createContextLabel(item: AttentionItem) {
  const labels = [
    item.positionName,
    item.departmentName,
  ].filter((value): value is string => Boolean(value))

  return labels.length > 0
    ? labels.join(" · ")
    : "Contexto organizacional não informado"
}

function presentItem(
  item: AttentionItem
): AttentionQueueItemViewModel {
  return {
    employeeId: item.employeeId,
    employeeName: item.employeeName,
    contextLabel: createContextLabel(item),
    priority: item.priority,
    priorityLabel: PRIORITY_LABELS[item.priority],
    reasonType: item.reasonType,
    reason: item.reason,
    recommendedActions: [
      {
        id: "employee-profile",
        label: item.recommendedAction,
        href: `/app/people/${item.employeeId}`,
        estimatedMinutes: 5,
      },
    ],
    impact:
      item.priority === "critical"
        ? "Necessita ação imediata."
        : item.priority === "high"
          ? "Recomendado acompanhar nesta semana."
          : item.priority === "medium"
            ? "Monitorar evolução."
            : "Nenhuma ação urgente.",
    healthScore: item.healthScore,
    healthScoreLabel:
      item.healthScore === null
        ? "Não calculado"
        : `${item.healthScore}%`,
    decisionScore:
      item.priority === "critical"
        ? 100
        : item.priority === "high"
          ? 75
          : item.priority === "medium"
            ? 50
            : 25,

    decisionSummary:
      item.priority === "critical"
        ? "Necessita intervenção imediata para reduzir riscos."
        : item.priority === "high"
          ? "Requer acompanhamento prioritário nesta semana."
        : item.priority === "medium"
          ? "Monitorar evolução e revisar na próxima rotina."
          : "Situação estável, manter acompanhamento.",
    updatedAt: item.updatedAt,
  }
}

export function presentAttentionQueue(
  items: AttentionItem[]
): AttentionQueueViewModel {
  const presentedItems = items.map(presentItem)

  return {
    topPriority:
      presentedItems.length > 0
        ? presentedItems[0]
        : null,
    items: presentedItems,
    total: items.length,
    critical: items.filter(
      (item) => item.priority === "critical"
    ).length,
    high: items.filter(
      (item) => item.priority === "high"
    ).length,
    medium: items.filter(
      (item) => item.priority === "medium"
    ).length,
    low: items.filter(
      (item) => item.priority === "low"
    ).length,
    empty: items.length === 0,
  }
}
