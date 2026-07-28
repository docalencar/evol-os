import type {
  CreateScenarioAnalysisInput,
  ScenarioAnalysis,
} from "../types"

function cloneDate(
  value: Date
): Date {
  return new Date(
    value.getTime()
  )
}

function requireDate(
  value: Date,
  field: string
): Date {
  if (
    !(value instanceof Date) ||
    Number.isNaN(value.getTime())
  ) {
    throw new Error(
      `${field} deve ser uma data válida.`
    )
  }

  return cloneDate(value)
}

function requireText(
  value: string,
  field: string
): string {
  const normalized =
    value.trim()

  if (!normalized) {
    throw new Error(
      `${field} é obrigatório.`
    )
  }

  return normalized
}

function requireProjectionVersion(
  value: number
): number {
  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new Error(
      "projectionVersion deve ser um inteiro positivo."
    )
  }

  return value
}

/**
 * Consolida os resultados calculados pela camada Intelligence
 * em um único contrato imutável.
 *
 * Esta função não executa cálculos organizacionais. Sua função é
 * preservar a fronteira entre Intelligence e Analysis e estabelecer
 * uma fonte única da verdade para os consumidores superiores.
 */
export function createScenarioAnalysis(
  input:
    CreateScenarioAnalysisInput
): ScenarioAnalysis {
  const projectionId =
    requireText(
      input.intelligence.projectionId,
      "projectionId"
    )

  const scenarioId =
    requireText(
      input.intelligence.scenarioId,
      "scenarioId"
    )

  const projectionVersion =
    requireProjectionVersion(
      input.intelligence.projectionVersion
    )

  const generatedAt =
    requireDate(
      input.generatedAt ??
        input.intelligence.generatedAt,
      "generatedAt"
    )

  const insights =
    Object.freeze([
      ...input.insights,
    ])

  return Object.freeze({
    projectionId,
    scenarioId,
    projectionVersion,
    generatedAt,

    intelligence:
      input.intelligence,

    structuralImpact:
      input.structuralImpact,

    spanOfControl:
      input.spanOfControl,

    positionCapacity:
      input.positionCapacity,

    insights,

    executiveSummary:
      input.executiveSummary,
  })
}
