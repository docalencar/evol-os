import type { CanonicalPersonCompetencyCoverage } from "@/features/competencies/person-competency-gaps/types/person-competency-gap"

import type {
  DashboardCompetencyDevelopment,
  DashboardCompetencyDevelopmentItem,
  DashboardCompetencyStatus,
  DashboardPersonCompetencySummary,
} from "../types/dashboard-competency-development"

type DashboardPersonIdentity = Readonly<{
  personId: string
  personName: string
}>

function getStatus(gap: number | null): DashboardCompetencyStatus {
  if (gap === null) return "unassessed"
  if (gap > 0) return "deficiency"
  if (gap < 0) return "exceeds"
  return "meets"
}

export function presentDashboardCompetencyDevelopment(
  people: readonly DashboardPersonIdentity[],
  coverages: readonly CanonicalPersonCompetencyCoverage[],
): DashboardCompetencyDevelopment {
  const personNameById = new Map(
    people.map((person) => [person.personId, person.personName]),
  )
  const items: DashboardCompetencyDevelopmentItem[] = []
  const personSummaries: DashboardPersonCompetencySummary[] = []

  for (const coverage of coverages) {
    const personName = personNameById.get(coverage.personId) ?? "Colaborador"
    const personItems = coverage.competencies.map((competency) => ({
      personId: coverage.personId,
      personName,
      competencyId: competency.competencyId,
      competencyName: competency.competencyName,
      expectedLevel: competency.expectedLevel,
      currentLevel: competency.currentLevel,
      gap: competency.gap,
      status: getStatus(competency.gap),
    }))

    items.push(...personItems)
    personSummaries.push(Object.freeze({
      personId: coverage.personId,
      personName,
      assignmentState: coverage.assignmentState,
      assessed: personItems.filter((item) => item.status !== "unassessed").length,
      unassessed: personItems.filter((item) => item.status === "unassessed").length,
      deficiencies: personItems.filter((item) => item.status === "deficiency").length,
      meets: personItems.filter((item) => item.status === "meets").length,
      exceeds: personItems.filter((item) => item.status === "exceeds").length,
    }))
  }

  const priorities = items
    .filter((item) => item.status === "deficiency")
    .sort((left, right) =>
      (right.gap ?? 0) - (left.gap ?? 0)
      || left.competencyName.localeCompare(right.competencyName)
      || left.personId.localeCompare(right.personId)
      || left.competencyId.localeCompare(right.competencyId),
    )

  return Object.freeze({
    assessed: items.filter((item) => item.status !== "unassessed").length,
    unassessed: items.filter((item) => item.status === "unassessed").length,
    deficiencies: items.filter((item) => item.status === "deficiency").length,
    meets: items.filter((item) => item.status === "meets").length,
    exceeds: items.filter((item) => item.status === "exceeds").length,
    people: Object.freeze(personSummaries),
    priorities: Object.freeze(priorities),
  })
}
