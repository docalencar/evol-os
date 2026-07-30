import type { KPIBatchExecutionRequest, KPIExecutionRequest } from "../contracts"
import type { KPIExecutionPipeline } from "../pipeline"

export class KPIExecutionPlatform {
  constructor(private readonly pipeline: KPIExecutionPipeline) {}
  execute(request: KPIExecutionRequest) { return this.pipeline.execute(request) }
  executeBatch(request: KPIBatchExecutionRequest) { return this.pipeline.executeBatch(request) }
  interrupt(idempotencyKey: string): Promise<void> { return this.pipeline.interrupt(idempotencyKey) }
}
