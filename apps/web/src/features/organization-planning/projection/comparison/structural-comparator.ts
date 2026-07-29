import type { StructuralComparison } from "./comparison-contracts"
import { changedFields, freezeEntity, indexById, sortById } from "./comparison-support"

type Archivable = Readonly<{ id: string; status: "active" | "archived" }>

export function compareStructural<TEntity extends Archivable, TField extends Exclude<keyof TEntity, "id" | "status"> & string>(
  beforeEntities: readonly TEntity[],
  afterEntities: readonly TEntity[],
  fields: readonly TField[],
  collection: string
): StructuralComparison<TEntity, TField> {
  const beforeById = indexById(beforeEntities, `${collection}.before`)
  const afterById = indexById(afterEntities, `${collection}.after`)
  const created = []
  const updated = []
  const archived = []
  const removed = []

  for (const after of sortById(afterEntities)) {
    const before = beforeById.get(after.id)
    if (!before) {
      created.push(Object.freeze({ entity: freezeEntity(after) }))
      continue
    }
    const changes = changedFields(before, after, fields)
    if (changes.length > 0) updated.push(Object.freeze({ before: freezeEntity(before), after: freezeEntity(after), changedFields: changes }))
    if (before.status !== "archived" && after.status === "archived") archived.push(Object.freeze({ before: freezeEntity(before), after: freezeEntity(after) }))
  }
  for (const before of sortById(beforeEntities)) {
    if (!afterById.has(before.id)) removed.push(Object.freeze({ entity: freezeEntity(before) }))
  }
  return Object.freeze({ created: Object.freeze(created), updated: Object.freeze(updated), archived: Object.freeze(archived), removed: Object.freeze(removed) })
}
