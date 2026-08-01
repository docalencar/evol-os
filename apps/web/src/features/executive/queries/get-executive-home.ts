import "server-only"

import { getExecutiveKPIDashboard } from "@/features/kpi-dashboard"
import {
  createPlanningTimelineService,
} from "@/features/organization-planning/timeline"
import { getJobOpenings } from "@/features/recruitment/job-openings/queries/get-job-openings"

import { ExecutiveApplicationService } from "../application"
import {
  createServerExecutiveContextService,
} from "../context/server"
import {
  DecisionFeedAggregator,
  KPIDashboardDecisionFeedProvider,
  PlanningTimelineDecisionFeedProvider,
  RecruitmentDecisionFeedProvider,
  DevelopmentDecisionFeedProvider,
  type DecisionFeedProvider,
} from "../decision-feed"
import { ExecutivePresenter } from "../presenters"
import type { ExecutiveHomeDTO } from "../types"
import {
  ExecutiveQueryService,
  type ExecutiveHomeSource,
} from "./executive-query-service"
import { getExecutiveOverview } from "./get-executive-overview"
import { getDevelopmentExecutiveDashboard } from "@/features/development/services/get-development-executive-dashboard"

class CurrentExecutiveHomeSource
  implements ExecutiveHomeSource
{
  async load(): Promise<ExecutiveHomeDTO> {
    const contextService =
      await createServerExecutiveContextService()

    const contextResolution =
      await contextService.resolve()

    const { context } = contextResolution

    const [
      overview,
      dashboard,
      jobOpenings,
      developmentDashboard,
    ] = await Promise.all([
      getExecutiveOverview(),
      getExecutiveKPIDashboard(),
      getJobOpenings(context.companyId),
      getDevelopmentExecutiveDashboard(context.companyId),
    ])

    const providers: DecisionFeedProvider[] = [
      new KPIDashboardDecisionFeedProvider(
        dashboard,
        context.generatedAt,
      ),

      new RecruitmentDecisionFeedProvider(
        context.generatedAt,
        {
          async load() {
            return jobOpenings
          },
        },
      ),

      new DevelopmentDecisionFeedProvider(
        context.generatedAt,
        {
          async load() {
            return developmentDashboard
          },
        },
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