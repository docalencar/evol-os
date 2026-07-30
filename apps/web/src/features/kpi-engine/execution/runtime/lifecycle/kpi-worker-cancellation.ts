import type { KPIWorkerCancellationSource, KPIWorkerCancellationToken } from "../contracts"
import { KPIWorkerError } from "../domain"

export class CooperativeKPIWorkerCancellationSource implements KPIWorkerCancellationSource,
  KPIWorkerCancellationToken {
  readonly token: KPIWorkerCancellationToken = this
  private reason: string | null = null
  cancel(reason: string): void { this.reason = reason.trim() === "" ? "cancelled" : reason }
  isCancellationRequested(): boolean { return this.reason !== null }
  getReason(): string | null { return this.reason }
  throwIfCancellationRequested(): void {
    if (this.reason) throw new KPIWorkerError("WORKER_CANCELLED", this.reason)
  }
}

export class NeverCancelledKPIWorkerToken implements KPIWorkerCancellationToken {
  isCancellationRequested(): boolean { return false }
  throwIfCancellationRequested(): void {}
  getReason(): string | null { return null }
}
