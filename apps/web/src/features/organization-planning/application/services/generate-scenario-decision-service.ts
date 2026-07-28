import type {
  ScenarioAnalysis,
} from "../../analysis"

import {
  createScenarioDecision,
  type ScenarioDecision,
} from "../../decision"

import type {
  GenerateScenarioAnalysisService,
} from "./generate-scenario-analysis-service"

export type GenerateScenarioDecisionInput =
  Readonly<{
    companyId: string
    projectionId: string
  }>

export type ScenarioAnalysisGenerator =
  Pick<
    GenerateScenarioAnalysisService,
    "execute"
  >

export type CreateDecisionFromAnalysis =
  (
    analysis:
      ScenarioAnalysis,

    generatedAt:
      Date
  ) => ScenarioDecision

export type GenerateScenarioDecisionServiceDependencies =
  Readonly<{
    analysisService:
      ScenarioAnalysisGenerator

    createDecision?:
      CreateDecisionFromAnalysis

    now?: () => Date
  }>

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

function requireValidDate(
  value: Date
): Date {
  if (
    !(value instanceof Date) ||
    Number.isNaN(value.getTime())
  ) {
    throw new Error(
      "O relógio do serviço retornou uma data inválida."
    )
  }

  return new Date(
    value.getTime()
  )
}

export class GenerateScenarioDecisionService {
  private readonly createDecision:
    CreateDecisionFromAnalysis

  private readonly now:
    () => Date

  constructor(
    private readonly analysisService:
      ScenarioAnalysisGenerator,

    createDecision:
      CreateDecisionFromAnalysis =
      (
        analysis,
        generatedAt
      ) =>
        createScenarioDecision({
          analysis,
          generatedAt,
        }),

    now:
      () => Date =
      () => new Date()
  ) {
    this.createDecision =
      createDecision

    this.now =
      now
  }

  async execute(
    input:
      GenerateScenarioDecisionInput
  ): Promise<ScenarioDecision> {
    const companyId =
      requireText(
        input.companyId,
        "companyId"
      )

    const projectionId =
      requireText(
        input.projectionId,
        "projectionId"
      )

    const analysis =
      await this.analysisService.execute({
        companyId,
        projectionId,
      })

    if (
      analysis.projectionId !==
      projectionId
    ) {
      throw new Error(
        "A análise retornada não pertence à projeção informada."
      )
    }

    const generatedAt =
      requireValidDate(
        this.now()
      )

    return this.createDecision(
      analysis,
      generatedAt
    )
  }
}

export function createGenerateScenarioDecisionService(
  dependencies:
    GenerateScenarioDecisionServiceDependencies
) {
  return new GenerateScenarioDecisionService(
    dependencies.analysisService,
    dependencies.createDecision,
    dependencies.now
  )
}
