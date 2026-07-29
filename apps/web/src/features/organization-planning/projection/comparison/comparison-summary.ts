import type { ComparisonCount, ComparisonSummary, EmployeeComparison, MetricsComparison, ScenarioComparisonResult, VacancyComparison } from "./comparison-contracts"

export function compareMetrics(before: { headcount: number; vacancies: number; departments: number; positions: number }, after: { headcount: number; vacancies: number; departments: number; positions: number }): MetricsComparison {
  return Object.freeze({
    headcount: delta(before.headcount, after.headcount),
    vacancies: delta(before.vacancies, after.vacancies),
    departments: delta(before.departments, after.departments),
    positions: delta(before.positions, after.positions),
  })
}

export function createComparisonSummary(input: Omit<ScenarioComparisonResult, "summary">): ComparisonSummary {
  const departments = structural(input.departments)
  const teams = structural(input.teams)
  const positions = structural(input.positions)
  const employees = employee(input.employees)
  const vacancies = vacancy(input.vacancies)
  return Object.freeze({
    departments, teams, positions, employees, vacancies, metrics: input.metrics,
    totalChanges: departments.total + teams.total + positions.total + employees.total + vacancies.total,
  })
}

function structural(value: { created: readonly unknown[]; updated: readonly unknown[]; archived: readonly unknown[]; removed: readonly unknown[] }): ComparisonCount {
  const created = value.created.length, updated = value.updated.length, archived = value.archived.length, removed = value.removed.length
  return Object.freeze({ created, updated, archived, removed, total: created + updated + archived + removed })
}
function employee(value: EmployeeComparison) {
  const created = value.created.length, updated = value.updated.length, transferred = value.transferred.length, terminated = value.terminated.length, removed = value.removed.length
  return Object.freeze({ created, updated, transferred, terminated, removed, total: created + updated + transferred + terminated + removed })
}
function vacancy(value: VacancyComparison) {
  const created = value.created.length, updated = value.updated.length, closed = value.closed.length, removed = value.removed.length
  return Object.freeze({ created, updated, closed, removed, total: created + updated + closed + removed })
}
function delta(before: number, after: number) {
  return Object.freeze({ before, after, delta: after - before })
}
