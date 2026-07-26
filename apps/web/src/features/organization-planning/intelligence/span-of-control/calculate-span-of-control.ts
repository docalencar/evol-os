import type {
  ProjectedOrganization,
} from "../../projection"


import type {
  ManagerSpanAnalysis,
  SpanOfControlResult,
} from "./types"


function classifySpan(
  directReports: number
) {
  if (directReports > 15) {
    return "critical" as const
  }

  if (directReports > 10) {
    return "attention" as const
  }

  return "healthy" as const
}


export function calculateSpanOfControl(
  organization: ProjectedOrganization
): SpanOfControlResult {

  const reportsByManager =
    new Map<string, number>()


  for (const employee of organization.employees) {

    if (!employee.managerId) {
      continue
    }

    const current =
      reportsByManager.get(
        employee.managerId
      ) ?? 0

    reportsByManager.set(
      employee.managerId,
      current + 1
    )
  }


  const managers =
    organization.employees
      .filter((employee) =>
        reportsByManager.has(employee.id)
      )
      .map((manager) => {

        const directReports =
          reportsByManager.get(
            manager.id
          ) ?? 0

        const level =
          classifySpan(directReports)


        return Object.freeze({
          employeeId: manager.id,
          directReports,
          level,
          message:
            level === "critical"
              ? "Quantidade elevada de liderados. Revisar estrutura de liderança."
              : level === "attention"
                ? "Quantidade de liderados acima do recomendado."
                : "Estrutura de liderança adequada.",
        })
      })


  return Object.freeze({
    managers: Object.freeze(managers),
    totalManagers: managers.length,
    attentionCount:
      managers.filter(
        (manager) =>
          manager.level === "attention"
      ).length,
    criticalCount:
      managers.filter(
        (manager) =>
          manager.level === "critical"
      ).length,
  })
}
