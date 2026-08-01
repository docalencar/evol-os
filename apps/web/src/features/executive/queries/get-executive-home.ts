import "server-only"

import { getExecutiveKPIDashboard } from "@/features/kpi-dashboard"

import { ExecutiveApplicationService } from "../application"
import {
  DecisionFeedAggregator,
  KPIDashboardDecisionFeedProvider,
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
    const generatedAt = new Date().toISOString()

    const [overview, dashboard] = await Promise.all([
      getExecutiveOverview(),
      getExecutiveKPIDashboard(),
    ])

    const aggregator = new DecisionFeedAggregator([
      new KPIDashboardDecisionFeedProvider(
        dashboard,
        generatedAt,
      ),
    ])

    const aggregation = await aggregator.aggregate(generatedAt)

    return Object.freeze({
      generatedAt,
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