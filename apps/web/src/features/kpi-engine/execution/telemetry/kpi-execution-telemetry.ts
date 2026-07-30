import type { KPIExecutionTelemetry, KPIExecutionTelemetryEvent } from "../contracts"

export interface KPIExecutionTelemetryHistory {
  events(): readonly KPIExecutionTelemetryEvent[]
}

export class NoopKPIExecutionTelemetry implements KPIExecutionTelemetry {
  record(event: KPIExecutionTelemetryEvent): void { void event }
}

export class InMemoryKPIExecutionTelemetry implements KPIExecutionTelemetry, KPIExecutionTelemetryHistory {
  private readonly recorded: KPIExecutionTelemetryEvent[] = []
  record(event: KPIExecutionTelemetryEvent): void { this.recorded.push(Object.freeze({ ...event })) }
  events(): readonly KPIExecutionTelemetryEvent[] { return Object.freeze([...this.recorded]) }
}
