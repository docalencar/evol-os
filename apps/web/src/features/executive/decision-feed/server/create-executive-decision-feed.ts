import "server-only"

import {
  getAssessmentExecutiveDashboard,
} from "@/features/assessments/services/get-assessment-executive-dashboard"
import {
  getDevelopmentExecutiveDashboard,
} from "@/features/development/services/get-development-executive-dashboard"
import {
  criarConsultaFinanceiraExecutiva,
} from "@/features/financeiro-executivo/server"
import {
  getFeedbackExecutiveDashboard,
} from "@/features/feedbacks/services/get-feedback-executive-dashboard"
import type {
  KPIDashboardViewModel,
} from "@/features/kpi-dashboard/types"
import {
  getDepartments,
} from "@/features/organization/departments"
import {
  getPositions,
} from "@/features/organization/positions"
import {
  getTeams,
} from "@/features/organization/teams"
import {
  createPlanningTimelineService,
} from "@/features/organization-planning/timeline"
import {
  getEmployees,
} from "@/features/people"
import {
  getPeopleSummary,
} from "@/features/people/dashboard/queries/get-people-summary"
import {
  getJobOpenings,
} from "@/features/recruitment/job-openings/queries/get-job-openings"

import type {
  ExecutiveContext,
} from "../../context"
import {
  AssessmentDecisionFeedProvider,
  DevelopmentDecisionFeedProvider,
  FeedbackDecisionFeedProvider,
  FinanceiroDecisionFeedProvider,
  KPIDashboardDecisionFeedProvider,
  OrganizationDecisionFeedProvider,
  PeopleDecisionFeedProvider,
  PlanningTimelineDecisionFeedProvider,
  RecruitmentDecisionFeedProvider,
} from "../adapters"
import {
  DecisionFeedAggregator,
} from "../aggregators"
import {
  ExecutiveDecisionFeedProviderRegistry,
} from "../registry"
import type {
  DecisionFeedDTO,
} from "../types"

export type CreateExecutiveDecisionFeedInput =
  Readonly<{
    context: ExecutiveContext
    dashboard: KPIDashboardViewModel
  }>

export async function createExecutiveDecisionFeed(
  input: CreateExecutiveDecisionFeedInput,
): Promise<DecisionFeedDTO> {
  const {
    context,
    dashboard,
  } = input

  const [
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

  const registry =
    new ExecutiveDecisionFeedProviderRegistry()
      .registerMany([
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
      ])

  if (context.scenarioId) {
    const consultaFinanceira =
      await criarConsultaFinanceiraExecutiva(
        context.companyId,
      )

    const painelFinanceiro =
      await consultaFinanceira.executar(
        context.scenarioId,
      )

    registry.register(
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

    registry.register(
      new PlanningTimelineDecisionFeedProvider(
        context,
        planningTimeline,
      ),
    )
  }

  const aggregator =
    new DecisionFeedAggregator(
      registry.list(),
    )

  const aggregation =
    await aggregator.aggregate(
      context.generatedAt,
    )

  return aggregation.feed
}
