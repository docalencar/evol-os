import type {
  DecisionFeedCategory,
  DecisionFeedDTO,
  DecisionFeedPriority,
  DecisionFeedSource,
  DecisionFeedViewModel,
} from "../types"

const sourceLabels = {
  kpi: "KPI",
  planning: "Planejamento",
  activity: "Atividade",
  recruitment: "Recrutamento",
  development: "Desenvolvimento",
  assessment: "Avaliações",
  feedback: "Feedback",
  organization: "Organização",
  system: "Sistema",
  people: "Pessoas",
  financeiro: "Financeiro",
} satisfies Record<DecisionFeedSource, string>

const categoryLabels = {
  alert: "Alerta",
  scenario: "Cenário",
  execution: "Execução",
  organization: "Organização",
  approval: "Aprovação",
  recommendation: "Recomendação",
  people: "Pessoas",
} satisfies Record<DecisionFeedCategory, string>

const priorityLabels = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
} satisfies Record<DecisionFeedPriority, string>

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
})

export class DecisionFeedPresenter {
  present(dto: DecisionFeedDTO): DecisionFeedViewModel {
    const items = [...dto.items]
      .sort(compareItems)
      .map((item) =>
        Object.freeze({
          id: item.id,
          source: item.source,
          sourceLabel: sourceLabels[item.source],
          category: item.category,
          categoryLabel: categoryLabels[item.category],
          priority: item.priority,
          priorityLabel: priorityLabels[item.priority],
          title: item.title,
          description: item.description,
          occurredAt: item.occurredAt,
          occurredAtLabel: item.occurredAt
            ? dateFormatter.format(new Date(item.occurredAt))
            : "Data indisponível",
          href: item.href,
          badges: Object.freeze(
            item.badges.map((label, index) =>
              Object.freeze({
                id: `${item.id}:badge:${index}`,
                label,
              }),
            ),
          ),
        }),
      )

    return Object.freeze({
      title: "Decision Feed",
      description:
        "Eventos que exigem acompanhamento ou decisão da liderança.",
      generatedAtLabel: dateFormatter.format(
        new Date(dto.generatedAt),
      ),
      isEmpty: items.length === 0,
      items: Object.freeze(items),
    })
  }
}

function compareItems(
  left: DecisionFeedDTO["items"][number],
  right: DecisionFeedDTO["items"][number],
): number {
  const priorityDifference =
    getPriorityWeight(right.priority) -
    getPriorityWeight(left.priority)

  if (priorityDifference !== 0) {
    return priorityDifference
  }

  return (
    getTimestamp(right.occurredAt) -
      getTimestamp(left.occurredAt) ||
    left.id.localeCompare(right.id)
  )
}

function getPriorityWeight(
  priority: DecisionFeedPriority,
): number {
  switch (priority) {
    case "critical":
      return 4
    case "high":
      return 3
    case "medium":
      return 2
    case "low":
      return 1
  }
}

function getTimestamp(
  occurredAt: string | null,
): number {
  if (!occurredAt) {
    return Number.NEGATIVE_INFINITY
  }

  const timestamp = new Date(occurredAt).getTime()

  return Number.isNaN(timestamp)
    ? Number.NEGATIVE_INFINITY
    : timestamp
}
