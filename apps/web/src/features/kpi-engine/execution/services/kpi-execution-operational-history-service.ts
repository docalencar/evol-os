import type { KPIExecutionTelemetryEvent } from "../contracts"
import type { KPIExecutionTelemetryHistory } from "../telemetry"

const LEASE_EVENTS: readonly KPIExecutionTelemetryEvent["kind"][] = [
  "lease_acquired", "lease_renewed", "lease_released", "lease_expired",
]
const RECOVERY_EVENTS: readonly KPIExecutionTelemetryEvent["kind"][] = [
  "recovery_started", "recovery_completed", "recovery_failed",
]
const DISPATCHER_EVENTS: readonly KPIExecutionTelemetryEvent["kind"][] = [
  "dispatcher_started", "dispatcher_completed",
]

export class KPIExecutionOperationalHistoryService {
  constructor(private readonly history: KPIExecutionTelemetryHistory) {}
  listLeases() { return this.filter(LEASE_EVENTS) }
  listRecoveries() { return this.filter(RECOVERY_EVENTS) }
  listDispatcherExecutions() { return this.filter(DISPATCHER_EVENTS) }
  private filter(kinds: readonly KPIExecutionTelemetryEvent["kind"][]) {
    return Object.freeze(this.history.events().filter((event) => kinds.includes(event.kind)))
  }
}
