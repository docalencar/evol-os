export type OrganizationClassificationInsight = {
  unassignedDepartments: number

  suggestedUnits: string[]

  severity:
    | "low"
    | "medium"
    | "high"

  message: string
}
