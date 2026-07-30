import type {
  KPIBenchmarkResult,
  KPIResult,
} from "../contracts/kpi-result"

export type KPIBenchmark = Readonly<{
  value: number
  label: string
}>

export class KPIBenchmarkEngine {
  compare(result: KPIResult, benchmark: KPIBenchmark): KPIBenchmarkResult {
    if (!Number.isFinite(benchmark.value)) {
      throw new RangeError("O benchmark deve ser um número finito.")
    }

    if (result.value === null) {
      return Object.freeze({
        benchmark: benchmark.value,
        label: benchmark.label,
        comparison: "unavailable",
        delta: null,
        percentageDifference: null,
      })
    }

    const delta = result.value - benchmark.value
    return Object.freeze({
      benchmark: benchmark.value,
      label: benchmark.label,
      comparison: delta > 0 ? "above" : delta < 0 ? "below" : "equal",
      delta,
      percentageDifference: benchmark.value === 0
        ? result.value === 0 ? 0 : null
        : (delta / Math.abs(benchmark.value)) * 100,
    })
  }
}
