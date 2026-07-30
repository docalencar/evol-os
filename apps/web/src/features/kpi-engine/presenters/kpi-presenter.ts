import type { KPIDefinition } from "../contracts/kpi-definition"
import type { KPIAnalysis } from "../contracts/kpi-result"
import type { KPIValueKind } from "../types/kpi-types"
import type { KPIViewModel } from "../view-models/kpi-view-model"

export type KPIPresenterOptions = Readonly<{
  locale?: string
  unavailableLabel?: string
}>

export class KPIPresenter {
  constructor(private readonly options: KPIPresenterOptions = {}) {}

  present<TInput>(
    definition: KPIDefinition<TInput>,
    analysis: KPIAnalysis
  ): KPIViewModel {
    const format = (value: number) => formatValue(definition, value, this.options.locale)

    return Object.freeze({
      id: definition.id,
      name: definition.name,
      description: definition.description,
      available: analysis.result.availability === "available",
      value: analysis.result.value,
      formattedValue: analysis.result.value === null
        ? this.options.unavailableLabel ?? "Indisponível"
        : format(analysis.result.value),
      calculatedAt: analysis.result.calculatedAt.toISOString(),
      sla: analysis.sla
        ? Object.freeze({
            status: analysis.sla.status,
            statusLabel: slaLabel(analysis.sla.status),
            target: analysis.sla.target,
            formattedTarget: format(analysis.sla.target),
            delta: analysis.sla.delta,
          })
        : null,
      trend: analysis.trend
        ? Object.freeze({
            direction: analysis.trend.direction,
            directionLabel: trendLabel(analysis.trend.direction),
            absoluteChange: analysis.trend.absoluteChange,
            percentageChange: analysis.trend.percentageChange,
            formattedPercentageChange: analysis.trend.percentageChange === null
              ? null
              : formatPercentage(analysis.trend.percentageChange, this.options.locale),
          })
        : null,
      benchmark: analysis.benchmark
        ? Object.freeze({
            label: analysis.benchmark.label,
            value: analysis.benchmark.benchmark,
            formattedValue: format(analysis.benchmark.benchmark),
            comparison: analysis.benchmark.comparison,
            comparisonLabel: comparisonLabel(analysis.benchmark.comparison),
            delta: analysis.benchmark.delta,
          })
        : null,
      alerts: Object.freeze(analysis.alerts.map((alert) => Object.freeze({
        id: alert.id,
        severity: alert.severity,
        severityLabel: severityLabel(alert.severity),
        message: alert.message,
      }))),
      forecast: analysis.forecast
        ? Object.freeze({
            available: analysis.forecast.status === "available",
            points: Object.freeze(analysis.forecast.points.map((point) => Object.freeze({
              occurredAt: point.occurredAt.toISOString(),
              value: point.value,
              formattedValue: format(point.value),
            }))),
          })
        : null,
    })
  }
}

function formatValue<TInput>(
  definition: KPIDefinition<TInput>,
  value: number,
  locale = "pt-BR"
): string {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: definition.precision ?? 0,
    maximumFractionDigits: definition.precision ?? 0,
  }).format(value)

  return suffixFor(definition.valueKind, definition.unit, formatted)
}

function suffixFor(kind: KPIValueKind, unit: string | null | undefined, value: string): string {
  if (kind === "percentage") return `${value}%`
  return unit ? `${value} ${unit}` : value
}

function formatPercentage(value: number, locale = "pt-BR"): string {
  const sign = value > 0 ? "+" : ""
  return `${sign}${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`
}

function slaLabel(status: "met" | "breached" | "unavailable"): string {
  if (status === "met") return "Meta atendida"
  if (status === "breached") return "Meta não atendida"
  return "Indisponível"
}

function trendLabel(direction: "up" | "down" | "stable" | "unavailable"): string {
  if (direction === "up") return "Em alta"
  if (direction === "down") return "Em queda"
  if (direction === "stable") return "Estável"
  return "Indisponível"
}

function comparisonLabel(comparison: "above" | "below" | "equal" | "unavailable"): string {
  if (comparison === "above") return "Acima do benchmark"
  if (comparison === "below") return "Abaixo do benchmark"
  if (comparison === "equal") return "No benchmark"
  return "Indisponível"
}

function severityLabel(severity: "info" | "warning" | "critical"): string {
  if (severity === "info") return "Informação"
  if (severity === "warning") return "Atenção"
  return "Crítico"
}
