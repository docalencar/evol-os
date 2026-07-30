import type {
  KPIDefinitionDatabase,
} from "../repositories/supabase-kpi-definition-repository-adapter"
import type {
  KPIEvaluationDatabase,
} from "../repositories/supabase-kpi-evaluation-repository-adapter"

type Result = Readonly<{
  data: unknown
  error: Readonly<{ message: string }> | null
}>

export type DatabaseCall = Readonly<{
  operation: string
  args: readonly unknown[]
}>

export class ScriptedKPIDatabase
  implements KPIDefinitionDatabase, KPIEvaluationDatabase {
  readonly calls: DatabaseCall[] = []
  private readonly queryResults: Result[] = []
  private readonly rpcResults: Result[] = []

  enqueueQuery(data: unknown, error: Result["error"] = null): void {
    this.queryResults.push({ data, error })
  }

  enqueueRpc(data: unknown = null, error: Result["error"] = null): void {
    this.rpcResults.push({ data, error })
  }

  rpc(name: string, parameters: Readonly<Record<string, unknown>>): PromiseLike<Result> {
    this.calls.push({ operation: "rpc", args: [name, parameters] })
    return Promise.resolve(this.rpcResults.shift() ?? { data: null, error: null })
  }

  from(table: string) {
    this.calls.push({ operation: "from", args: [table] })
    return {
      select: (columns: string) => {
        this.calls.push({ operation: "select", args: [columns] })
        return new ScriptedQuery(
          this.calls,
          this.queryResults.shift() ?? { data: [], error: null }
        )
      },
    }
  }
}

class ScriptedQuery implements PromiseLike<Result> {
  constructor(
    private readonly calls: DatabaseCall[],
    private readonly result: Result
  ) {}

  eq(column: string, value: string | number | boolean): ScriptedQuery {
    return this.record("eq", column, value)
  }

  lte(column: string, value: string): ScriptedQuery {
    return this.record("lte", column, value)
  }

  gte(column: string, value: string): ScriptedQuery {
    return this.record("gte", column, value)
  }

  or(filter: string): ScriptedQuery {
    return this.record("or", filter)
  }

  order(column: string, options: Readonly<{ ascending: boolean }>): ScriptedQuery {
    return this.record("order", column, options)
  }

  range(from: number, to: number): ScriptedQuery {
    return this.record("range", from, to)
  }

  limit(value: number): ScriptedQuery {
    return this.record("limit", value)
  }

  maybeSingle(): PromiseLike<Result> {
    this.calls.push({ operation: "maybeSingle", args: [] })
    return Promise.resolve(this.result)
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected)
  }

  private record(operation: string, ...args: unknown[]): ScriptedQuery {
    this.calls.push({ operation, args })
    return this
  }
}
