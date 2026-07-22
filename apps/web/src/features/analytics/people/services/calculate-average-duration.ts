import {
  isDateInPeriod,
  type MonthPeriod,
} from "./create-month-periods"

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

export type DurationRecord = {
  startedAt: Date | null
  completedAt: Date | null
}

export function calculateAverageDurationInDays(
  records: readonly DurationRecord[],
  completionPeriod: MonthPeriod
): number | null {
  const durations = records.flatMap((record) => {
    if (
      !record.startedAt ||
      !record.completedAt ||
      !isDateInPeriod(record.completedAt, completionPeriod)
    ) {
      return []
    }

    const duration =
      record.completedAt.getTime() -
      record.startedAt.getTime()

    // Duração em dias corridos, preservando frações de dia.
    return Number.isFinite(duration) && duration >= 0
      ? [duration / MILLISECONDS_PER_DAY]
      : []
  })

  if (durations.length === 0) {
    return null
  }

  return (
    durations.reduce((total, duration) => {
      return total + duration
    }, 0) / durations.length
  )
}
