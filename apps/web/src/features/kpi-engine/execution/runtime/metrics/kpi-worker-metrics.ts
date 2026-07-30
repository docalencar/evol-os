import type { KPIWorkerMetricName, KPIWorkerMetrics } from "../contracts"

export class NoopKPIWorkerMetrics implements KPIWorkerMetrics {
  increment(name: KPIWorkerMetricName, value = 1): void { void name; void value }
}
export class InMemoryKPIWorkerMetrics implements KPIWorkerMetrics {
  private readonly values = new Map<KPIWorkerMetricName, number>()
  increment(name: KPIWorkerMetricName, value = 1): void {
    this.values.set(name, name === "lastCycleDurationMs" ? value : (this.values.get(name) ?? 0) + value)
  }
  snapshot(): Readonly<Record<KPIWorkerMetricName, number>> {
    return Object.freeze({ cyclesStarted: this.value("cyclesStarted"),
      cyclesCompleted: this.value("cyclesCompleted"), cyclesFailed: this.value("cyclesFailed"),
      cyclesCancelled: this.value("cyclesCancelled"), emptyCycles: this.value("emptyCycles"),
      workDiscovered: this.value("workDiscovered"), pendingProcessed: this.value("pendingProcessed"),
      retriesProcessed: this.value("retriesProcessed"), recoveriesProcessed: this.value("recoveriesProcessed"),
      executionsSucceeded: this.value("executionsSucceeded"),
      executionsPartiallySucceeded: this.value("executionsPartiallySucceeded"),
      executionsFailed: this.value("executionsFailed"), leasesAcquired: this.value("leasesAcquired"),
      leasesRenewed: this.value("leasesRenewed"), leasesLost: this.value("leasesLost"),
      pollingBackoffs: this.value("pollingBackoffs"), totalCycleDurationMs: this.value("totalCycleDurationMs"),
      lastCycleDurationMs: this.value("lastCycleDurationMs") })
  }
  private value(name: KPIWorkerMetricName): number { return this.values.get(name) ?? 0 }
}
