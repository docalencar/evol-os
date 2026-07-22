import "server-only"

import {
  getApprovalRequests,
} from "@/features/approval"
import {
  getEmployeeHiresInPeriod,
} from "@/features/people"

import {
  compareIndicatorValues,
} from "../policies/compare-indicator-values"
import {
  getSmartIndicatorStatus,
} from "../policies/get-smart-indicator-status"
import {
  calculateAverageDurationInDays,
} from "../services/calculate-average-duration"
import {
  calculateHires,
} from "../services/calculate-hires"
import {
  createMonthPeriods,
  toDateOnly,
} from "../services/create-month-periods"
import type {
  SmartIndicatorResult,
  SmartPeopleIndicators,
} from "../types/smart-indicator"

const COMPARISON_LABEL = "vs. mês anterior"

function unsupportedIndicator(
  indicator: Pick<
    SmartIndicatorResult,
    "id" | "valueKind"
  >,
  reason: string
): SmartIndicatorResult {
  return {
    ...indicator,
    value: null,
    previousValue: null,
    status: "unavailable",
    trend: "unavailable",
    variation: null,
    unavailableReason: reason,
    availabilityReason: "unsupported",
  }
}

function queryErrorIndicator(
  indicator: Pick<
    SmartIndicatorResult,
    "id" | "valueKind"
  >
): SmartIndicatorResult {
  return {
    ...indicator,
    value: null,
    previousValue: null,
    status: "unavailable",
    trend: "unavailable",
    variation: null,
    unavailableReason:
      "Não foi possível carregar este indicador agora.",
    availabilityReason: "query_error",
  }
}

export async function getSmartPeopleIndicators(
  companyId: string,
  referenceDate = new Date()
): Promise<SmartPeopleIndicators> {
  const periods = createMonthPeriods(referenceDate)
  const hiresPromise = getEmployeeHiresInPeriod({
    companyId,
    startDate: toDateOnly(periods.previous.start),
    endDateExclusive: toDateOnly(
      periods.current.endExclusive
    ),
  })
  const approvalsPromise = getApprovalRequests({
    companyId,
    status: "approved",
    module: "recruitment",
    entityType: "job_opening",
  })
  const [hiresResult, approvalsResult] =
    await Promise.allSettled([
      hiresPromise,
      approvalsPromise,
    ])

  const turnover = unsupportedIndicator(
    { id: "turnover", valueKind: "percentage" },
    "Histórico de desligamentos e headcount do período ainda não disponível."
  )
  const averageTimeToHire = unsupportedIndicator(
    { id: "average_time_to_hire", valueKind: "days" },
    "Data efetiva de preenchimento da vaga ainda não disponível."
  )
  const hires =
    hiresResult.status === "fulfilled"
      ? createHiresIndicator(
          hiresResult.value,
          periods
        )
      : queryErrorIndicator({
          id: "hires",
          valueKind: "count",
        })
  const averageApprovalTime =
    approvalsResult.status === "fulfilled"
      ? createApprovalTimeIndicator(
          approvalsResult.value,
          periods
        )
      : queryErrorIndicator({
          id: "average_approval_time",
          valueKind: "days",
        })

  return {
    periodLabel: COMPARISON_LABEL,
    indicators: [
      turnover,
      hires,
      averageTimeToHire,
      averageApprovalTime,
    ],
  }
}

function createHiresIndicator(
  hires: Awaited<
    ReturnType<typeof getEmployeeHiresInPeriod>
  >,
  periods: ReturnType<typeof createMonthPeriods>
): SmartIndicatorResult {
  const value = calculateHires(hires, periods.current)
  const previousValue = calculateHires(
    hires,
    periods.previous
  )
  const comparison = compareIndicatorValues(
    value,
    previousValue,
    "absolute"
  )

  return {
    id: "hires",
    valueKind: "count",
    value,
    previousValue,
    status: getSmartIndicatorStatus({
      available: true,
      lowerIsBetter: false,
      trend: comparison.trend,
      relativeVariation: null,
    }),
    ...comparison,
    unavailableReason: null,
    availabilityReason: null,
  }
}

function createApprovalTimeIndicator(
  requests: Awaited<
    ReturnType<typeof getApprovalRequests>
  >,
  periods: ReturnType<typeof createMonthPeriods>
): SmartIndicatorResult {
  const durations = requests.map((request) => ({
    startedAt: request.requestedAt,
    completedAt: request.completedAt,
  }))
  const value = calculateAverageDurationInDays(
    durations,
    periods.current
  )
  const previousValue = calculateAverageDurationInDays(
    durations,
    periods.previous
  )
  const comparison = compareIndicatorValues(
    value,
    previousValue,
    "relative"
  )
  const available = value !== null

  return {
    id: "average_approval_time",
    valueKind: "days",
    value,
    previousValue,
    status: getSmartIndicatorStatus({
      available,
      lowerIsBetter: true,
      trend: comparison.trend,
      relativeVariation: comparison.variation,
    }),
    ...comparison,
    unavailableReason: available
      ? null
      : "Nenhuma aprovação de vaga concluída neste mês.",
    availabilityReason: available ? null : "no_data",
  }
}
