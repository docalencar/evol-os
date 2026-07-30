export type KPISchedulerErrorCode = "DUPLICATE_TRIGGER" | "TRIGGER_NOT_FOUND" | "INVALID_TRIGGER" |
  "INVALID_SCHEDULER_CONFIG"
export class KPISchedulerError extends Error {
  constructor(readonly code: KPISchedulerErrorCode, message: string) { super(message); this.name = "KPISchedulerError" }
}
