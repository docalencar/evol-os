import "server-only"

import {
  getExecutiveKPIDashboard,
} from "@/features/kpi-dashboard"

import {
  ExecutiveApplicationService,
} from "../application"
import {
  createServerExecutiveContextService,
} from "../context/server"
import {
  createExecutiveDecisionFeed,
} from "../decision-feed/server"
import {
  ExecutivePresenter,
} from "../presenters"
import type {
  ExecutiveHomeDTO,
} from "../types"
import {
  ExecutiveQueryService,
  type ExecutiveHomeSource,
} from "./executive-query-service"
import {
  getExecutiveOverview,
} from "./get-executive-overview"

class CurrentExecutiveHomeSource
  implements ExecutiveHomeSource
{
  async load(): Promise<ExecutiveHomeDTO> {
    const contextService =
      await createServerExecutiveContextService()

    const contextResolution =
      await contextService.resolve()

    const { context } =
      contextResolution

    const [
      overview,
      dashboard,
    ] = await Promise.all([
      getExecutiveOverview(),
      getExecutiveKPIDashboard(),
    ])

    const decisionFeed =
      await createExecutiveDecisionFeed({
        context,
        dashboard,
      })

    return Object.freeze({
      generatedAt: context.generatedAt,
      overview,
      dashboard,
      decisionFeed,
    })
  }
}

export async function getExecutiveHome() {
  const query =
    new ExecutiveQueryService(
      new CurrentExecutiveHomeSource(),
    )

  const presenter =
    new ExecutivePresenter()

  const application =
    new ExecutiveApplicationService(
      query,
      presenter,
    )

  return application.execute()
}
