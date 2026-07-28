import type {
  EntityArchived,
  EntityCreated,
  EntityRemoved,
  EntityUpdated,
  StructuralEntityComparison,
} from "./comparison-contracts"

type IdentifiableEntity = Readonly<{
  id: string
}>

type ArchivableEntity = IdentifiableEntity & Readonly<{
  status: "active" | "archived"
}>

export function compareStructuralEntities<
  TEntity extends ArchivableEntity,
  TField extends Exclude<keyof TEntity, "id" | "status"> & string,
>(
  baseEntities: readonly TEntity[],
  projectedEntities: readonly TEntity[],
  comparableFields: readonly TField[]
): StructuralEntityComparison<TEntity, TField> {
  const baseById = indexById(baseEntities)
  const projectedById = indexById(projectedEntities)
  const created: EntityCreated<TEntity>[] = []
  const updated: EntityUpdated<TEntity, TField>[] = []
  const archived: EntityArchived<TEntity>[] = []
  const removed: EntityRemoved<TEntity>[] = []

  for (const after of sortById(projectedEntities)) {
    const before = baseById.get(after.id)

    if (!before) {
      created.push(Object.freeze({ entity: freezeEntity(after) }))
      continue
    }

    const changedFields = comparableFields.filter(
      (field) => before[field] !== after[field]
    )

    if (changedFields.length > 0) {
      updated.push(Object.freeze({
        before: freezeEntity(before),
        after: freezeEntity(after),
        changedFields: Object.freeze([...changedFields]),
      }))
    }

    if (before.status !== "archived" && after.status === "archived") {
      archived.push(Object.freeze({
        before: freezeEntity(before),
        after: freezeEntity(after),
      }))
    }
  }

  for (const before of sortById(baseEntities)) {
    if (!projectedById.has(before.id)) {
      removed.push(Object.freeze({ entity: freezeEntity(before) }))
    }
  }

  return Object.freeze({
    created: Object.freeze(created),
    updated: Object.freeze(updated),
    archived: Object.freeze(archived),
    removed: Object.freeze(removed),
  })
}

export function indexById<TEntity extends IdentifiableEntity>(
  entities: readonly TEntity[]
): ReadonlyMap<string, TEntity> {
  return new Map(entities.map((entity) => [entity.id, entity]))
}

export function sortById<TEntity extends IdentifiableEntity>(
  entities: readonly TEntity[]
): readonly TEntity[] {
  return [...entities].sort((left, right) =>
    left.id.localeCompare(right.id)
  )
}

export function freezeEntity<TEntity extends object>(
  entity: TEntity
): Readonly<TEntity> {
  return Object.freeze({ ...entity })
}
