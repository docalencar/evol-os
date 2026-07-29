import type { ProjectedVacancy } from "../contracts"
import type { VacancyComparison } from "./comparison-contracts"
import { freezeEntity, indexById, sortById } from "./comparison-support"

export function compareVacancies(beforeInput: readonly ProjectedVacancy[], afterInput: readonly ProjectedVacancy[]): VacancyComparison {
  const beforeById = indexById(beforeInput, "vacancies.before")
  const afterById = indexById(afterInput, "vacancies.after")
  const created = [], updated = [], closed = [], removed = []
  const placementFields = ["positionId", "departmentId", "teamId"] as const
  for (const after of sortById(afterInput)) {
    const before = beforeById.get(after.id)
    if (!before) {
      created.push(Object.freeze({ entity: freezeEntity(after) }))
      continue
    }
    const changedFields = placementFields.filter((field) => (before[field] ?? null) !== (after[field] ?? null))
    if (changedFields.length > 0) updated.push(Object.freeze({ before: freezeEntity(before), after: freezeEntity(after), changedFields: Object.freeze(changedFields) }))
    if ((before.status ?? "active") !== "archived" && after.status === "archived") closed.push(Object.freeze({ before: freezeEntity(before), after: freezeEntity(after) }))
  }
  for (const before of sortById(beforeInput)) {
    if (!afterById.has(before.id)) removed.push(Object.freeze({ entity: freezeEntity(before) }))
  }
  return Object.freeze({ created: Object.freeze(created), updated: Object.freeze(updated), closed: Object.freeze(closed), removed: Object.freeze(removed) })
}
