import {
  getManagementDevelopmentTemplates,
  getManagementPeople,
} from "@/features/dashboard-read"

import {
  type DevelopmentTemplate,
} from "@/features/development/templates"

import {
  getDevelopmentPlans,
} from "../queries/get-development-plans"

import type {
  DevelopmentPlanListData,
} from "../types/development-plan-list-item"

export async function getDevelopmentPlanListItems(
  companyId: string
): Promise<DevelopmentPlanListData> {
  const [
    plans,
    employeesData,
    templatesData,
  ] = await Promise.all([
    getDevelopmentPlans(companyId),
    getManagementPeople(companyId),
    getManagementDevelopmentTemplates(companyId),
  ])

  const employees = employeesData ?? []

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

        templateName: plan.templateId
          ? templateNameById.get(
              plan.templateId
            ) ?? "Template não encontrado"
          : null,

        progress: plan.progressPercent,
      }
    }),
  }
}
