import type { PlanningDashboardViewModel } from "../application"
import type { ExecutiveDashboardViewModel, ExecutiveMetricViewModel } from "./executive-dashboard-view-model"

export class ExecutiveDashboardPresenter {
  static create(): ExecutiveDashboardPresenter { return new ExecutiveDashboardPresenter() }

  present(source: PlanningDashboardViewModel): ExecutiveDashboardViewModel {
    const comparisonMetrics = source.comparison.metrics.map((metric) => Object.freeze({
      id: metric.id,
      label: metric.label,
      valueLabel: metric.afterLabel,
      contextLabel: `${metric.beforeLabel} → ${metric.afterLabel} (${metric.deltaLabel})`,
      color: metric.color,
      icon: metric.icon,
    }))
    const insightMetrics = source.insights.kpis.map((metric) => Object.freeze({
      id: metric.id,
      label: metric.label,
      valueLabel: metric.valueLabel,
      contextLabel: null,
      color: metric.color,
      icon: metric.icon,
    }))
    const headcount = comparisonMetrics.find((metric) => metric.id === "headcount") ?? null
    const metrics: readonly ExecutiveMetricViewModel[] = Object.freeze([
      ...comparisonMetrics.filter((metric) => metric.id !== "headcount"),
      ...insightMetrics,
    ])
    const summary = source.insights.summary

    return Object.freeze({
      scenario: Object.freeze({ id: source.scenario.id, name: source.scenario.name, status: source.scenario.status, version: source.version }),
      summary: Object.freeze({
        headline: source.comparison.summary.isEmpty
          ? "O cenário não possui alterações organizacionais."
          : `O cenário reúne ${summary.totalChangesLabel}, com ${summary.entitiesAffectedLabel} e ${summary.risk.riskLabel.toLowerCase()}.`,
        riskLabel: summary.risk.riskLabel,
        color: summary.risk.color,
        icon: summary.risk.icon,
      }),
      headcount,
      metrics,
      alerts: Object.freeze(source.insights.warnings.map((warning) => Object.freeze({ ...warning }))),
      impacts: Object.freeze(source.comparison.sections.map((section) => Object.freeze({ id: section.id, label: section.label, totalLabel: section.totalLabel, isEmpty: section.isEmpty }))),
      generatedAt: source.generatedAt,
      isEmpty: source.comparison.summary.isEmpty,
    })
  }
}
