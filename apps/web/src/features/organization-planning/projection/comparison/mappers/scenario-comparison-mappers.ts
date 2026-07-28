import type {
  DepartmentComparison,
  EmployeeComparison,
  PositionComparison,
  TeamComparison,
} from "../comparison-contracts"
import type {
  DepartmentComparisonItemViewModel,
  EmployeeComparisonItemViewModel,
  EmployeeComparisonViewModel,
  PositionComparisonItemViewModel,
  StructuralComparisonViewModel,
  TeamComparisonItemViewModel,
} from "../view-models"

export function mapDepartmentComparison(
  comparison: DepartmentComparison
): StructuralComparisonViewModel<DepartmentComparisonItemViewModel> {
  return mapStructuralComparison(comparison, (department) => ({
    id: department.id,
    name: department.name,
    code: department.code,
    description: department.description,
    parentDepartmentId: department.parentDepartmentId,
    status: department.status,
  }))
}

export function mapTeamComparison(
  comparison: TeamComparison
): StructuralComparisonViewModel<TeamComparisonItemViewModel> {
  return mapStructuralComparison(comparison, (team) => ({
    id: team.id,
    name: team.name,
    code: team.code,
    description: team.description,
    departmentId: team.departmentId,
    status: team.status,
  }))
}

export function mapPositionComparison(
  comparison: PositionComparison
): StructuralComparisonViewModel<PositionComparisonItemViewModel> {
  return mapStructuralComparison(comparison, (position) => ({
    id: position.id,
    name: position.name,
    description: position.description,
    departmentId: position.departmentId,
    hierarchicalLevel: position.hierarchicalLevel,
    weeklyWorkloadHours: position.weeklyWorkloadHours,
    workModel: position.workModel,
    employmentType: position.employmentType,
    travelRequirement: position.travelRequirement,
    status: position.status,
  }))
}

export function mapEmployeeComparison(
  comparison: EmployeeComparison
): EmployeeComparisonViewModel {
  return {
    added: comparison.added.map(({ entity }) => ({
      entity: mapEmployee(entity),
    })),
    moved: comparison.moved.map((move) => ({
      employee: mapEmployee(move.after),
      previousDepartmentId: move.previousDepartmentId,
      departmentId: move.departmentId,
      previousTeamId: move.previousTeamId,
      teamId: move.teamId,
      previousPositionId: move.previousPositionId,
      positionId: move.positionId,
    })),
    removed: comparison.removed.map(({ entity }) => ({
      entity: mapEmployee(entity),
    })),
  }
}

type StructuralComparison<TEntity, TField extends string> = Readonly<{
  created: readonly Readonly<{ entity: TEntity }>[]
  updated: readonly Readonly<{
    before: TEntity
    after: TEntity
    changedFields: readonly TField[]
  }>[]
  archived: readonly Readonly<{ before: TEntity; after: TEntity }>[]
  removed: readonly Readonly<{ entity: TEntity }>[]
}>

function mapStructuralComparison<TEntity, TField extends string, TViewModel>(
  comparison: StructuralComparison<TEntity, TField>,
  mapEntity: (entity: TEntity) => TViewModel
): StructuralComparisonViewModel<TViewModel> {
  return {
    created: comparison.created.map(({ entity }) => ({
      entity: mapEntity(entity),
    })),
    updated: comparison.updated.map(({ before, after, changedFields }) => ({
      before: mapEntity(before),
      after: mapEntity(after),
      changedFields: [...changedFields],
    })),
    archived: comparison.archived.map(({ before, after }) => ({
      before: mapEntity(before),
      after: mapEntity(after),
    })),
    removed: comparison.removed.map(({ entity }) => ({
      entity: mapEntity(entity),
    })),
  }
}

function mapEmployee(employee: {
  readonly id: string
  readonly positionId: string | null
}): EmployeeComparisonItemViewModel {
  return {
    id: employee.id,
    positionId: employee.positionId,
  }
}
