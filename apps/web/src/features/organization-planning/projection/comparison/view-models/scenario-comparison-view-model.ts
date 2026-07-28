export type ComparisonEntityStatusViewModel = "active" | "archived"

export type DepartmentComparisonItemViewModel = Readonly<{
  id: string
  name: string
  code: string | null
  description: string | null
  parentDepartmentId: string | null
  status: ComparisonEntityStatusViewModel
}>

export type TeamComparisonItemViewModel = Readonly<{
  id: string
  name: string
  code: string | null
  description: string | null
  departmentId: string | null
  status: ComparisonEntityStatusViewModel
}>

export type PositionComparisonItemViewModel = Readonly<{
  id: string
  name: string
  description: string | null
  departmentId: string | null
  hierarchicalLevel: string
  weeklyWorkloadHours: number
  workModel: string
  employmentType: string
  travelRequirement: string
  status: ComparisonEntityStatusViewModel
}>

export type EmployeeComparisonItemViewModel = Readonly<{
  id: string
  positionId: string | null
}>

export type CreatedComparisonViewModel<TEntity> = Readonly<{
  entity: TEntity
}>

export type UpdatedComparisonViewModel<TEntity> = Readonly<{
  before: TEntity
  after: TEntity
  changedFields: readonly string[]
}>

export type ArchivedComparisonViewModel<TEntity> = Readonly<{
  before: TEntity
  after: TEntity
}>

export type RemovedComparisonViewModel<TEntity> = Readonly<{
  entity: TEntity
}>

export type StructuralComparisonViewModel<TEntity> = Readonly<{
  created: readonly CreatedComparisonViewModel<TEntity>[]
  updated: readonly UpdatedComparisonViewModel<TEntity>[]
  archived: readonly ArchivedComparisonViewModel<TEntity>[]
  removed: readonly RemovedComparisonViewModel<TEntity>[]
}>

export type EmployeeMoveViewModel = Readonly<{
  employee: EmployeeComparisonItemViewModel
  previousDepartmentId: string | null
  departmentId: string | null
  previousTeamId: string | null
  teamId: string | null
  previousPositionId: string | null
  positionId: string | null
}>

export type EmployeeComparisonViewModel = Readonly<{
  added: readonly CreatedComparisonViewModel<EmployeeComparisonItemViewModel>[]
  moved: readonly EmployeeMoveViewModel[]
  removed: readonly RemovedComparisonViewModel<EmployeeComparisonItemViewModel>[]
}>

export type StructuralComparisonCountViewModel = Readonly<{
  created: number
  updated: number
  archived: number
  removed: number
  total: number
}>

export type EmployeeComparisonCountViewModel = Readonly<{
  added: number
  moved: number
  removed: number
  total: number
}>

export type MetricComparisonViewModel = Readonly<{
  before: number
  after: number
  delta: number
}>

export type ComparisonMetricsViewModel = Readonly<{
  headcount: MetricComparisonViewModel
  vacancies: MetricComparisonViewModel
  departments: MetricComparisonViewModel
  positions: MetricComparisonViewModel
}>

export type ComparisonSummaryViewModel = Readonly<{
  departments: StructuralComparisonCountViewModel
  teams: StructuralComparisonCountViewModel
  positions: StructuralComparisonCountViewModel
  employees: EmployeeComparisonCountViewModel
  metrics: ComparisonMetricsViewModel
  totalChanges: number
}>

export type ScenarioComparisonViewModel = Readonly<{
  departments: StructuralComparisonViewModel<DepartmentComparisonItemViewModel>
  teams: StructuralComparisonViewModel<TeamComparisonItemViewModel>
  positions: StructuralComparisonViewModel<PositionComparisonItemViewModel>
  employees: EmployeeComparisonViewModel
  summary: ComparisonSummaryViewModel
}>
