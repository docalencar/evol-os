import type {
  ProjectedDepartment,
  ProjectedEmployee,
  ProjectedOrganization,
  ProjectedPosition,
  ProjectedTeam,
  ProjectedVacancy,
  ProjectionMetrics,
  ProjectionSnapshot,
} from "../contracts"

export type ComparisonSource = ProjectedOrganization | ProjectionSnapshot
export type ScenarioComparisonInput = Readonly<{ before: ComparisonSource; after: ComparisonSource }>

export type Created<TEntity> = Readonly<{ entity: TEntity }>
export type Changed<TEntity, TField extends string> = Readonly<{
  before: TEntity
  after: TEntity
  changedFields: readonly TField[]
}>
export type Transition<TEntity> = Readonly<{ before: TEntity; after: TEntity }>
export type Removed<TEntity> = Readonly<{ entity: TEntity }>

export type StructuralComparison<TEntity, TField extends string> = Readonly<{
  created: readonly Created<TEntity>[]
  updated: readonly Changed<TEntity, TField>[]
  archived: readonly Transition<TEntity>[]
  removed: readonly Removed<TEntity>[]
}>

export type DepartmentComparison = StructuralComparison<ProjectedDepartment, Exclude<keyof ProjectedDepartment, "id" | "status">>
export type TeamComparison = StructuralComparison<ProjectedTeam, Exclude<keyof ProjectedTeam, "id" | "status">>
export type PositionComparison = StructuralComparison<ProjectedPosition, Exclude<keyof ProjectedPosition, "id" | "status">>

export type EmployeeComparison = Readonly<{
  created: readonly Created<ProjectedEmployee>[]
  updated: readonly Changed<ProjectedEmployee, string>[]
  transferred: readonly Transition<ProjectedEmployee>[]
  terminated: readonly Transition<ProjectedEmployee>[]
  removed: readonly Removed<ProjectedEmployee>[]
}>

export type VacancyComparison = Readonly<{
  created: readonly Created<ProjectedVacancy>[]
  updated: readonly Changed<ProjectedVacancy, Exclude<keyof ProjectedVacancy, "id" | "status">>[]
  /** Mesmo ID presente nos dois estados, com transição lógica para archived. */
  closed: readonly Transition<ProjectedVacancy>[]
  /** ID fisicamente ausente na organização posterior; nunca inclui closed. */
  removed: readonly Removed<ProjectedVacancy>[]
}>

export type MetricDelta = Readonly<{ before: number; after: number; delta: number }>
export type MetricsComparison = Readonly<{
  headcount: MetricDelta
  vacancies: MetricDelta
  departments: MetricDelta
  positions: MetricDelta
}>
export type ComparisonCount = Readonly<{ created: number; updated: number; archived: number; removed: number; total: number }>
export type ComparisonSummary = Readonly<{
  departments: ComparisonCount
  teams: ComparisonCount
  positions: ComparisonCount
  employees: Readonly<{ created: number; updated: number; transferred: number; terminated: number; removed: number; total: number }>
  vacancies: Readonly<{ created: number; updated: number; closed: number; removed: number; total: number }>
  metrics: MetricsComparison
  totalChanges: number
}>

export type ScenarioComparisonResult = Readonly<{
  departments: DepartmentComparison
  teams: TeamComparison
  positions: PositionComparison
  employees: EmployeeComparison
  vacancies: VacancyComparison
  metrics: MetricsComparison
  summary: ComparisonSummary
}>

export type ComparableMetrics = Pick<ProjectionMetrics, "headcount" | "vacancies" | "departments" | "positions">
