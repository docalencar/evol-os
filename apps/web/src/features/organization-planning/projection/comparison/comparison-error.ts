export class ScenarioComparisonError extends Error {
  constructor(
    readonly code: "company_mismatch" | "workspace_mismatch" | "organization_missing" | "duplicate_entity_id",
    message: string
  ) {
    super(message)
    this.name = "ScenarioComparisonError"
  }
}
