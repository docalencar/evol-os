import type { KPIBatchExecutionRequest, KPIBatchExecutionResult, KPIExecutionContext, KPIExecutionExecutor } from "../contracts"

export class BatchExecutionExecutor {
  constructor(private readonly resolve: (key: string) => KPIExecutionExecutor | null) {}

  async execute(request: KPIBatchExecutionRequest, context: KPIExecutionContext): Promise<KPIBatchExecutionResult> {
    const results = []
    for (const item of request.requests) {
      const executor = this.resolve(item.providerKey)
      const result = executor
        ? await executor.execute(item, context)
        : Object.freeze({ context, status: "failed" as const, evaluation: null,
          error: `KPI_EXECUTOR_NOT_FOUND:${item.providerKey}` })
      results.push(result)
      if (request.stopOnFailure && result.status === "failed") break
    }
    const succeeded = results.filter((item) => item.status === "succeeded").length
    const failed = results.length - succeeded
    return Object.freeze({ context,
      status: failed === 0 ? "succeeded" as const : succeeded === 0 ? "failed" as const : "partial" as const,
      results: Object.freeze(results), succeeded, failed, persisted: succeeded })
  }
}
