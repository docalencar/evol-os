import assert from "node:assert/strict"
import test from "node:test"

import type {
  ScenarioExecutiveSummary,
} from "../../intelligence"

import {
  createScenarioRecommendation,
} from "../services"

const generatedAt =
  new Date(
    "2026-07-27T12:00:00.000Z"
  )

function createSummary(
  overrides:
    Partial<ScenarioExecutiveSummary> = {}
): ScenarioExecutiveSummary {
  return {
    status: "healthy",
    recommendation: "approve",
    totalChanges: 4,
    structuralWarnings: 0,
    leadershipWarnings: 0,
    capacityWarnings: 0,
    criticalRisks: 0,
    summary:
      "O cenário apresenta uma configuração organizacional saudável.",
    ...overrides,
  }
}

test(
  "recommends approval for a healthy scenario without warnings",
  () => {
    const decision =
      createScenarioRecommendation({
        scenarioId:
          "scenario-healthy",
        summary:
          createSummary(),
        generatedAt,
      })

    assert.equal(
      decision.recommendation,
      "approve"
    )

    assert.equal(
      decision.confidence.score,
      92
    )

    assert.equal(
      decision.confidence.level,
      "very_high"
    )

    assert.equal(
      decision.generatedAt.toISOString(),
      generatedAt.toISOString()
    )

    assert.equal(
      decision.reasons.length,
      1
    )

    assert.equal(
      decision.actions.find(
        (action) =>
          action.type ===
          "approve_scenario"
      )?.recommended,
      true
    )
  }
)

test(
  "recommends approval with attention when warnings exist",
  () => {
    const decision =
      createScenarioRecommendation({
        scenarioId:
          "scenario-attention",
        summary:
          createSummary({
            status: "attention",
            structuralWarnings: 1,
            leadershipWarnings: 1,
          }),
        generatedAt,
      })

    assert.equal(
      decision.recommendation,
      "approve_with_attention"
    )

    assert.equal(
      decision.reasons.length,
      3
    )

    assert.equal(
      decision.actions.find(
        (action) =>
          action.type ===
          "compare_scenarios"
      )?.recommended,
      true
    )
  }
)

test(
  "requests revision when the executive recommendation is review",
  () => {
    const decision =
      createScenarioRecommendation({
        scenarioId:
          "scenario-review",
        summary:
          createSummary({
            status: "attention",
            recommendation: "review",
            structuralWarnings: 2,
            capacityWarnings: 1,
          }),
        generatedAt,
      })

    assert.equal(
      decision.recommendation,
      "request_revision"
    )

    assert.equal(
      decision.actions.find(
        (action) =>
          action.type ===
          "request_revision"
      )?.recommended,
      true
    )

    assert.equal(
      decision.actions.find(
        (action) =>
          action.type ===
          "generate_reorganization_proposal"
      )?.recommended,
      true
    )
  }
)

test(
  "rejects a scenario with a reject recommendation",
  () => {
    const decision =
      createScenarioRecommendation({
        scenarioId:
          "scenario-rejected",
        summary:
          createSummary({
            status: "critical",
            recommendation: "reject",
            structuralWarnings: 3,
            leadershipWarnings: 2,
            capacityWarnings: 2,
            criticalRisks: 2,
          }),
        generatedAt,
      })

    assert.equal(
      decision.recommendation,
      "reject"
    )

    assert.equal(
      decision.reasons.some(
        (reason) =>
          reason.source ===
          "critical_risk"
      ),
      true
    )

    assert.equal(
      decision.actions.find(
        (action) =>
          action.type ===
          "approve_scenario"
      )?.recommended,
      false
    )
  }
)

test(
  "rejects a critical scenario when critical risks exist",
  () => {
    const decision =
      createScenarioRecommendation({
        scenarioId:
          "scenario-critical",
        summary:
          createSummary({
            status: "critical",
            recommendation: "review",
            criticalRisks: 1,
          }),
        generatedAt,
      })

    assert.equal(
      decision.recommendation,
      "reject"
    )
  }
)

test(
  "reduces confidence when the scenario has several warnings",
  () => {
    const healthyDecision =
      createScenarioRecommendation({
        scenarioId:
          "scenario-healthy",
        summary:
          createSummary(),
        generatedAt,
      })

    const warningDecision =
      createScenarioRecommendation({
        scenarioId:
          "scenario-warning",
        summary:
          createSummary({
            status: "attention",
            structuralWarnings: 2,
            leadershipWarnings: 2,
            capacityWarnings: 2,
          }),
        generatedAt,
      })

    assert.equal(
      warningDecision.confidence.score <
        healthyDecision.confidence.score,
      true
    )
  }
)

test(
  "returns every supported executive action",
  () => {
    const decision =
      createScenarioRecommendation({
        scenarioId:
          "scenario-actions",
        summary:
          createSummary(),
        generatedAt,
      })

    assert.deepEqual(
      decision.actions.map(
        (action) => action.type
      ),
      [
        "approve_scenario",
        "request_revision",
        "generate_reorganization_proposal",
        "compare_scenarios",
      ]
    )
  }
)
