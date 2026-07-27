import type {
  ProjectionContract,
  ProjectionMetrics,
} from "../../projection"
import type {
  ScenarioIntelligence,
} from "../types"
import {
  createFinancialIntelligence,
} from "./create-financial-intelligence"
import {
  createOrganizationIntelligence,
} from "./create-organization-intelligence"
import {
  createVacancyIntelligence,
} from "./create-vacancy-intelligence"
import {
  createWorkforceIntelligence,
} from "./create-workforce-intelligence"

export type CreateScenarioIntelligenceInput =
  Readonly<{
    currentMetrics:
      ProjectionMetrics
    projection:
      ProjectionContract
  }>

export function createScenarioIntelligence(
  input:
    CreateScenarioIntelligenceInput
): ScenarioIntelligence {
  const projectedMetrics =
    input.projection.metrics

  return Object.freeze({
    projectionId:
      input.projection.id,

    scenarioId:
      input.projection.scenarioId,

    projectionVersion:
      input.projection.version,

    generatedAt:
      new Date(
        input.projection
          .manifest
          .generatedAt
          .getTime()
      ),

    workforce:
      createWorkforceIntelligence(
        input.currentMetrics,
        projectedMetrics
      ),

    vacancies:
      createVacancyIntelligence(
        input.currentMetrics,
        projectedMetrics
      ),

    financial:
      createFinancialIntelligence(
        input.currentMetrics,
        projectedMetrics
      ),

    organization:
      createOrganizationIntelligence(
        input.currentMetrics,
        projectedMetrics
      ),
  })
}
