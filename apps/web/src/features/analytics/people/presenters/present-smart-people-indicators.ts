import type {
  SmartIndicatorId,
  SmartIndicatorResult,
  SmartIndicatorStatus,
  SmartIndicatorTrend,
  SmartPeopleIndicators,
  SmartPeopleIndicatorsViewModel,
} from "../types/smart-indicator"

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
})

const metadata: Record<
  SmartIndicatorId,
  { title: string; description: string }
> = {
  turnover: {
    title: "Turnover do período",
    description:
      "Desligamentos sobre o headcount médio do mês.",
  },
  hires: {
    title: "Contratações no período",
    description:
      "Pessoas com data de admissão no mês atual.",
  },
  average_time_to_hire: {
    title: "Tempo médio de contratação",
    description:
      "Dias corridos entre o início e o preenchimento da vaga.",
  },
  average_approval_time: {
    title: "Tempo médio de aprovação",
    description:
      "Dias corridos entre a solicitação e a aprovação da vaga.",
  },
}

const statusLabels: Record<
  SmartIndicatorStatus,
  string
> = {
  healthy: "Disponível",
  warning: "Atenção",
  critical: "Crítico",
  unavailable: "Indisponível",
}

export function presentSmartPeopleIndicators(
  result: SmartPeopleIndicators
): SmartPeopleIndicatorsViewModel {
  return {
    periodLabel: result.periodLabel,
    indicators: result.indicators.map((indicator) => ({
      id: indicator.id,
      title: metadata[indicator.id].title,
      description: metadata[indicator.id].description,
      formattedValue: formatValue(indicator),
      status: indicator.status,
      statusLabel: statusLabels[indicator.status],
      trend: indicator.trend,
      formattedVariation: formatVariation(indicator),
      comparisonLabel: result.periodLabel,
      insight: createInsight(indicator),
      unavailableReason: indicator.unavailableReason,
    })),
  }
}

function formatValue(indicator: SmartIndicatorResult) {
  if (indicator.value === null) {
    return "Indisponível"
  }

  const value = numberFormatter.format(indicator.value)

  if (indicator.valueKind === "percentage") {
    return `${value}%`
  }

  if (indicator.valueKind === "days") {
    return `${value} ${indicator.value === 1 ? "dia" : "dias"}`
  }

  return value
}

function formatVariation(
  indicator: SmartIndicatorResult
) {
  if (indicator.variation === null) {
    return null
  }

  const signal = indicator.variation > 0 ? "+" : ""
  const value = `${signal}${numberFormatter.format(
    indicator.variation
  )}`

  return indicator.valueKind === "count"
    ? value
    : `${value}%`
}

function trendText(trend: SmartIndicatorTrend) {
  if (trend === "up") return "aumentou"
  if (trend === "down") return "diminuiu"
  if (trend === "stable") return "permaneceu estável"
  return null
}

function createInsight(indicator: SmartIndicatorResult) {
  if (indicator.value === null) {
    return (
      indicator.unavailableReason ??
      "Não há dados suficientes para comparação."
    )
  }

  if (indicator.id === "hires" && indicator.value === 0) {
    return "Nenhuma contratação registrada neste mês."
  }

  const change = trendText(indicator.trend)

  if (!change) {
    return "Sem comparação disponível."
  }

  if (indicator.id === "hires") {
    return `O número de contratações ${change} em relação ao mês anterior.`
  }

  return `O indicador ${change} em relação ao mês anterior.`
}
