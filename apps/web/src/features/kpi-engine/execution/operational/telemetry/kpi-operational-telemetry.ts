import type { OperationalTelemetry, OperationalTelemetryEvent } from "../contracts"

export class NoopOperationalTelemetry implements OperationalTelemetry { record(): void {} }
export class InMemoryOperationalTelemetry implements OperationalTelemetry {
  private readonly events: OperationalTelemetryEvent[] = []
  record(event: OperationalTelemetryEvent): void { this.events.push(Object.freeze({ ...event })) }
  list(): readonly OperationalTelemetryEvent[] { return Object.freeze([...this.events]) }
}
