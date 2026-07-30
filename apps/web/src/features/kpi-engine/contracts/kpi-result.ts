import type {
  KPIAvailability,
  KPIComparison,
  KPISeverity,
  KPISLAStatus,
  KPITrendDirection,
  KPIValue,
} from "../types/kpi-types"

export type KPIResult = Readonly<{
  definitionId: string
  value: KPIValue
  availability: KPIAvailability
  calculatedAt: Date
}>

export type KPISLAResult = Readonly<{
  status: KPISLAStatus
  target: number
  delta: number | null
}>

export type KPITrendResult = Readonly<{
  direction: KPITrendDirection
  absoluteChange: number | null
  percentageChange: number | null
}>

export type KPIBenchmarkResult = Readonly<{
  benchmark: number
  label: string
  comparison: KPIComparison
  delta: number | null
  percentageDifference: number | null
}>

export type KPIAlert = Readonly<{
  id: string
  severity: KPISeverity
  message: string
}>

export type KPIForecastPoint = Readonly<{
  occurredAt: Date
  value: number
}>

export type KPIForecastResult = Readonly<{
  status: "available" | "unavailable"
  points: readonly KPIForecastPoint[]
}>

export type KPIAnalysis = Readonly<{
  result: KPIResult
  sla: KPISLAResult | null
  trend: KPITrendResult | null
  benchmark: KPIBenchmarkResult | null
  alerts: readonly KPIAlert[]
  forecast: KPIForecastResult | null
}>
