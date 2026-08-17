import { getManagementCompetencyAssignments, getManagementDevelopmentActions, getManagementDevelopmentGoals, getManagementDevelopmentPlans, getManagementDevelopmentTemplates, getManagementPeople } from "@/features/dashboard-read"
import { calculateCompetencyGap, createEmployeeInsights } from "@/features/talent"

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

export async function getDevelopmentExecutiveDashboard(
  companyId: string
): Promise<DevelopmentExecutiveDashboard> {
  const [plans, goals, actions, templates, people, assignments] = await Promise.all([
    getManagementDevelopmentPlans(companyId), getManagementDevelopmentGoals(companyId),
    getManagementDevelopmentActions(companyId), getManagementDevelopmentTemplates(companyId),
    getManagementPeople(companyId), getManagementCompetencyAssignments(companyId),
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
  const employeeAssignments = assignments.filter((r) => r.record_type === "employee")
  const positionAssignments = assignments.filter((r) => r.record_type === "position")
  const employeeGaps = people.filter((p) => (p.status === "active" || p.status === "on_leave") && p.position_id).map((person) => {
    const current = new Map(employeeAssignments.filter((r) => r.employee_id === person.id).map((r) => [r.competency_id, r.current_level ?? 0]))
    const gaps = positionAssignments.filter((r) => r.position_id === person.position_id).map((r) => calculateCompetencyGap({
      competencyId: r.competency_id, competencyName: r.competency_name, currentLevel: current.get(r.competency_id) ?? 0,
      expectedLevel: r.expected_level ?? 0, weight: r.weight ?? 0, required: r.required ?? false,
    }))
    return { person, gaps }
  })
  const gapMap = new Map<string, { name: string; total: number; worst: number; people: Set<string> }>()
  for (const { person, gaps } of employeeGaps) for (const gap of gaps) if (gap.gap < 0) {
    const item = gapMap.get(gap.competencyId) ?? { name: gap.competencyName, total: 0, worst: 0, people: new Set<string>() }
    item.total += gap.gap; item.worst = Math.min(item.worst, gap.gap); item.people.add(person.id); gapMap.set(gap.competencyId, item)
  }
  const competencyGaps = [...gapMap].map(([competencyId, g]) => ({ competencyId, competencyName: g.name,
    averageGap: Math.round(g.total / g.people.size * 10) / 10, worstGap: g.worst, affectedEmployees: g.people.size }))
    .sort((a, b) => a.averageGap - b.averageGap || b.affectedEmployees - a.affectedEmployees)
  const developmentPriorities = employeeGaps.map(({ person, gaps }) => { const insights = createEmployeeInsights(gaps); return {
    employeeId: person.id, employeeName: person.full_name, risk: insights.risk,
    criticalGaps: gaps.filter((g) => g.status === "critical").length,
    attentionGaps: gaps.filter((g) => g.status === "attention").length, biggestGap: insights.biggestGap } })
    .sort((a, b) => ({ high: 3, medium: 2, low: 1 })[b.risk] - ({ high: 3, medium: 2, low: 1 })[a.risk] || b.criticalGaps - a.criticalGaps)

  return {
    planList,

    kpis:
      calculateDevelopmentDashboardKpis(
        planList.plans
      ),

    competencyGaps,

    developmentPriorities,

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
