import type { KPIDashboardViewModel } from "@/features/kpi-dashboard/types"

import type { DecisionFeedProvider } from "../aggregators"
import type { DecisionFeedDTO } from "../types"
import { mapKPIDashboardToDecisionFeed } from "./map-kpi-dashboard-to-decision-feed"

export class KPIDashboardDecisionFeedProvider
  implements DecisionFeedProvider
{
  readonly key = "kpi-dashboard"

  constructor(
    private readonly dashboard: KPIDashboardViewModel,
    private readonly generatedAt: string,
  ) {}

  load(): Promise<DecisionFeedDTO> {
    return Promise.resolve(
      mapKPIDashboardToDecisionFeed(
        this.dashboard,
        this.generatedAt,
      ),
    )
  }
}