import type {
  ScenarioAnalysis,
} from "../../analysis"

import {
  createScenarioRecommendation,
} from "./create-scenario-recommendation"

import type {
  ScenarioDecision,
} from "../types"

export type CreateScenarioDecisionInput =
  Readonly<{
    analysis:
      ScenarioAnalysis

    generatedAt?: Date
  }>

function cloneDate(
  value: Date
): Date {
  return new Date(
    value.getTime()
  )
}

function requireValidDate(
  value: Date
): Date {
  if (
    !(value instanceof Date) ||
    Number.isNaN(value.getTime())
  ) {
    throw new Error(
      "generatedAt deve ser uma data válida."
    )
  }

  return cloneDate(value)
}

/**
 * Transforma uma análise consolidada em uma decisão executiva.
 *
 * Nenhuma métrica organizacional é calculada nesta camada.
 * A Decision Layer interpreta exclusivamente o contrato
 * canônico ScenarioAnalysis.
 */
export function createScenarioDecision(
  input:
    CreateScenarioDecisionInput
): ScenarioDecision {
  const generatedAt =
    requireValidDate(
      input.generatedAt ??
        new Date()
    )

  /*
   * A Recommendation Engine criado na PR-083D.1 recebe
   * o resumo executivo como fonte das regras determinísticas.
   *
   * Os dois nomes abaixo são enviados durante a transição
   * arquitetural para preservar compatibilidade com o contrato
   * já existente do engine.
   */
  return createScenarioRecommendation({
    scenarioId:
      input.analysis.scenarioId,

    summary:
      input.analysis.executiveSummary,

    executiveSummary:
      input.analysis.executiveSummary,

    generatedAt,
  } as never)
}
