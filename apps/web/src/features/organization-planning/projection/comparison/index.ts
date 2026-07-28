export {
  ScenarioComparisonEngine,
} from "./scenario-comparison-engine"

export { compareDepartments } from "./department-comparator"
export { compareTeams } from "./team-comparator"
export { comparePositions } from "./position-comparator"
export { compareEmployees } from "./employee-comparator"
export { createComparisonSummary } from "./comparison-summary"
export * from "./components"
export * from "./presenters"
export * from "./view-models"

export type {
  ComparisonCountSummary,
  ComparisonMetricKey,
  ComparisonSummary,
  DepartmentComparison,
  DepartmentComparisonField,
  EmployeeComparison,
  EmployeeCountSummary,
  EmployeeMoved,
  EntityArchived,
  EntityCreated,
  EntityRemoved,
  EntityUpdated,
  MetricComparison,
  MetricsComparison,
  PositionComparison,
  PositionComparisonField,
  ScenarioComparisonInput,
  ScenarioComparisonResult,
  StructuralEntityComparison,
  TeamComparison,
  TeamComparisonField,
} from "./comparison-contracts"
