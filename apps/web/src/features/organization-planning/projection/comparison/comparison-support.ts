import { ScenarioComparisonError } from "./comparison-error"

type Entity = Readonly<{ id: string }>

export function indexById<TEntity extends Entity>(entities: readonly TEntity[], collection: string) {
  const result = new Map<string, TEntity>()
  for (const entity of entities) {
    if (result.has(entity.id)) {
      throw new ScenarioComparisonError("duplicate_entity_id", `A coleção ${collection} possui o identificador duplicado ${entity.id}.`)
    }
    result.set(entity.id, entity)
  }
  return result
}

export function sortById<TEntity extends Entity>(entities: readonly TEntity[]) {
  return [...entities].sort((left, right) => left.id.localeCompare(right.id))
}

export function freezeEntity<TEntity extends object>(entity: TEntity): Readonly<TEntity> {
  return Object.freeze({ ...entity })
}

export function changedFields<TEntity extends object, TField extends keyof TEntity & string>(before: TEntity, after: TEntity, fields: readonly TField[]) {
  return Object.freeze(fields.filter((field) => before[field] !== after[field]))
}
