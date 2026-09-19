import { getManagementPeople } from "@/features/dashboard-read"

import {
  getDevelopmentPlans,
} from "../queries/get-development-plans"

import {
  getDevelopmentPlanOrigins,
} from "../queries/get-development-plan-origins"

import type {
  DevelopmentPlanListData,
} from "../types/development-plan-list-item"

export async function getDevelopmentPlanListItems(
  companyId: string
): Promise<DevelopmentPlanListData> {
  const [
    plans,
    employeesData,
    originsData,
  ] = await Promise.all([
    getDevelopmentPlans(companyId),
    getManagementPeople(companyId),
    // "Template de origem" is a HISTORICAL claim, so it is read from the
    // historical boundary rather than derived from the current catalog. A
    // template that has since been obsoleted, or superseded by a newer version,
    // must not change what an existing plan says about where it came from.
    //
    // One set-based call for every origin this viewer may see — not one call per
    // plan. The boundary authorizes each returned row with
    // can_read_development_plan_v1, the same predicate that already decided
    // which plans appear above.
    getDevelopmentPlanOrigins(companyId),
  ])

  const employees = employeesData ?? []

  const origins = originsData ?? []

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

  // Keyed on the PLAN, because that is what the origin is a fact about. Both
  // sets were authorized independently by their own trusted boundaries before
  // they got here, so this join narrows presentation and decides nothing about
  // access.
  const originNameByPlanId = new Map(
    origins.map((origin) => [
      origin.planId,
      origin.templateName,
    ])
  )

  return {
    owners,

    plans: plans.map((plan) => {
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

        // No row means the plan has no recorded template origin. That is a fact
        // to render, not a gap to paper over: `plan.templateId` is deliberately
        // not consulted as a fallback, because 0011 made it `on delete set null`
        // and it cannot carry history.
        templateName:
          originNameByPlanId.get(plan.id) ?? null,

        progress: plan.progressPercent,
      }
    }),
  }
}
