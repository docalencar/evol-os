export type KPIWorkerErrorCode = "INVALID_RUNTIME_TRANSITION" | "RUNTIME_ALREADY_RUNNING" |
  "CYCLE_ALREADY_RUNNING" | "RUNTIME_NOT_RUNNING" | "WORKER_CANCELLED" | "LEASE_LOST" |
  "INVALID_RUNTIME_CONFIGURATION" | "WORK_DISCOVERY_FAILURE" | "HEARTBEAT_FAILURE" |
  "SHUTDOWN_FAILURE"
export class KPIWorkerError extends Error {
  constructor(readonly code: KPIWorkerErrorCode, message: string, options?: ErrorOptions) {
    super(message, options); this.name = "KPIWorkerError"
  }
}
