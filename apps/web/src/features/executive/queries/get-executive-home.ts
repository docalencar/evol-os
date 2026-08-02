import "server-only"

import { getAssessmentExecutiveDashboard } from "@/features/assessments/services/get-assessment-executive-dashboard"
import { getDevelopmentExecutiveDashboard } from "@/features/development/services/get-development-executive-dashboard"
import { getExecutiveKPIDashboard } from "@/features/kpi-dashboard"
import { criarConsultaFinanceiraExecutiva } from "@/features/financeiro-executivo/server"
import { getDepartments } from "@/features/organization/departments"
import { getPositions } from "@/features/organization/positions"
import { getTeams } from "@/features/organization/teams"
import { getEmployees } from "@/features/people"
import { getPeopleSummary } from "@/features/people/dashboard/queries/get-people-summary"
import { getFeedbackExecutiveDashboard } from "@/features/feedbacks/services/get-feedback-executive-dashboard"
import {
  createPlanningTimelineService,
} from "@/features/organization-planning/timeline"
import { getJobOpenings } from "@/features/recruitment/job-openings/queries/get-job-openings"

import { ExecutiveApplicationService } from "../application"
import {
  createServerExecutiveContextService,
} from "../context/server"
import {
  AssessmentDecisionFeedProvider,
  DecisionFeedAggregator,
  DevelopmentDecisionFeedProvider,
  FeedbackDecisionFeedProvider,
  FinanceiroDecisionFeedProvider,
  KPIDashboardDecisionFeedProvider,
  PlanningTimelineDecisionFeedProvider,
  PeopleDecisionFeedProvider,
  OrganizationDecisionFeedProvider,
  RecruitmentDecisionFeedProvider,
  type DecisionFeedProvider,
} from "../decision-feed"
import { ExecutivePresenter } from "../presenters"
import type { ExecutiveHomeDTO } from "../types"
import {
  ExecutiveQueryService,
  type ExecutiveHomeSource,
} from "./executive-query-service"
import { getExecutiveOverview } from "./get-executive-overview"

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
      assessmentDashboard,
      feedbackDashboard,
      peopleSummary,
      employees,
      departments,
      positions,
      teams,
    ] = await Promise.all([
      getExecutiveOverview(),
      getExecutiveKPIDashboard(),
      getJobOpenings(context.companyId),
      getDevelopmentExecutiveDashboard(
        context.companyId,
      ),
      getAssessmentExecutiveDashboard(
        context.companyId,
      ),
      getFeedbackExecutiveDashboard(
        context.companyId,
      ),
      getPeopleSummary(
        context.companyId,
      ),
      getEmployees(
        context.companyId,
      ),
      getDepartments(
        context.companyId,
      ),
      getPositions(
        context.companyId,
      ),
      getTeams(
        context.companyId,
      ),
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

      new AssessmentDecisionFeedProvider(
        context.generatedAt,
        {
          async load() {
            return assessmentDashboard
          },
        },
      ),
      new FeedbackDecisionFeedProvider(
        context.generatedAt,
        {
          async load() {
            return feedbackDashboard
          },
        },
      ),
      new PeopleDecisionFeedProvider(
        context.generatedAt,
        {
          async load() {
            return {
              summary: peopleSummary,
              employees,
            }
          },
        },
      ),
      new OrganizationDecisionFeedProvider(
        context.generatedAt,
        {
          async load() {
            return {
              departments,
              positions,
              teams,
              employees,
            }
          },
        },
      ),
    ]

    if (context.scenarioId) {
      const consultaFinanceira =
        await criarConsultaFinanceiraExecutiva(
          context.companyId,
        )

      const painelFinanceiro =
        await consultaFinanceira.executar(
          context.scenarioId,
        )

      providers.push(
        new FinanceiroDecisionFeedProvider(
          context.generatedAt,
          {
            async load() {
              return {
                scenarioId: context.scenarioId!,
                painel: painelFinanceiro,
              }
            },
          },
        ),
      )
    }

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
