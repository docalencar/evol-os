import type { PlanningInsights, PlanningInsightItem, PlanningRiskIndicator, PlanningWarning } from "../../planning-insights"
import { formatCount, formatHeadcountDelta, formatPercentage, formatSignedCount } from "../shared/planning-formatters"
import { getPlanningCategoryLabel, getPlanningInsightTitle } from "../shared/planning-labels"
import { presentPlanningSeverity, type PlanningPresentationIcon } from "../shared/planning-severity"
import type {
  PlanningInsightsViewModel,
  PlanningKpiCardViewModel,
  PlanningOpportunityViewModel,
  PlanningRecommendationViewModel,
  PlanningRiskIndicatorViewModel,
  PlanningWarningViewModel,
} from "./planning-insights-view-model"

export class PlanningInsightsPresenter {
  static create(): PlanningInsightsPresenter {
    return new PlanningInsightsPresenter()
  }

  present(insights: PlanningInsights): PlanningInsightsViewModel {
    return Object.freeze({
      summary: Object.freeze({
        totalChanges: insights.summary.totalChanges,
        totalChangesLabel: formatCount(insights.summary.totalChanges, "alteração", "alterações"),
        entitiesAffected: insights.summary.entitiesAffected,
        entitiesAffectedLabel: formatCount(insights.summary.entitiesAffected, "entidade afetada", "entidades afetadas"),
        organizationalGrowth: insights.summary.organizationalGrowth,
        organizationalGrowthLabel: formatHeadcountDelta(insights.summary.organizationalGrowth),
        organizationalReduction: insights.summary.organizationalReduction,
        organizationalReductionLabel: formatSignedCount(-insights.summary.organizationalReduction, "colaborador", "colaboradores"),
        risk: presentPlanningSeverity(insights.summary.riskLevel),
      }),
      kpis: presentKpis(insights),
      warnings: Object.freeze(insights.warnings.map(presentWarning)),
      opportunities: Object.freeze(insights.opportunities.map(presentOpportunity)),
      riskIndicators: Object.freeze(insights.riskIndicators.map(presentRiskIndicator)),
      recommendations: Object.freeze(insights.recommendations.map(presentRecommendation)),
    })
  }
}

function presentKpis(insights: PlanningInsights): readonly PlanningKpiCardViewModel[] {
  return Object.freeze([
    kpi("headcount_delta", "Variação de headcount", insights.kpis.headcountDelta, formatHeadcountDelta(insights.kpis.headcountDelta), "users"),
    kpi("vacancies_delta", "Variação de vagas", insights.kpis.vacanciesDelta, formatSignedCount(insights.kpis.vacanciesDelta, "vaga", "vagas"), "building"),
    kpi("departments_created", "Departamentos criados", insights.kpis.departmentsCreated, formatCount(insights.kpis.departmentsCreated, "departamento", "departamentos"), "building"),
    kpi("departments_archived", "Departamentos arquivados", insights.kpis.departmentsArchived, formatCount(insights.kpis.departmentsArchived, "departamento", "departamentos"), "building"),
    kpi("teams_created", "Times criados", insights.kpis.teamsCreated, formatCount(insights.kpis.teamsCreated, "time", "times"), "users"),
    kpi("positions_created", "Cargos criados", insights.kpis.positionsCreated, formatCount(insights.kpis.positionsCreated, "cargo", "cargos"), "building"),
    kpi("employees_transferred", "Colaboradores transferidos", insights.kpis.employeesTransferred, formatCount(insights.kpis.employeesTransferred, "colaborador", "colaboradores"), "arrow-right-left"),
    kpi("employees_terminated", "Colaboradores desligados", insights.kpis.employeesTerminated, formatCount(insights.kpis.employeesTerminated, "colaborador", "colaboradores"), "arrow-down"),
    kpi("vacancies_closed", "Vagas encerradas", insights.kpis.vacanciesClosed, formatCount(insights.kpis.vacanciesClosed, "vaga", "vagas"), "check-circle"),
  ])
}

function kpi(
  id: string,
  label: string,
  value: number,
  valueLabel: string,
  icon: PlanningPresentationIcon
): PlanningKpiCardViewModel {
  return Object.freeze({ id, label, value, valueLabel, color: value === 0 ? "slate" : "blue", icon })
}

function presentWarning(warning: PlanningWarning): PlanningWarningViewModel {
  const severity = presentPlanningSeverity(warning.severity)
  return Object.freeze({
    id: warning.id,
    title: getPlanningInsightTitle(warning.id),
    description: warning.message,
    category: getPlanningCategoryLabel(warning.category),
    badge: severity.label,
    color: severity.color,
    icon: severity.icon,
  })
}

function presentRecommendation(recommendation: PlanningInsightItem): PlanningRecommendationViewModel {
  return Object.freeze({
    id: recommendation.id,
    title: getPlanningInsightTitle(recommendation.id),
    description: recommendation.message,
    priority: "recommended",
    priorityLabel: "Recomendada",
  })
}

function presentOpportunity(opportunity: PlanningInsightItem): PlanningOpportunityViewModel {
  return Object.freeze({
    id: opportunity.id,
    title: getPlanningInsightTitle(opportunity.id),
    description: opportunity.message,
    category: getPlanningCategoryLabel(opportunity.category),
    color: "green",
    icon: "lightbulb",
  })
}

function presentRiskIndicator(indicator: PlanningRiskIndicator): PlanningRiskIndicatorViewModel {
  const percentage = indicator.id !== "excessive_structural_changes"
  return Object.freeze({
    id: indicator.id,
    label: getPlanningInsightTitle(indicator.id),
    value: indicator.value,
    valueLabel: percentage ? formatPercentage(indicator.value) : formatCount(indicator.value, "alteração", "alterações"),
    threshold: indicator.threshold,
    thresholdLabel: percentage ? formatPercentage(indicator.threshold) : formatCount(indicator.threshold, "alteração", "alterações"),
    severity: presentPlanningSeverity(indicator.severity),
  })
}
