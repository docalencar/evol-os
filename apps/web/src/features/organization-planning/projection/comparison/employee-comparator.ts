import type { ProjectedEmployee } from "../contracts"
import type {
  EmployeeComparison,
  EmployeeMoved,
  EntityCreated,
  EntityRemoved,
} from "./comparison-contracts"
import {
  freezeEntity,
  indexById,
  sortById,
} from "./comparison-support"

export function compareEmployees(
  baseEmployees: readonly ProjectedEmployee[],
  projectedEmployees: readonly ProjectedEmployee[]
): EmployeeComparison {
  const baseById = indexById(baseEmployees)
  const projectedById = indexById(projectedEmployees)
  const added: EntityCreated<ProjectedEmployee>[] = []
  const moved: EmployeeMoved[] = []
  const removed: EntityRemoved<ProjectedEmployee>[] = []

  for (const after of sortById(projectedEmployees)) {
    const before = baseById.get(after.id)

    if (!before) {
      added.push(Object.freeze({ entity: freezeEntity(after) }))
      continue
    }

    if (before.positionId !== after.positionId) {
      moved.push(Object.freeze({
        before: freezeEntity(before),
        after: freezeEntity(after),
        previousPositionId: before.positionId,
        positionId: after.positionId,
      }))
    }
  }

  for (const before of sortById(baseEmployees)) {
    if (!projectedById.has(before.id)) {
      removed.push(Object.freeze({ entity: freezeEntity(before) }))
    }
  }

  return Object.freeze({
    added: Object.freeze(added),
    moved: Object.freeze(moved),
    removed: Object.freeze(removed),
  })
}
