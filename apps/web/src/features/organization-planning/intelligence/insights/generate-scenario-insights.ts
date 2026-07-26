import type {
  OrganizationSnapshot,
} from "../../snapshot"

import type {
  ProjectedOrganization,
} from "../../projection/contracts"

import type {
  ScenarioInsight,
} from "./types"


export function generateScenarioInsights(
  snapshot: OrganizationSnapshot,
  projectedOrganization: ProjectedOrganization
): readonly ScenarioInsight[] {
  const insights: ScenarioInsight[] = []

  const employeeVariation =
    projectedOrganization.employees.length -
    snapshot.employees.length


  if (employeeVariation > 0) {
    insights.push(
      Object.freeze({
        type: "headcount_growth",
        severity: "info",
        title: "Crescimento de quadro identificado",
        description:
          `O cenário aumenta o quadro em ${employeeVariation} colaborador(es).`,
      })
    )
  }


  if (employeeVariation < 0) {
    insights.push(
      Object.freeze({
        type: "headcount_reduction",
        severity: "warning",
        title: "Redução de quadro identificada",
        description:
          `O cenário reduz o quadro em ${Math.abs(employeeVariation)} colaborador(es).`,
      })
    )
  }


  return Object.freeze(insights)
}
