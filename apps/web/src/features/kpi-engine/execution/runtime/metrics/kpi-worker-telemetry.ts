import type { KPIWorkerTelemetry, KPIWorkerTelemetryEvent } from "../contracts"
export class NoopKPIWorkerTelemetry implements KPIWorkerTelemetry {
  record(event: KPIWorkerTelemetryEvent): void { void event }
}
export class InMemoryKPIWorkerTelemetry implements KPIWorkerTelemetry {
  private readonly recorded: KPIWorkerTelemetryEvent[] = []
  record(event: KPIWorkerTelemetryEvent): void { this.recorded.push(Object.freeze({ ...event })) }
  events(): readonly KPIWorkerTelemetryEvent[] { return Object.freeze([...this.recorded]) }
}
