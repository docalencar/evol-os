import { getEmployeeCompetenciesByEmployee } from "@/features/competencies/employee-competencies"
import { getPositionCompetenciesByPosition } from "@/features/competencies/position-competencies"
import { getEmployeeById } from "@/features/people"

import { calculateCompetencyGap } from "../services/calculate-competency-gap"

type CompetencyRelation =
  | { name: string }
  | { name: string }[]
  | null

function getCompetencyName(relation: CompetencyRelation) {
  if (!relation) {
    return "Competência não identificada"
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name ?? "Competência não identificada"
  }

  return relation.name
}

export async function getEmployeeCompetencyGaps(
  companyId: string,
  employeeId: string
) {
  const employee = await getEmployeeById(companyId, employeeId)

  if (!employee?.position_id) {
    return []
  }

  const [
    positionCompetencies,
    employeeCompetencies,
  ] = await Promise.all([
    getPositionCompetenciesByPosition(
      companyId,
      employee.position_id
    ),
    getEmployeeCompetenciesByEmployee(companyId, employeeId),
  ])

  const currentLevelByCompetency = new Map(
    (employeeCompetencies ?? []).map((employeeCompetency) => [
      employeeCompetency.competency_id,
      employeeCompetency.current_level,
    ])
  )

  return (positionCompetencies ?? []).map((positionCompetency) =>
    calculateCompetencyGap({
      competencyId: positionCompetency.competency_id,
      competencyName: getCompetencyName(
        positionCompetency.competencies as CompetencyRelation
      ),
      currentLevel:
        currentLevelByCompetency.get(positionCompetency.competency_id) ?? 0,
      expectedLevel: positionCompetency.expected_level,
      weight: positionCompetency.weight,
      required: positionCompetency.required,
    })
  )
}
