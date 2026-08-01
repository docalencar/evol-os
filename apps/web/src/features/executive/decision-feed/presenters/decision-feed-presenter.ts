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
  organization: "Organização",
  system: "Sistema",
} satisfies Record<DecisionFeedSource, string>

const categoryLabels = {
  alert: "Alerta",
  scenario: "Cenário",
  execution: "Execução",
  organization: "Organização",
  people: "Pessoas",
  approval: "Aprovação",
  recommendation: "Recomendação",
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
          occurredAtLabel: formatDate(item.occurredAt),
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
        "Eventos executivos priorizados por relevância e ordem cronológica.",
      generatedAtLabel: formatDate(dto.generatedAt),
      isEmpty: items.length === 0,
      items: Object.freeze(items),
    })
  }
}

function compareItems(
  left: DecisionFeedDTO["items"][number],
  right: DecisionFeedDTO["items"][number],
): number {
  const priorityDelta =
    priorityRank(left.priority) - priorityRank(right.priority)

  if (priorityDelta !== 0) {
    return priorityDelta
  }

  const leftDate = left.occurredAt ?? ""
  const rightDate = right.occurredAt ?? ""

  return rightDate.localeCompare(leftDate) || left.id.localeCompare(right.id)
}

function priorityRank(priority: DecisionFeedPriority): number {
  switch (priority) {
    case "critical":
      return 0
    case "high":
      return 1
    case "medium":
      return 2
    case "low":
      return 3
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Data indisponível"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Data indisponível"
  }

  return dateFormatter.format(date)
}