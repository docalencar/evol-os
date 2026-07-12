import {
  getEmployees,
  type Employee,
} from "@/features/people"

import {
  getEmployeeCompetencyGaps,
} from "../queries/get-employee-competency-gaps"

import {
  createEmployeeInsights,
} from "./create-employee-insights"

import type {
  DevelopmentPriority,
} from "../types/development-priority"

export async function getDevelopmentPriorities(
  companyId: string
): Promise<DevelopmentPriority[]> {
  const employeesData =
    await getEmployees(companyId)

  const employees =
    (employeesData ?? []) as Employee[]

  const eligibleEmployees =
    employees.filter(
      (employee) =>
        employee.status === "active" ||
        employee.status === "on_leave"
    )

  const priorities =
    await Promise.all(
      eligibleEmployees.map(
        async (employee) => {
          const gaps =
            await getEmployeeCompetencyGaps(
              companyId,
              employee.id
            )

          const insights =
            createEmployeeInsights(gaps)

          const criticalGaps =
            gaps.filter(
              (gap) =>
                gap.status ===
                "critical"
            ).length

          const attentionGaps =
            gaps.filter(
              (gap) =>
                gap.status ===
                "attention"
            ).length

          return {
            employeeId: employee.id,

            employeeName:
              employee.full_name,

            risk: insights.risk,

            criticalGaps,

            attentionGaps,

            biggestGap:
              insights.biggestGap,
          }
        }
      )
    )

  return priorities.sort(
    (first, second) => {
      const weight = {
        high: 3,
        medium: 2,
        low: 1,
      }

      if (
        weight[first.risk] !==
        weight[second.risk]
      ) {
        return (
          weight[second.risk] -
          weight[first.risk]
        )
      }

      return (
        second.criticalGaps -
        first.criticalGaps
      )
    }
  )
}