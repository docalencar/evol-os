export type MonthPeriod = {
  start: Date
  endExclusive: Date
}

export type AnalyticsMonthPeriods = {
  current: MonthPeriod
  previous: MonthPeriod
}

export function createMonthPeriods(
  referenceDate: Date
): AnalyticsMonthPeriods {
  // O produto ainda não possui timezone por empresa. UTC mantém
  // limites determinísticos para dates do banco e timestamps do Approval.
  const year = referenceDate.getUTCFullYear()
  const month = referenceDate.getUTCMonth()

  return {
    current: {
      start: new Date(Date.UTC(year, month, 1)),
      endExclusive: new Date(
        Date.UTC(year, month + 1, 1)
      ),
    },
    previous: {
      start: new Date(Date.UTC(year, month - 1, 1)),
      endExclusive: new Date(Date.UTC(year, month, 1)),
    },
  }
}

export function isDateInPeriod(
  date: Date,
  period: MonthPeriod
) {
  const timestamp = date.getTime()

  return (
    Number.isFinite(timestamp) &&
    timestamp >= period.start.getTime() &&
    timestamp < period.endExclusive.getTime()
  )
}

export function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}
