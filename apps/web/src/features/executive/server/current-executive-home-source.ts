import "server-only"

import {
  getExecutiveKPIDashboard,
} from "@/features/kpi-dashboard"

import {
  createServerExecutiveContextService,
} from "../context/server"
import {
  createExecutiveDecisionFeed,
} from "../decision-feed/server"
import type {
  ExecutiveHomeDTO,
} from "../types"
import type {
  ExecutiveHomeSource,
} from "../queries"
import {
  getExecutiveOverview,
} from "../queries/get-executive-overview"

export class CurrentExecutiveHomeSource
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

    const decisionFeedResult =
      await createExecutiveDecisionFeed({
        context,
        dashboard,
      })

    return Object.freeze({
      generatedAt: context.generatedAt,
      overview,
      dashboard,
      decisionFeed: decisionFeedResult.feed,
      sourceFailures: Object.freeze([
        ...contextResolution.warnings.map((warning) => ({
          source: warning.code,
          kind: warning.code.endsWith("_read_failed")
            ? "failure" as const
            : "unavailable" as const,
          message: warning.message,
        })),
        ...decisionFeedResult.failures.map((failure) => ({
          source: failure.providerKey,
          kind: "failure" as const,
          message: failure.message,
        })),
      ]),
    })
  }
}
