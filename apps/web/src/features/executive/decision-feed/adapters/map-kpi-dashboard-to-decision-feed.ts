import type {
  DashboardStatus,
  KPIDashboardViewModel,
} from "@/features/kpi-dashboard/types"

import type {
  DecisionFeedDTO,
  DecisionFeedItemDTO,
  DecisionFeedPriority,
} from "../types"

export function mapKPIDashboardToDecisionFeed(
  dashboard: KPIDashboardViewModel,
  generatedAt: string,
): DecisionFeedDTO {
  const timelineItems = dashboard.timeline.map(
    (item): DecisionFeedItemDTO =>
      Object.freeze({
        id: `kpi-timeline:${item.id}`,
        source: "kpi",
        category: resolveTimelineCategory(item.kindLabel),
        priority: mapDashboardStatusToPriority(item.status),
        title: item.title,
        description: item.description,
       occurredAt: null,
        href: "/app/indicators",
        badges: Object.freeze([
          item.kindLabel,
          item.statusLabel,
        ]),
      }),
  )

  const alertItems = dashboard.alerts.map(
    (alert, index): DecisionFeedItemDTO =>
      Object.freeze({
        id: `kpi-alert:${index}:${createStableSlug(alert)}`,
        source: "kpi",
        category: "alert",
        priority: "high",
        title: "Atenção executiva",
        description: alert,
        occurredAt: null,
        href: "/app/indicators",
        badges: Object.freeze(["Alerta de KPI"]),
      }),
  )

  return Object.freeze({
    generatedAt,
    items: Object.freeze([
      ...timelineItems,
      ...alertItems,
    ]),
  })
}

function mapDashboardStatusToPriority(
  status: DashboardStatus,
): DecisionFeedPriority {
  switch (status) {
    case "critical":
      return "critical"

    case "attention":
      return "high"

    case "healthy":
      return "low"

    case "unavailable":
      return "medium"
  }
}

function resolveTimelineCategory(
  kindLabel: string,
): DecisionFeedItemDTO["category"] {
  const normalized = kindLabel.toLocaleLowerCase("pt-BR")

  if (
    normalized.includes("execução") ||
    normalized.includes("dispatcher") ||
    normalized.includes("scheduler")
  ) {
    return "execution"
  }

  if (
    normalized.includes("cancelamento") ||
    normalized.includes("aprovação")
  ) {
    return "approval"
  }

  return "alert"
}


function createStableSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
}