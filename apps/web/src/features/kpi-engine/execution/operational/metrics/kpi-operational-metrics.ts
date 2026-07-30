import type { OperationalMetricName, OperationalMetrics, OperationalMetricsExporter } from "../contracts"

export class InMemoryOperationalMetrics implements OperationalMetrics {
  private readonly values = new Map<OperationalMetricName, number>()
  increment(name: OperationalMetricName, value = 1): void {
    this.values.set(name, (this.values.get(name) ?? 0) + value)
  }
  snapshot(): Readonly<Record<string, number>> { return Object.freeze(Object.fromEntries(this.values)) }
}
export class JsonOperationalMetricsExporter implements OperationalMetricsExporter {
  export(metrics: Readonly<Record<string, number>>): string { return JSON.stringify(metrics) }
}
export class SnapshotOperationalMetricsExporter implements OperationalMetricsExporter {
  export(metrics: Readonly<Record<string, number>>): string {
    return Object.entries(metrics).sort(([left], [right]) => left.localeCompare(right))
      .map(([name, value]) => `${name}=${value}`).join("\n")
  }
}
