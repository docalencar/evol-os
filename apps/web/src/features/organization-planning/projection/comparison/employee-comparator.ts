import type { ProjectedEmployee } from "../contracts"
import type { EmployeeComparison } from "./comparison-contracts"
import { freezeEntity, indexById, sortById } from "./comparison-support"

const placementFields = new Set(["departmentId", "teamId", "positionId"])

export function compareEmployees(beforeEmployees: readonly ProjectedEmployee[], afterEmployees: readonly ProjectedEmployee[]): EmployeeComparison {
  const beforeById = indexById(beforeEmployees, "employees.before")
  const afterById = indexById(afterEmployees, "employees.after")
  const created = [], updated = [], transferred = [], terminated = [], removed = []
  for (const after of sortById(afterEmployees)) {
    const before = beforeById.get(after.id)
    if (!before) {
      created.push(Object.freeze({ entity: freezeEntity(after) }))
      continue
    }
    const beforeStatus = before.status ?? "active"
    const afterStatus = after.status ?? "active"
    if (beforeStatus !== "archived" && afterStatus === "archived") {
      terminated.push(Object.freeze({ before: freezeEntity(before), after: freezeEntity(after) }))
    }
    if ((before.departmentId ?? null) !== (after.departmentId ?? null) || (before.teamId ?? null) !== (after.teamId ?? null) || before.positionId !== after.positionId) {
      transferred.push(Object.freeze({ before: freezeEntity(before), after: freezeEntity(after) }))
    }
    const fields = Object.keys({ ...before, ...after }).filter((field) => field !== "id" && field !== "status" && !placementFields.has(field)).sort()
      .filter((field) => (before as Record<string, unknown>)[field] !== (after as Record<string, unknown>)[field])
    if (fields.length > 0) updated.push(Object.freeze({ before: freezeEntity(before), after: freezeEntity(after), changedFields: Object.freeze(fields) }))
  }
  for (const before of sortById(beforeEmployees)) {
    if (!afterById.has(before.id)) removed.push(Object.freeze({ entity: freezeEntity(before) }))
  }
  return Object.freeze({ created: Object.freeze(created), updated: Object.freeze(updated), transferred: Object.freeze(transferred), terminated: Object.freeze(terminated), removed: Object.freeze(removed) })
}
