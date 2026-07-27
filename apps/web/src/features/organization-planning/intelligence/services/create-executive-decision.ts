import type {
  ScenarioComparisonSummary,
} from "../../comparison"

import {
  calculateExecutiveScenarioSummary,
} from "../executive-summary"

import type {
  ScenarioExecutiveSummary,
} from "../executive-summary"

import type {
  ScenarioStructuralImpact,
} from "../structural-impact"

import type {
  ScenarioInsight,
} from "../insights"

import type {
  SpanOfControlResult,
} from "../span-of-control"

import type {
  PositionCapacityResult,
} from "../position-capacity"


export type CreateExecutiveDecisionInput =
Readonly<{
  comparison:
    ScenarioComparisonSummary

  structuralImpact:
    ScenarioStructuralImpact

  insights:
    readonly ScenarioInsight[]

  spanOfControl:
    SpanOfControlResult

  positionCapacity:
    PositionCapacityResult
}>


export type ExecutiveDecision =
Readonly<{
  summary:
    ScenarioExecutiveSummary
}>


export function createExecutiveDecision(
  input:
    CreateExecutiveDecisionInput
): ExecutiveDecision {

  return Object.freeze({
    summary:
      calculateExecutiveScenarioSummary(
        input
      ),
  })
}
