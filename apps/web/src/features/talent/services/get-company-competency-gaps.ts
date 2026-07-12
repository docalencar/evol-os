import {
  getEmployees,
  type Employee,
} from "@/features/people"

import {
  getEmployeeCompetencyGaps,
} from "../queries/get-employee-competency-gaps"

import type {
  CompanyCompetencyGap,
} from "../types/company-competency-gap"

type CompetencyGapAccumulator = {
  competencyId: string

  competencyName: string

  gapTotal: number

  worstGap: number

  employeeIds: Set<string>
}

export async function getCompanyCompetencyGaps(
  companyId: string
): Promise<CompanyCompetencyGap[]> {
  const employeesData =
    await getEmployees(companyId)

  const employees =
    (employeesData ?? []) as Employee[]

  const eligibleEmployees = employees.filter(
    (employee) =>
      employee.status === "active" ||
      employee.status === "on_leave"
  )

  const employeeGaps = await Promise.all(
    eligibleEmployees.map(
      async (employee) => ({
        employeeId: employee.id,

        gaps:
          await getEmployeeCompetencyGaps(
            companyId,
            employee.id
          ),
      })
    )
  )

  const gapByCompetency = new Map<
    string,
    CompetencyGapAccumulator
  >()

  for (const employeeGap of employeeGaps) {
    for (const gap of employeeGap.gaps) {
      if (gap.gap >= 0) {
        continue
      }

      const current =
        gapByCompetency.get(
          gap.competencyId
        )

      if (!current) {
        gapByCompetency.set(
          gap.competencyId,
          {
            competencyId:
              gap.competencyId,

            competencyName:
              gap.competencyName,

            gapTotal: gap.gap,

            worstGap: gap.gap,

            employeeIds: new Set([
              employeeGap.employeeId,
            ]),
          }
        )

        continue
      }

      current.gapTotal += gap.gap

      current.worstGap = Math.min(
        current.worstGap,
        gap.gap
      )

      current.employeeIds.add(
        employeeGap.employeeId
      )
    }
  }

  return Array.from(
    gapByCompetency.values()
  )
    .map((competency) => ({
      competencyId:
        competency.competencyId,

      competencyName:
        competency.competencyName,

      averageGap:
        Math.round(
          (competency.gapTotal /
            competency.employeeIds.size) *
            10
        ) / 10,

      worstGap:
        competency.worstGap,

      affectedEmployees:
        competency.employeeIds.size,
    }))
    .sort((first, second) => {
      if (
        first.averageGap !==
        second.averageGap
      ) {
        return (
          first.averageGap -
          second.averageGap
        )
      }

      return (
        second.affectedEmployees -
        first.affectedEmployees
      )
    })
}