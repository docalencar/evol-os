import { getManagementPeople } from "@/features/dashboard-read"

import { getPublishedDevelopmentTemplateCatalog } from "@/features/development/templates"

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
    // Decoration only: plans carry a template CONTAINER id and the table shows
    // its name. The published catalog is the narrowest trusted boundary that
    // every active member may read, so a participant-scoped plan list no longer
    // drags a tenant-wide authoring read behind it. A template with no published
    // version simply has no name to show — authoring visibility is not something
    // this surface may grant.
    getPublishedDevelopmentTemplateCatalog(companyId),
  ])

  const employees = employeesData ?? []

  const templates = templatesData ?? []

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
      template.templateId,
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
            ) ?? "Template não disponível"
          : null,

        progress: plan.progressPercent,
      }
    }),
  }
}
