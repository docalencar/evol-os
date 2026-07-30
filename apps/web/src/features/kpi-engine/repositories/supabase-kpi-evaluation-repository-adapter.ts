import { toKPIEvaluationDTO } from "../application/kpi-evaluation-application-service"
import type { KPIEvaluation } from "../evaluations"
import type {
  KPIEvaluationRepository,
  ListKPIEvaluationsByCompanyInput,
  ListKPIEvaluationsByDefinitionInput,
  ListKPIEvaluationsByScopeInput,
  PaginationInput,
} from "./kpi-evaluation-repository"
import { mapPersistedKPIEvaluation } from "./kpi-evaluation-persistence-record"

type DatabaseResult = Readonly<{
  data: unknown
  error: Readonly<{ message: string }> | null
}>

export interface KPIEvaluationQuery extends PromiseLike<DatabaseResult> {
  eq(column: string, value: string | number): KPIEvaluationQuery
  gte(column: string, value: string): KPIEvaluationQuery
  lte(column: string, value: string): KPIEvaluationQuery
  order(column: string, options: Readonly<{ ascending: boolean }>): KPIEvaluationQuery
  range(from: number, to: number): KPIEvaluationQuery
  limit(value: number): KPIEvaluationQuery
  maybeSingle(): PromiseLike<DatabaseResult>
}

export interface KPIEvaluationDatabase {
  rpc(name: string, parameters: Readonly<Record<string, unknown>>): PromiseLike<DatabaseResult>
  from(table: string): Readonly<{ select(columns: string): KPIEvaluationQuery }>
}

export type ListKPIEvaluationsByPeriodInput = Readonly<{
  companyId: string
  periodStart: Date
  periodEnd: Date
}> & PaginationInput

export type ListLatestKPIEvaluationsInput = Readonly<{
  companyId: string
  definitionKey?: string
  limit: number
}>

export interface KPIEvaluationHistoryRepository extends KPIEvaluationRepository {
  listByPeriod(input: ListKPIEvaluationsByPeriodInput): Promise<readonly KPIEvaluation[]>
  listLatest(input: ListLatestKPIEvaluationsInput): Promise<readonly KPIEvaluation[]>
}

const select = `
  id, company_id, definition_id, definition_key, definition_version,
  owner_module, scope_type, scope_id, period_start, period_end,
  evaluated_at, requested_by, correlation_id, metadata, result, created_at,
  kpi_evaluation_snapshots!inner(definition_snapshot)
`

export function createSupabaseKPIEvaluationRepositoryAdapter(
  database: KPIEvaluationDatabase
): KPIEvaluationHistoryRepository {
  function baseQuery(companyId: string): KPIEvaluationQuery {
    return database.from("kpi_evaluations").select(select).eq("company_id", companyId)
  }

  async function many(query: KPIEvaluationQuery): Promise<readonly KPIEvaluation[]> {
    const { data, error } = await query
    if (error) throw new Error(error.message)
    if (!Array.isArray(data)) throw new Error("KPI_EVALUATION_INVALID_PERSISTED_DATA")
    return Object.freeze(data.map(mapPersistedKPIEvaluation))
  }

  function historyOrder(query: KPIEvaluationQuery): KPIEvaluationQuery {
    return query
      .order("evaluated_at", { ascending: false })
      .order("id", { ascending: true })
  }

  function paginate(query: KPIEvaluationQuery, input: PaginationInput): KPIEvaluationQuery {
    if (input.limit === undefined && input.offset === undefined) return query
    const offset = Math.max(0, input.offset ?? 0)
    const limit = Math.max(0, input.limit ?? 50)
    return query.range(offset, offset + Math.max(0, limit - 1))
  }

  function emptyPage(input: PaginationInput): Promise<readonly KPIEvaluation[]> | null {
    return input.limit === 0 ? Promise.resolve(Object.freeze([])) : null
  }

  function period(
    query: KPIEvaluationQuery,
    periodStart?: Date,
    periodEnd?: Date
  ): KPIEvaluationQuery {
    let filtered = query
    if (periodStart) filtered = filtered.gte("evaluated_at", periodStart.toISOString())
    if (periodEnd) filtered = filtered.lte("evaluated_at", periodEnd.toISOString())
    return filtered
  }

  return {
    async save(evaluation) {
      const dto = toKPIEvaluationDTO(evaluation)
      const { error } = await database.rpc("persist_kpi_evaluation", {
        p_evaluation: {
          id: dto.id,
          companyId: dto.context.companyId,
          definitionId: dto.definition.id,
          definitionKey: dto.context.definitionKey,
          definitionVersion: dto.definitionVersion,
          ownerModule: dto.context.ownerModule,
          scopeType: dto.context.scopeType,
          scopeId: dto.context.scopeId ?? null,
          periodStart: dto.context.periodStart,
          periodEnd: dto.context.periodEnd,
          evaluatedAt: dto.context.evaluatedAt,
          requestedBy: dto.context.requestedBy ?? null,
          correlationId: dto.context.correlationId ?? null,
          metadata: dto.context.metadata,
          result: dto.result,
          createdAt: dto.createdAt,
        },
        p_definition_snapshot: dto.definition,
      })
      if (error) throw new Error(error.message)
    },
    async findById(companyId, evaluationId) {
      const { data, error } = await baseQuery(companyId)
        .eq("id", evaluationId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data ? mapPersistedKPIEvaluation(data) : null
    },
    listByCompany(input: ListKPIEvaluationsByCompanyInput) {
      const empty = emptyPage(input)
      if (empty) return empty
      return many(paginate(historyOrder(baseQuery(input.companyId)), input))
    },
    listByDefinition(input: ListKPIEvaluationsByDefinitionInput) {
      const empty = emptyPage(input)
      if (empty) return empty
      let query = baseQuery(input.companyId).eq("definition_key", input.definitionKey)
      if (input.definitionVersion !== undefined) {
        query = query.eq("definition_version", input.definitionVersion)
      }
      return many(paginate(historyOrder(
        period(query, input.periodStart, input.periodEnd)
      ), input))
    },
    listByScope(input: ListKPIEvaluationsByScopeInput) {
      const empty = emptyPage(input)
      if (empty) return empty
      let query = baseQuery(input.companyId).eq("scope_type", input.scopeType)
      if (input.scopeId !== undefined) query = query.eq("scope_id", input.scopeId)
      if (input.definitionKey !== undefined) {
        query = query.eq("definition_key", input.definitionKey)
      }
      return many(paginate(historyOrder(
        period(query, input.periodStart, input.periodEnd)
      ), input))
    },
    listByPeriod(input) {
      const empty = emptyPage(input)
      if (empty) return empty
      return many(paginate(historyOrder(period(
        baseQuery(input.companyId), input.periodStart, input.periodEnd
      )), input))
    },
    listLatest(input) {
      if (input.limit === 0) return Promise.resolve(Object.freeze([]))
      let query = baseQuery(input.companyId)
      if (input.definitionKey !== undefined) {
        query = query.eq("definition_key", input.definitionKey)
      }
      return many(historyOrder(query).limit(input.limit))
    },
  }
}
