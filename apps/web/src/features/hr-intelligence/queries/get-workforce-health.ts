import {
  getEmployeeIntelligenceList,
} from "@/features/people"

import type { WorkforceHealth } from "../types/workforce-health"

export async function getWorkforceHealth(
  companyId: string
): Promise<WorkforceHealth> {
  const employees =
    await getEmployeeIntelligenceList(companyId)

  const totalEmployees = employees.length

  const criticalEmployees = employees.filter(
    (employee) =>
      employee.assessments.completedAssessments === 0 &&
      employee.development.activePlans === 0
  ).length

  const attentionEmployees = employees.filter(
    (employee) => {
      const hasCompletedAssessment =
        employee.assessments.completedAssessments > 0

      const hasActiveDevelopmentPlan =
        employee.development.activePlans > 0

      return (
        hasCompletedAssessment !==
        hasActiveDevelopmentPlan
      )
    }
  ).length

  const healthyEmployees =
    totalEmployees -
    criticalEmployees -
    attentionEmployees

  return {
    totalEmployees,
    healthyEmployees,
    attentionEmployees,
    criticalEmployees,
  }
}
