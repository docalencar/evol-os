export type KPIValue = number | null

export type KPIValueKind =
  | "number"
  | "percentage"
  | "currency"
  | "duration"
  | "ratio"

export type KPIDirection = "increase" | "decrease" | "neutral"

export type KPIAvailability = "available" | "unavailable"

export type KPITrendDirection = "up" | "down" | "stable" | "unavailable"

export type KPISeverity = "info" | "warning" | "critical"

export type KPIComparison = "above" | "below" | "equal" | "unavailable"

export type KPISLAStatus = "met" | "breached" | "unavailable"

export type KPITimePoint = Readonly<{
  occurredAt: Date
  value: number
}>
