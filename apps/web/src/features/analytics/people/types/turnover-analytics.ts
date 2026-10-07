export type TurnoverPeriodKind = "closed" | "mtd"

export type TurnoverPeriod = Readonly<{
  periodKind: TurnoverPeriodKind
  periodStart: string
  periodEndExclusive: string
  availability: "available" | "unavailable"
  unavailableReason: "incomplete_coverage" | null
  turnoverPercent: number | null
  generatedAt: string
  headcountAsOfAt: string | null
}>

export type TurnoverAnalytics = Readonly<{
  status: "available"
  periods: readonly [TurnoverPeriod, TurnoverPeriod]
}> | Readonly<{
  status: "unavailable"
  reason: "query_error"
}>

export type TurnoverPeriodViewModel = Readonly<{
  kind: TurnoverPeriodKind
  label: string
  value: string
  isAvailable: boolean
  periodLabel: string
  observationLabel: string
  message: string | null
}>

export type TurnoverAnalyticsViewModel = Readonly<{
  periods: readonly [TurnoverPeriodViewModel, TurnoverPeriodViewModel]
}>
