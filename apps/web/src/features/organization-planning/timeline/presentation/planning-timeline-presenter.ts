import type { PlanningScenarioStatus } from "../../types/planning-contracts"
import type { PlanningTimeline, PlanningTimelineEntry } from "../contracts/planning-timeline-contract"
import type {
  PlanningTimelineBadgeViewModel,
  PlanningTimelineColor,
  PlanningTimelineItemViewModel,
  PlanningTimelineViewModel,
} from "./planning-timeline-view-model"

const statusPresentation: Readonly<
  Record<PlanningScenarioStatus, Readonly<{ label: string; color: PlanningTimelineColor }>>
> = Object.freeze({
  approved: Object.freeze({ label: "Aprovado", color: "green" }),
  archived: Object.freeze({ label: "Arquivado", color: "slate" }),
  draft: Object.freeze({ label: "Rascunho", color: "slate" }),
  published: Object.freeze({ label: "Publicado", color: "blue" }),
  rejected: Object.freeze({ label: "Rejeitado", color: "red" }),
  submitted: Object.freeze({ label: "Em aprovação", color: "amber" }),
})

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

export class PlanningTimelinePresenter {
  static create(): PlanningTimelinePresenter {
    return new PlanningTimelinePresenter()
  }

  present(timeline: PlanningTimeline): PlanningTimelineViewModel {
    return Object.freeze({
      workspaceId: timeline.workspaceId,
      items: Object.freeze(timeline.items.map(presentItem)),
      isEmpty: timeline.items.length === 0,
    })
  }
}

function presentItem(item: PlanningTimelineEntry): PlanningTimelineItemViewModel {
  const status = statusPresentation[item.status]

  return Object.freeze({
    id: item.id,
    version: item.version,
    name: item.name,
    status: item.status,
    statusLabel: status.label,
    createdAt: item.createdAt.toISOString(),
    createdAtLabel: dateFormatter.format(item.createdAt),
    updatedAt: item.updatedAt.toISOString(),
    updatedAtLabel: dateFormatter.format(item.updatedAt),
    publishedAt: item.publishedAt?.toISOString() ?? null,
    publishedAtLabel: item.publishedAt ? dateFormatter.format(item.publishedAt) : null,
    author: item.author,
    baselineVersion: item.baselineVersion,
    baselineVersionLabel:
      item.baselineVersion === null ? "Versão não disponível" : `Snapshot v${item.baselineVersion}`,
    summary: `${item.name} está ${status.label.toLowerCase()} na versão ${item.version}.`,
    badges: presentBadges(item, status),
    current: item.current,
    published: item.published,
  })
}

function presentBadges(
  item: PlanningTimelineEntry,
  status: Readonly<{ label: string; color: PlanningTimelineColor }>
): readonly PlanningTimelineBadgeViewModel[] {
  const badges: PlanningTimelineBadgeViewModel[] = [
    Object.freeze({ id: "status", label: status.label, color: status.color }),
  ]

  if (item.current) {
    badges.push(Object.freeze({ id: "current", label: "Atual", color: "blue" }))
  }

  if (item.published) {
    badges.push(Object.freeze({ id: "published", label: "Publicado", color: "green" }))
  }

  return Object.freeze(badges)
}
