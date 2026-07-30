import type {
  KPIComparison,
  KPISeverity,
  KPISLAStatus,
  KPITrendDirection,
} from "../types/kpi-types"

export type KPIAlertViewModel = Readonly<{
  id: string
  severity: KPISeverity
  severityLabel: string
  message: string
}>

export type KPIForecastPointViewModel = Readonly<{
  occurredAt: string
  value: number
  formattedValue: string
}>

export type KPIViewModel = Readonly<{
  id: string
  name: string
  description: string
  available: boolean
  value: number | null
  formattedValue: string
  calculatedAt: string
  sla: Readonly<{
    status: KPISLAStatus
    statusLabel: string
    target: number
    formattedTarget: string
    delta: number | null
  }> | null
  trend: Readonly<{
    direction: KPITrendDirection
    directionLabel: string
    absoluteChange: number | null
    percentageChange: number | null
    formattedPercentageChange: string | null
  }> | null
  benchmark: Readonly<{
    label: string
    value: number
    formattedValue: string
    comparison: KPIComparison
    comparisonLabel: string
    delta: number | null
  }> | null
  alerts: readonly KPIAlertViewModel[]
  forecast: Readonly<{
    available: boolean
    points: readonly KPIForecastPointViewModel[]
  }> | null
}>
