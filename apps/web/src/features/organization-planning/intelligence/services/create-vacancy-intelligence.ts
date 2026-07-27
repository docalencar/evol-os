import type {
  ProjectionMetrics,
} from "../../projection"
import type {
  VacancyIntelligence,
} from "../types"
import {
  createMetricDelta,
} from "./create-metric-delta"

export function createVacancyIntelligence(
  current:
    ProjectionMetrics,
  projected:
    ProjectionMetrics
): VacancyIntelligence {
  return Object.freeze({
    vacancies:
      createMetricDelta(
        current.vacancies,
        projected.vacancies
      ),
  })
}
