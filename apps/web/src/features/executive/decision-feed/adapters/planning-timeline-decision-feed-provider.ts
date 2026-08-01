import type {
  PlanningTimelineInput,
  PlanningTimelineViewModel,
} from "@/features/organization-planning/timeline"

import type { ExecutiveContext } from "../../context"
import type { DecisionFeedProvider } from "../aggregators"
import type {
  DecisionFeedDTO,
  DecisionFeedItemDTO,
  DecisionFeedPriority,
} from "../types"

export type PlanningTimelineSource = Readonly<{
  execute(
    input: PlanningTimelineInput,
  ): Promise<PlanningTimelineViewModel>
}>

export class PlanningTimelineDecisionFeedProvider
  implements DecisionFeedProvider
{
  readonly key = "planning-timeline"

  constructor(
    private readonly context: ExecutiveContext,
    private readonly timeline: PlanningTimelineSource,
  ) {}

  async load(): Promise<DecisionFeedDTO> {
    if (!this.context.workspaceId) {
      return createEmptyFeed(this.context.generatedAt)
    }

    const timeline = await this.timeline.execute({
      workspaceId: this.context.workspaceId,
    })

    return Object.freeze({
      generatedAt: this.context.generatedAt,
      items: Object.freeze(
        timeline.items.map(mapTimelineItem),
      ),
    })
  }
}

function mapTimelineItem(
  item: PlanningTimelineViewModel["items"][number],
): DecisionFeedItemDTO {
  return Object.freeze({
    id: `planning-scenario:${item.id}`,
    source: "planning",
    category: "scenario",
    priority: resolvePriority(item),
    title: `Cenário de planejamento: ${item.name}`,
    description: item.summary,
    occurredAt:
      item.publishedAt ??
      item.updatedAt,
    href: `/app/organization/planning/${item.id}`,
    badges: Object.freeze([
      item.statusLabel,
      ...item.badges.map((badge) => badge.label),
    ]),
  })
}

function resolvePriority(
  item: PlanningTimelineViewModel["items"][number],
): DecisionFeedPriority {
  if (item.current && !item.published) {
    return "medium"
  }

  if (item.published) {
    return "low"
  }

  return "low"
}

function createEmptyFeed(
  generatedAt: string,
): DecisionFeedDTO {
  return Object.freeze({
    generatedAt,
    items: Object.freeze([]),
  })
}