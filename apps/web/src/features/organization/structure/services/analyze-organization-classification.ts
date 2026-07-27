import type {
  OrganizationClassificationInsight,
} from "../types/organization-classification"


type DepartmentLike = {
  id: string
  name: string
  organization_unit_id?: string | null
}


export function analyzeOrganizationClassification(
  departments: DepartmentLike[]
): OrganizationClassificationInsight {

  const unassignedDepartments =
    departments.filter(
      (department) =>
        !department.organization_unit_id
    )


  const suggestedUnits =
    unassignedDepartments
      .map(
        (department) =>
          department.name
      )


  const count =
    suggestedUnits.length


  if (count === 0) {
    return {
      unassignedDepartments: 0,
      suggestedUnits: [],
      severity: "low",
      message:
        "A estrutura organizacional está classificada.",
    }
  }


  if (count >= 5) {
    return {
      unassignedDepartments: count,
      suggestedUnits,
      severity: "high",
      message:
        "Foram encontrados registros que podem representar unidades organizacionais.",
    }
  }


  return {
    unassignedDepartments: count,
    suggestedUnits,
    severity: "medium",
    message:
      "Existem registros sem unidade organizacional definida.",
  }
}
