import "server-only"

import {
  getAssessmentExecutiveDashboard,
} from "@/features/assessments/services/get-assessment-executive-dashboard"
import { isAdministrativeRole } from "@/features/authorization"
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
  getManagementDepartments,
  getManagementPeople,
  getManagementPositions,
  getManagementTeams,
} from "@/features/dashboard-read"
import {
  createPlanningTimelineService,
} from "@/features/organization-planning/timeline"
import {
  getJobOpenings,
} from "@/features/recruitment/job-openings/queries/get-job-openings"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

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
  type DecisionFeedAggregationResult,
} from "../aggregators"
import {
  ExecutiveDecisionFeedProviderRegistry,
} from "../registry"
export type CreateExecutiveDecisionFeedInput =
  Readonly<{
    context: ExecutiveContext
    dashboard: KPIDashboardViewModel
  }>

export async function createExecutiveDecisionFeed(
  input: CreateExecutiveDecisionFeedInput,
): Promise<DecisionFeedAggregationResult> {
  const {
    context,
    dashboard,
  } = input

  // The competency half of the development feed comes from the administrative
  // 0124 boundary. Resolved from the session here, exactly as /app and
  // /app/development do, so this feed neither asks for what the actor may not
  // have nor silently drops it for one who may.
  const { currentUser } = await getCurrentCompanyContext()
  const canReadCompetencyIntelligence = isAdministrativeRole(currentUser.role)

  const jobOpenings = getJobOpenings(context.companyId)
  const developmentDashboard = getDevelopmentExecutiveDashboard(
      context.companyId,
      canReadCompetencyIntelligence,
    )
  const assessmentDashboard = getAssessmentExecutiveDashboard(context.companyId)
  const feedbackDashboard = getFeedbackExecutiveDashboard(context.companyId)
  const employees = getManagementPeople(context.companyId)
  const departments = getManagementDepartments(context.companyId)
  const positions = getManagementPositions(context.companyId)
  const teams = getManagementTeams(context.companyId)

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
              const people = await employees
              return {
                summary: {
                  total: people.length,
                  active: people.filter((person) => person.status === "active").length,
                  inactive: people.filter((person) => person.status === "inactive").length,
                },
                employees: people,
              }
            },
          },
        ),

        new OrganizationDecisionFeedProvider(
          context.generatedAt,
          {
            async load() {
              return {
                departments: await departments,
                positions: await positions,
                teams: await teams,
                employees: await employees,
              }
            },
          },
        ),
      ])

  if (context.scenarioId) {
    registry.register(
      new FinanceiroDecisionFeedProvider(
        context.generatedAt,
        {
          async load() {
            const consultaFinanceira = await criarConsultaFinanceiraExecutiva(
              context.companyId,
            )
            return {
              scenarioId: context.scenarioId!,
              painel: await consultaFinanceira.executar(context.scenarioId!),
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

  return aggregation
}
