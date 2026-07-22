export type SmartIndicatorStatus =
  | "healthy"
  | "warning"
  | "critical"
  | "unavailable"

export type SmartIndicatorTrend =
  | "up"
  | "down"
  | "stable"
  | "unavailable"

export type SmartIndicatorId =
  | "turnover"
  | "hires"
  | "average_time_to_hire"
  | "average_approval_time"

export type SmartIndicatorValueKind =
  | "percentage"
  | "days"
  | "count"

export type SmartIndicatorAvailabilityReason =
  | "unsupported"
  | "no_data"
  | "query_error"

export type SmartIndicatorResult = {
  id: SmartIndicatorId
  valueKind: SmartIndicatorValueKind
  value: number | null
  previousValue: number | null
  status: SmartIndicatorStatus
  trend: SmartIndicatorTrend
  variation: number | null
  unavailableReason: string | null
  availabilityReason: SmartIndicatorAvailabilityReason | null
}

export type SmartIndicatorViewModel = {
  id: SmartIndicatorId
  title: string
  formattedValue: string
  status: SmartIndicatorStatus
  statusLabel: string
  trend: SmartIndicatorTrend
  formattedVariation: string | null
  comparisonLabel: string
  description: string
  insight: string
  unavailableReason: string | null
}

export type SmartPeopleIndicators = {
  periodLabel: string
  indicators: SmartIndicatorResult[]
}

export type SmartPeopleIndicatorsViewModel = {
  periodLabel: string
  indicators: SmartIndicatorViewModel[]
}
