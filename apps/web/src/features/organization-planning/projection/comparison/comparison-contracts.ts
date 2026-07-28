import type {
  ProjectedDepartment,
  ProjectedEmployee,
  ProjectedOrganization,
  ProjectedPosition,
  ProjectedTeam,
  ProjectionMetrics,
} from "../contracts"

export type EntityCreated<TEntity> = Readonly<{
  entity: TEntity
}>

export type EntityUpdated<TEntity, TField extends string> = Readonly<{
  before: TEntity
  after: TEntity
  changedFields: readonly TField[]
}>

export type EntityArchived<TEntity> = Readonly<{
  before: TEntity
  after: TEntity
}>

export type EntityRemoved<TEntity> = Readonly<{
  entity: TEntity
}>

export type StructuralEntityComparison<
  TEntity,
  TField extends string,
> = Readonly<{
  created: readonly EntityCreated<TEntity>[]
  updated: readonly EntityUpdated<TEntity, TField>[]
  archived: readonly EntityArchived<TEntity>[]
  removed: readonly EntityRemoved<TEntity>[]
}>

export type DepartmentComparisonField = Exclude<
  keyof ProjectedDepartment,
  "id" | "status"
>

export type TeamComparisonField = Exclude<
  keyof ProjectedTeam,
  "id" | "status"
>

export type PositionComparisonField = Exclude<
  keyof ProjectedPosition,
  "id" | "status"
>

export type DepartmentComparison = StructuralEntityComparison<
  ProjectedDepartment,
  DepartmentComparisonField
>

export type TeamComparison = StructuralEntityComparison<
  ProjectedTeam,
  TeamComparisonField
>

export type PositionComparison = StructuralEntityComparison<
  ProjectedPosition,
  PositionComparisonField
>

export type EmployeeMoved = Readonly<{
  before: ProjectedEmployee
  after: ProjectedEmployee
  previousDepartmentId: string | null
  departmentId: string | null
  previousTeamId: string | null
  teamId: string | null
  previousPositionId: string | null
  positionId: string | null
}>

export type EmployeeComparison = Readonly<{
  added: readonly EntityCreated<ProjectedEmployee>[]
  moved: readonly EmployeeMoved[]
  removed: readonly EntityRemoved<ProjectedEmployee>[]
}>

export type ComparisonCountSummary = Readonly<{
  created: number
  updated: number
  archived: number
  removed: number
  total: number
}>

export type EmployeeCountSummary = Readonly<{
  added: number
  moved: number
  removed: number
  total: number
}>

export type MetricComparison = Readonly<{
  before: number
  after: number
  delta: number
}>

export type ComparisonMetricKey = Exclude<
  keyof ProjectionMetrics,
  "salaryMass"
>

export type MetricsComparison = Readonly<{
  [TMetric in ComparisonMetricKey]: MetricComparison
}>

export type ComparisonSummary = Readonly<{
  departments: ComparisonCountSummary
  teams: ComparisonCountSummary
  positions: ComparisonCountSummary
  employees: EmployeeCountSummary
  metrics: MetricsComparison
  totalChanges: number
}>

export type ScenarioComparisonInput = Readonly<{
  baseOrganization: ProjectedOrganization
  projectedOrganization: ProjectedOrganization
}>

export type ScenarioComparisonResult = Readonly<{
  departments: DepartmentComparison
  teams: TeamComparison
  positions: PositionComparison
  employees: EmployeeComparison
  summary: ComparisonSummary
}>
