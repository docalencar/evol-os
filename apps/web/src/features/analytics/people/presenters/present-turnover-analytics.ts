import type {
  TurnoverAnalytics,
  TurnoverAnalyticsViewModel,
  TurnoverPeriod,
  TurnoverPeriodKind,
  TurnoverPeriodViewModel,
} from "../types/turnover-analytics"

const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const labels: Record<TurnoverPeriodKind, string> = {
  closed: "Mês anterior (fechado)",
  mtd: "Mês atual (MTD)",
}

export function presentTurnoverAnalytics(
  turnover: TurnoverAnalytics
): TurnoverAnalyticsViewModel {
  if (turnover.status === "unavailable") {
    return {
      periods: [
        unavailablePeriod(
          "closed",
          "Não foi possível carregar o Turnover agora."
        ),
        unavailablePeriod(
          "mtd",
          "Não foi possível carregar o Turnover agora."
        ),
      ],
    }
  }

  return {
    periods: turnover.periods.map(presentPeriod) as [
      TurnoverPeriodViewModel,
      TurnoverPeriodViewModel,
    ],
  }
}

function presentPeriod(period: TurnoverPeriod): TurnoverPeriodViewModel {
  const available =
    period.availability === "available" &&
    period.turnoverPercent !== null

  return {
    kind: period.periodKind,
    label: labels[period.periodKind],
    value: available
      ? `${percentageFormatter.format(period.turnoverPercent!)}%`
      : "Indisponível",
    isAvailable: available,
    periodLabel: `${formatDate(period.periodStart)} a ${formatDate(period.periodEndExclusive)} (limite exclusivo, UTC)`,
    observationLabel:
      period.periodKind === "mtd"
        ? `Posição factual em ${formatDateTime(period.headcountAsOfAt ?? period.generatedAt)}`
        : "Período civil encerrado",
    message: available ? null : unavailableMessage(period),
  }
}

function unavailableMessage(period: TurnoverPeriod) {
  return period.availability === "unavailable"
    ? "Cobertura factual completa ainda não disponível."
    : "Percentual indisponível porque o headcount médio não é maior que zero."
}

function unavailablePeriod(
  kind: TurnoverPeriodKind,
  message: string
): TurnoverPeriodViewModel {
  return {
    kind,
    label: labels[kind],
    value: "Indisponível",
    isAvailable: false,
    periodLabel: "Período indisponível",
    observationLabel: kind === "mtd" ? "Posição factual indisponível" : "Período fechado indisponível",
    message,
  }
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}
