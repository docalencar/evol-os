import {
  getEmployees,
  type Employee,
} from "@/features/people"

import {
  getDevelopmentTemplates,
  type DevelopmentTemplate,
} from "@/features/development/templates"

import {
  getDevelopmentActionsByGoalIds,
} from "../queries/get-development-actions-by-goal-ids"

import {
  getDevelopmentGoalsByPlanIds,
} from "../queries/get-development-goals-by-plan-ids"

import {
  getDevelopmentPlans,
} from "../queries/get-development-plans"

import type {
  DevelopmentAction,
} from "../types/development-action"

import type {
  DevelopmentGoal,
} from "../types/development-goal"

import type {
  DevelopmentPlanListData,
} from "../types/development-plan-list-item"

function calculateProgress(
  actions: DevelopmentAction[]
) {
  if (actions.length === 0) {
    return 0
  }

  const completedActions =
    actions.filter(
      (action) =>
        action.status === "completed"
    ).length

  return Math.round(
    (completedActions / actions.length) *
      100
  )
}

export async function getDevelopmentPlanListItems(
  companyId: string
): Promise<DevelopmentPlanListData> {
  const [
    plans,
    employeesData,
    templatesData,
  ] = await Promise.all([
    getDevelopmentPlans(companyId),
    getEmployees(companyId),
    getDevelopmentTemplates(companyId),
  ])

  const employees =
    (employeesData ?? []) as Employee[]

  const templates =
    (templatesData ?? []) as DevelopmentTemplate[]

  const owners = employees
    .filter(
      (employee) =>
        employee.status === "active" ||
        employee.status === "on_leave"
    )
    .map((employee) => ({
      id: employee.id,
      name: employee.full_name,
    }))

  if (!plans || plans.length === 0) {
    return {
      plans: [],
      owners,
    }
  }

  const employeeNameById = new Map(
    employees.map((employee) => [
      employee.id,
      employee.full_name,
    ])
  )

  const templateNameById = new Map(
    templates.map((template) => [
      template.id,
      template.name,
    ])
  )

  const planIds = plans.map(
    (plan) => plan.id
  )

  const goals =
    await getDevelopmentGoalsByPlanIds(
      companyId,
      planIds
    )

  const goalIds = goals.map(
    (goal) => goal.id
  )

  const actions =
    await getDevelopmentActionsByGoalIds(
      companyId,
      goalIds
    )

  const goalsByPlan = new Map<
    string,
    DevelopmentGoal[]
  >()

  for (const goal of goals) {
    const current =
      goalsByPlan.get(goal.planId) ?? []

    current.push(goal)

    goalsByPlan.set(
      goal.planId,
      current
    )
  }

  const actionsByGoal = new Map<
    string,
    DevelopmentAction[]
  >()

  for (const action of actions) {
    const current =
      actionsByGoal.get(action.goalId) ?? []

    current.push(action)

    actionsByGoal.set(
      action.goalId,
      current
    )
  }

  return {
    owners,

    plans: plans.map((plan) => {
      const planGoals =
        goalsByPlan.get(plan.id) ?? []

      const planActions =
        planGoals.flatMap(
          (goal) =>
            actionsByGoal.get(goal.id) ?? []
        )

      return {
        plan,

        employeeName:
          employeeNameById.get(
            plan.employeeId
          ) ?? "Colaborador não encontrado",

        ownerName: plan.ownerId
          ? employeeNameById.get(
              plan.ownerId
            ) ?? "Responsável não encontrado"
          : null,

        templateName: plan.templateId
          ? templateNameById.get(
              plan.templateId
            ) ?? "Template não encontrado"
          : null,

        progress:
          calculateProgress(planActions),
      }
    }),
  }
}