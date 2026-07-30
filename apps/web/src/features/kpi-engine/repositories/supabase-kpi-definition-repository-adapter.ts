import type { KPIDefinitionRepository } from "./kpi-definition-repository"
import {
  mapPersistedKPIDefinition,
  toPersistedKPIDefinition,
  type KPIDefinitionCalculatorResolver,
} from "./kpi-definition-persistence-record"
import type { KPIDefinitionVersion } from "../registry"

type DatabaseResult = Readonly<{
  data: unknown
  error: Readonly<{ message: string }> | null
}>

interface DefinitionQuery extends PromiseLike<DatabaseResult> {
  eq(column: string, value: string | number | boolean): DefinitionQuery
  lte(column: string, value: string): DefinitionQuery
  or(filter: string): DefinitionQuery
  order(column: string, options: Readonly<{ ascending: boolean }>): DefinitionQuery
  limit(value: number): DefinitionQuery
  maybeSingle(): PromiseLike<DatabaseResult>
}

export interface KPIDefinitionDatabase {
  rpc(name: string, parameters: Readonly<Record<string, unknown>>): PromiseLike<DatabaseResult>
  from(table: string): Readonly<{ select(columns: string): DefinitionQuery }>
}

const select = `
  definition_id, definition_key, version, effective_from, effective_until,
  active, name, description, owner_module, category, value_kind, unit,
  precision, favorable_direction, thresholds, target, features
`

export function createSupabaseKPIDefinitionRepositoryAdapter(
  database: KPIDefinitionDatabase,
  companyId: string,
  calculatorResolver: KPIDefinitionCalculatorResolver
): KPIDefinitionRepository {
  async function save(definition: KPIDefinitionVersion): Promise<void> {
    const { error } = await database.rpc("persist_kpi_definition_version", {
      p_company_id: companyId,
      p_definition_id: definition.definitionId,
      p_definition_key: definition.key,
      p_version: definition.version,
      p_effective_from: definition.effectiveFrom.toISOString(),
      p_effective_until: definition.effectiveUntil?.toISOString() ?? null,
      p_active: definition.active,
      p_definition: toPersistedKPIDefinition(definition),
    })
    if (error) throw new Error(error.message)
  }

  function baseQuery(): DefinitionQuery {
    return database.from("kpi_definition_versions").select(select).eq("company_id", companyId)
  }

  async function one(query: DefinitionQuery): Promise<KPIDefinitionVersion | null> {
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(error.message)
    return data ? mapPersistedKPIDefinition(data, calculatorResolver) : null
  }

  async function many(query: DefinitionQuery): Promise<readonly KPIDefinitionVersion[]> {
    const { data, error } = await query
    if (error) throw new Error(error.message)
    if (!Array.isArray(data)) throw new Error("KPI_DEFINITION_INVALID_PERSISTED_DATA")
    return Object.freeze(data.map((row) => mapPersistedKPIDefinition(row, calculatorResolver)))
  }

  return {
    save,
    async saveMany(definitions) {
      for (const definition of definitions) await save(definition)
    },
    findByIdAndVersion(definitionId, version) {
      return one(baseQuery().eq("definition_id", definitionId).eq("version", version))
    },
    findByKeyAndVersion(key, version) {
      return one(baseQuery().eq("definition_key", key).eq("version", version))
    },
    findActiveByKey(key, at) {
      return one(baseQuery()
        .eq("definition_key", key)
        .eq("active", true)
        .lte("effective_from", at.toISOString())
        .or(`effective_until.is.null,effective_until.gt.${at.toISOString()}`)
        .order("version", { ascending: false })
        .limit(1))
    },
    list() {
      return many(baseQuery()
        .order("definition_key", { ascending: true })
        .order("version", { ascending: true }))
    },
    listByOwnerModule(ownerModule) {
      return many(baseQuery()
        .eq("owner_module", ownerModule)
        .order("definition_key", { ascending: true })
        .order("version", { ascending: true }))
    },
  }
}
