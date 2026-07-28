import type { ProjectionMetrics } from "../contracts"
import type {
  ComparisonCountSummary,
  ComparisonMetricKey,
  ComparisonSummary,
  DepartmentComparison,
  EmployeeComparison,
  EmployeeCountSummary,
  MetricComparison,
  MetricsComparison,
  PositionComparison,
  TeamComparison,
} from "./comparison-contracts"

type ComparisonSummaryInput = Readonly<{
  departments: DepartmentComparison
  teams: TeamComparison
  positions: PositionComparison
  employees: EmployeeComparison
  baseMetrics: ProjectionMetrics
  projectedMetrics: ProjectionMetrics
}>

const METRIC_KEYS = Object.freeze([
  "headcount",
  "vacancies",
  "departments",
  "positions",
] as const satisfies readonly ComparisonMetricKey[])

export function createComparisonSummary(
  input: ComparisonSummaryInput
): ComparisonSummary {
  const departments = summarizeStructural(input.departments)
  const teams = summarizeStructural(input.teams)
  const positions = summarizeStructural(input.positions)
  const employees = summarizeEmployees(input.employees)

  return Object.freeze({
    departments,
    teams,
    positions,
    employees,
    metrics: compareMetrics(
      input.baseMetrics,
      input.projectedMetrics
    ),
    totalChanges:
      departments.total +
      teams.total +
      positions.total +
      employees.total,
  })
}

function summarizeStructural(input: {
  readonly created: readonly unknown[]
  readonly updated: readonly unknown[]
  readonly archived: readonly unknown[]
  readonly removed: readonly unknown[]
}): ComparisonCountSummary {
  const created = input.created.length
  const updated = input.updated.length
  const archived = input.archived.length
  const removed = input.removed.length

  return Object.freeze({
    created,
    updated,
    archived,
    removed,
    total: created + updated + archived + removed,
  })
}

function summarizeEmployees(
  input: EmployeeComparison
): EmployeeCountSummary {
  const added = input.added.length
  const moved = input.moved.length
  const removed = input.removed.length

  return Object.freeze({
    added,
    moved,
    removed,
    total: added + moved + removed,
  })
}

function compareMetrics(
  before: ProjectionMetrics,
  after: ProjectionMetrics
): MetricsComparison {
  return Object.freeze(
    Object.fromEntries(
      METRIC_KEYS.map((key) => [
        key,
        metricComparison(before[key], after[key]),
      ])
    )
  ) as MetricsComparison
}

function metricComparison(
  before: number,
  after: number
): MetricComparison {
  return Object.freeze({
    before,
    after,
    delta: after - before,
  })
}
