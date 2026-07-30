import type { KPIBatchExecutionRequest, KPIExecutionRequest } from "../contracts"

export class KPIExecutionRequestValidator {
  validate(request: KPIExecutionRequest): void {
    if (request.providerKey.trim() === "" || request.idempotencyKey.trim() === "") {
      throw new Error("KPI_EXECUTION_REQUEST_INVALID")
    }
  }

  validateBatch(request: KPIBatchExecutionRequest): void {
    if (request.idempotencyKey.trim() === "" || request.requests.length === 0) {
      throw new Error("KPI_BATCH_EXECUTION_REQUEST_INVALID")
    }
    request.requests.forEach((item) => this.validate(item))
    if (new Set(request.requests.map((item) => item.idempotencyKey)).size !== request.requests.length) {
      throw new Error("KPI_BATCH_DUPLICATE_IDEMPOTENCY_KEY")
    }
  }
}
