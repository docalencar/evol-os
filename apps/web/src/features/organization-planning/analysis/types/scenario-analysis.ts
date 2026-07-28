import type {
  PositionCapacityResult,
  ScenarioExecutiveSummary,
  ScenarioInsight,
  ScenarioIntelligence,
  ScenarioStructuralImpact,
  SpanOfControlResult,
} from "../../intelligence"

/**
 * Contrato canônico de análise de um cenário organizacional.
 *
 * A camada Analysis descreve o que foi identificado no cenário.
 * Recomendações e ações executivas pertencem à camada Decision.
 */
export type ScenarioAnalysis =
  Readonly<{
    projectionId: string
    scenarioId: string
    projectionVersion: number
    generatedAt: Date

    intelligence:
      ScenarioIntelligence

    structuralImpact:
      ScenarioStructuralImpact

    spanOfControl:
      SpanOfControlResult

    positionCapacity:
      PositionCapacityResult

    insights:
      readonly ScenarioInsight[]

    executiveSummary:
      ScenarioExecutiveSummary
  }>

export type CreateScenarioAnalysisInput =
  Readonly<{
    intelligence:
      ScenarioIntelligence

    structuralImpact:
      ScenarioStructuralImpact

    spanOfControl:
      SpanOfControlResult

    positionCapacity:
      PositionCapacityResult

    insights:
      readonly ScenarioInsight[]

    executiveSummary:
      ScenarioExecutiveSummary

    generatedAt?: Date
  }>
