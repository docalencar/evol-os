import "server-only"

import { getExecutiveKPIDashboard } from "@/features/kpi-dashboard"
import {
  createPlanningTimelineService,
} from "@/features/organization-planning/timeline"

import { ExecutiveApplicationService } from "../application"
import {
  createServerExecutiveContextService,
} from "../context/server"
import {
  DecisionFeedAggregator,
  KPIDashboardDecisionFeedProvider,
  PlanningTimelineDecisionFeedProvider,
  type DecisionFeedProvider,
} from "../decision-feed"
import { ExecutivePresenter } from "../presenters"
import type { ExecutiveHomeDTO } from "../types"
import {
  ExecutiveQueryService,
  type ExecutiveHomeSource,
} from "./executive-query-service"
import { getExecutiveOverview } from "./get-executive-overview"

class CurrentExecutiveHomeSource implements ExecutiveHomeSource {
  async load(): Promise<ExecutiveHomeDTO> {
    const contextService =
      await createServerExecutiveContextService()

    const [contextResolution, overview, dashboard] =
      await Promise.all([
        contextService.resolve(),
        getExecutiveOverview(),
        getExecutiveKPIDashboard(),
      ])

    const { context } = contextResolution

    const providers: DecisionFeedProvider[] = [
      new KPIDashboardDecisionFeedProvider(
        dashboard,
        context.generatedAt,
      ),
    ]

    if (context.workspaceId) {
      const planningTimeline =
        await createPlanningTimelineService(
          context.companyId,
        )

      providers.push(
        new PlanningTimelineDecisionFeedProvider(
          context,
          planningTimeline,
        ),
      )
    }

    const aggregator =
      new DecisionFeedAggregator(providers)

    const aggregation = await aggregator.aggregate(
      context.generatedAt,
    )

    return Object.freeze({
      generatedAt: context.generatedAt,
      overview,
      dashboard,
      decisionFeed: aggregation.feed,
    })
  }
}

export async function getExecutiveHome() {
  const query = new ExecutiveQueryService(
    new CurrentExecutiveHomeSource(),
  )

  const presenter = new ExecutivePresenter()

  const application = new ExecutiveApplicationService(
    query,
    presenter,
  )

  return application.execute()
}