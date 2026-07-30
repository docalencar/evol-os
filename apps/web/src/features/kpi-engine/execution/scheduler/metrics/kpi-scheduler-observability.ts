import type { KPISchedulerMetricName, KPISchedulerMetrics, KPISchedulerTelemetry,
  KPISchedulerTelemetryEvent } from "../contracts"

export class NoopKPISchedulerMetrics implements KPISchedulerMetrics { increment(): void {} }
export class InMemoryKPISchedulerMetrics implements KPISchedulerMetrics {
  private readonly values = new Map<KPISchedulerMetricName, number>()
  increment(name: KPISchedulerMetricName, value = 1): void {
    this.values.set(name, (this.values.get(name) ?? 0) + value)
  }
  snapshot(): Readonly<Record<string, number>> { return Object.freeze(Object.fromEntries(this.values)) }
}
export class NoopKPISchedulerTelemetry implements KPISchedulerTelemetry { record(): void {} }
export class InMemoryKPISchedulerTelemetry implements KPISchedulerTelemetry {
  private readonly events: KPISchedulerTelemetryEvent[] = []
  record(event: KPISchedulerTelemetryEvent): void { this.events.push(Object.freeze({ ...event })) }
  list(): readonly KPISchedulerTelemetryEvent[] { return Object.freeze([...this.events]) }
}
