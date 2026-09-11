import { getCanonicalCompanyPersonCompetencyCoverages } from "@/features/competencies/person-competency-gaps/queries/get-canonical-company-person-competency-coverages"
import { getManagementDevelopmentActions, getManagementDevelopmentGoals, getManagementDevelopmentPlans, getManagementDevelopmentTemplates, getManagementPeople } from "@/features/dashboard-read"
import { presentDashboardCompetencyDevelopment } from "@/features/dashboard-read/presenters/dashboard-competency-development-presenter"
import type { DashboardCompetencyIntelligence } from "@/features/dashboard-read/types/dashboard-competency-development"

import {
  calculateDevelopmentDashboardKpis,
} from "./get-development-dashboard-kpis"

import {
  calculateDevelopmentMonthlyEvolution,
} from "./calculate-development-monthly-evolution"

import {
  calculateDevelopmentPlanDistribution,
} from "./calculate-development-plan-distribution"

import type {
  DevelopmentExecutiveDashboard,
} from "../types/development-executive-dashboard"

/**
 * Every other read on this page is gated on `is_company_member`; only the
 * competency coverage comes from the administrative 0124 boundary. That single
 * dependency made `/app/development` fail for a manager or an employee exactly
 * the way `/app` did, so it takes the same decision-before-the-call and the same
 * explicit "forbidden" state. `null` here is the refusal, never an empty list.
 */
export async function getDevelopmentExecutiveDashboard(
  companyId: string,
  canReadCompetencyIntelligence: boolean
): Promise<DevelopmentExecutiveDashboard> {
  const [plans, goals, actions, templates, people, competencyCoverages] = await Promise.all([
    getManagementDevelopmentPlans(companyId), getManagementDevelopmentGoals(companyId),
    getManagementDevelopmentActions(companyId), getManagementDevelopmentTemplates(companyId),
    getManagementPeople(companyId),
    canReadCompetencyIntelligence
      ? getCanonicalCompanyPersonCompetencyCoverages(companyId)
      : Promise.resolve(null),
  ])
  const names = new Map(people.map((p) => [p.id, p.full_name]))
  const templateNames = new Map(templates.map((t) => [t.id, t.name]))
  const goalsByPlan = new Map<string, typeof goals>()
  for (const goal of goals) goalsByPlan.set(goal.planId, [...(goalsByPlan.get(goal.planId) ?? []), goal])
  const actionsByGoal = new Map<string, typeof actions>()
  for (const action of actions) actionsByGoal.set(action.goalId, [...(actionsByGoal.get(action.goalId) ?? []), action])
  const planList = {
    owners: people.filter((p) => p.status === "active" || p.status === "on_leave").map((p) => ({ id: p.id, name: p.full_name })),
    plans: plans.map((plan) => {
      const planActions = (goalsByPlan.get(plan.id) ?? []).flatMap((g) => actionsByGoal.get(g.id) ?? [])
      return { plan, employeeName: names.get(plan.employeeId) ?? "Colaborador não encontrado",
        ownerName: plan.ownerId ? names.get(plan.ownerId) ?? "Responsável não encontrado" : null,
        templateName: plan.templateId ? templateNames.get(plan.templateId) ?? "Template não encontrado" : null,
        progress: planActions.length ? Math.round(planActions.filter((a) => a.status === "completed").length / planActions.length * 100) : 0 }
    }),
  }
  const competencyDevelopment: DashboardCompetencyIntelligence =
    competencyCoverages === null
      ? { status: "forbidden" }
      : {
        status: "ok",
        development: presentDashboardCompetencyDevelopment(
          people.map((person) => ({
            personId: person.id,
            personName: person.full_name,
          })),
          competencyCoverages
        ),
      }

  return {
    planList,

    kpis:
      calculateDevelopmentDashboardKpis(
        planList.plans
      ),

    competencyDevelopment,

    planDistribution:
      calculateDevelopmentPlanDistribution(
        planList.plans
      ),

    monthlyEvolution:
      calculateDevelopmentMonthlyEvolution(
        planList.plans
      ),
  }
}
