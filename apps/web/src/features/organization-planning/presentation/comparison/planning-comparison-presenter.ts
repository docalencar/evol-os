import type { MetricDelta, ScenarioComparisonResult } from "../../projection/comparison"
import { formatCount, formatHeadcount, formatHeadcountDelta, formatSignedCount } from "../shared/planning-formatters"
import { getPlanningFieldLabel, planningChangeLabels, planningEntityLabels } from "../shared/planning-labels"
import type { PlanningPresentationColor, PlanningPresentationIcon } from "../shared/planning-severity"
import type {
  PlanningComparisonChangeViewModel,
  PlanningComparisonMetricViewModel,
  PlanningComparisonSectionViewModel,
  PlanningComparisonViewModel,
} from "./planning-comparison-view-model"

type ChangeType = PlanningComparisonChangeViewModel["changeType"]
type SectionId = PlanningComparisonSectionViewModel["id"]

export class PlanningComparisonPresenter {
  static create(): PlanningComparisonPresenter {
    return new PlanningComparisonPresenter()
  }

  present(comparison: ScenarioComparisonResult): PlanningComparisonViewModel {
    const sections = Object.freeze([
      section("departments", comparison.summary.departments.total, [
        ...comparison.departments.created.map((item) => change("departments", "created", item.entity.id, item.entity.name)),
        ...comparison.departments.updated.map((item) => change("departments", "updated", item.after.id, item.after.name, item.changedFields)),
        ...comparison.departments.archived.map((item) => change("departments", "archived", item.after.id, item.after.name)),
        ...comparison.departments.removed.map((item) => change("departments", "removed", item.entity.id, item.entity.name)),
      ]),
      section("teams", comparison.summary.teams.total, [
        ...comparison.teams.created.map((item) => change("teams", "created", item.entity.id, item.entity.name)),
        ...comparison.teams.updated.map((item) => change("teams", "updated", item.after.id, item.after.name, item.changedFields)),
        ...comparison.teams.archived.map((item) => change("teams", "archived", item.after.id, item.after.name)),
        ...comparison.teams.removed.map((item) => change("teams", "removed", item.entity.id, item.entity.name)),
      ]),
      section("positions", comparison.summary.positions.total, [
        ...comparison.positions.created.map((item) => change("positions", "created", item.entity.id, item.entity.name)),
        ...comparison.positions.updated.map((item) => change("positions", "updated", item.after.id, item.after.name, item.changedFields)),
        ...comparison.positions.archived.map((item) => change("positions", "archived", item.after.id, item.after.name)),
        ...comparison.positions.removed.map((item) => change("positions", "removed", item.entity.id, item.entity.name)),
      ]),
      section("employees", comparison.summary.employees.total, [
        ...comparison.employees.created.map((item) => change("employees", "created", item.entity.id, item.entity.id)),
        ...comparison.employees.updated.map((item) => change("employees", "updated", item.after.id, item.after.id, item.changedFields)),
        ...comparison.employees.transferred.map((item) => change("employees", "transferred", item.after.id, item.after.id, ["placement"])),
        ...comparison.employees.terminated.map((item) => change("employees", "terminated", item.after.id, item.after.id)),
        ...comparison.employees.removed.map((item) => change("employees", "removed", item.entity.id, item.entity.id)),
      ]),
      section("vacancies", comparison.summary.vacancies.total, [
        ...comparison.vacancies.created.map((item) => change("vacancies", "created", item.entity.id, item.entity.id)),
        ...comparison.vacancies.updated.map((item) => change("vacancies", "updated", item.after.id, item.after.id, item.changedFields)),
        ...comparison.vacancies.closed.map((item) => change("vacancies", "closed", item.after.id, item.after.id)),
        ...comparison.vacancies.removed.map((item) => change("vacancies", "removed", item.entity.id, item.entity.id)),
      ]),
    ])

    return Object.freeze({
      summary: Object.freeze({
        totalChanges: comparison.summary.totalChanges,
        totalChangesLabel: formatCount(comparison.summary.totalChanges, "alteração", "alterações"),
        isEmpty: comparison.summary.totalChanges === 0,
      }),
      metrics: Object.freeze([
        metric("headcount", "Headcount", comparison.metrics.headcount, "colaborador", "colaboradores", true),
        metric("vacancies", "Vagas ativas", comparison.metrics.vacancies, "vaga", "vagas"),
        metric("departments", "Departamentos ativos", comparison.metrics.departments, "departamento", "departamentos"),
        metric("positions", "Cargos ativos", comparison.metrics.positions, "cargo", "cargos"),
      ]),
      sections,
    })
  }
}

function section(id: SectionId, total: number, changes: readonly PlanningComparisonChangeViewModel[]): PlanningComparisonSectionViewModel {
  return Object.freeze({
    id,
    label: planningEntityLabels[id],
    total,
    totalLabel: formatCount(total, "alteração", "alterações"),
    changes: Object.freeze(changes),
    isEmpty: total === 0,
  })
}

function change(
  sectionId: SectionId,
  changeType: ChangeType,
  entityId: string,
  entityLabel: string,
  changedFields: readonly string[] = []
): PlanningComparisonChangeViewModel {
  return Object.freeze({
    id: `${sectionId}:${changeType}:${entityId}`,
    entityId,
    entityLabel,
    changeType,
    changeLabel: planningChangeLabels[changeType],
    changedFields: Object.freeze(changedFields.map(getPlanningFieldLabel)),
  })
}

function metric(
  id: PlanningComparisonMetricViewModel["id"],
  label: string,
  value: MetricDelta,
  singular: string,
  plural: string,
  headcount = false
): PlanningComparisonMetricViewModel {
  const presentation = deltaPresentation(value.delta)
  return Object.freeze({
    id,
    label,
    before: value.before,
    beforeLabel: headcount ? formatHeadcount(value.before) : formatCount(value.before, singular, plural),
    after: value.after,
    afterLabel: headcount ? formatHeadcount(value.after) : formatCount(value.after, singular, plural),
    delta: value.delta,
    deltaLabel: headcount ? formatHeadcountDelta(value.delta) : formatSignedCount(value.delta, singular, plural),
    ...presentation,
  })
}

function deltaPresentation(delta: number): Readonly<{ color: PlanningPresentationColor; icon: PlanningPresentationIcon }> {
  if (delta > 0) return Object.freeze({ color: "blue", icon: "arrow-up" })
  if (delta < 0) return Object.freeze({ color: "amber", icon: "arrow-down" })
  return Object.freeze({ color: "slate", icon: "circle" })
}
