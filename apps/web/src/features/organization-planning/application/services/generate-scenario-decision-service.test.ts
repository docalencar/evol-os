import assert from "node:assert/strict"

import {
  describe,
  it,
} from "node:test"

import type {
  ScenarioAnalysis,
} from "../../analysis"

import type {
  ScenarioDecision,
} from "../../decision"

import {
  GenerateScenarioDecisionService,
} from "./generate-scenario-decision-service"

function createAnalysis(
  overrides:
    Partial<ScenarioAnalysis> = {}
): ScenarioAnalysis {
  return {
    projectionId:
      "projection-1",

    scenarioId:
      "scenario-1",

    projectionVersion:
      1,

    generatedAt:
      new Date(
        "2026-07-27T12:00:00.000Z"
      ),

    intelligence:
      Object.freeze({
        projectionId:
          "projection-1",

        scenarioId:
          "scenario-1",

        projectionVersion:
          1,

        generatedAt:
          new Date(
            "2026-07-27T12:00:00.000Z"
          ),

        workforce: {
          headcount: {
            current:
              10,

            projected:
              10,

            absolute:
              0,

            percentage:
              0,

            direction:
              "unchanged",
          },
        },

        vacancies: {
          vacancies: {
            current:
              0,

            projected:
              0,

            absolute:
              0,

            percentage:
              null,

            direction:
              "unchanged",
          },
        },

        financial: {
          salaryMass: {
            current:
              0,

            projected:
              0,

            absolute:
              0,

            percentage:
              null,

            direction:
              "unchanged",
          },
        },

        organization: {
          departments: {
            current:
              1,

            projected:
              1,

            absolute:
              0,

            percentage:
              0,

            direction:
              "unchanged",
          },

          positions: {
            current:
              1,

            projected:
              1,

            absolute:
              0,

            percentage:
              0,

            direction:
              "unchanged",
          },
        },
      }),

    structuralImpact:
      Object.freeze({
        marker:
          "structural-impact",
      }) as never,

    spanOfControl:
      Object.freeze({
        marker:
          "span-of-control",
      }) as never,

    positionCapacity:
      Object.freeze({
        marker:
          "position-capacity",
      }) as never,

    insights:
      Object.freeze([]),

    executiveSummary: {
      status:
        "healthy",

      recommendation:
        "approve",

      totalChanges:
        0,

      structuralWarnings:
        0,

      leadershipWarnings:
        0,

      capacityWarnings:
        0,

      criticalRisks:
        0,

      summary:
        "O cenário está saudável.",
    },

    ...overrides,
  }
}

function createDecision(
  analysis:
    ScenarioAnalysis,

  generatedAt:
    Date
): ScenarioDecision {
  return {
    scenarioId:
      analysis.scenarioId,

    recommendation:
      "approve",

    confidence: {
      score:
        92,

      level:
        "very_high",
    },

    reasons:
      [],

    actions: [
      "approve_scenario",
      "compare_scenarios",
    ],

    generatedAt,
  } as ScenarioDecision
}

describe(
  "GenerateScenarioDecisionService",
  () => {
    it(
      "gera uma decisão exclusivamente a partir da análise",
      async () => {
        const requestedInputs:
          Array<{
            companyId: string
            projectionId: string
          }> = []

        const analysis =
          createAnalysis()

        const generatedAt =
          new Date(
            "2026-07-27T18:00:00.000Z"
          )

        const analysisService = {
          async execute(
            input: {
              companyId: string
              projectionId: string
            }
          ) {
            requestedInputs.push(
              input
            )

            return analysis
          },
        }

        let receivedAnalysis:
          ScenarioAnalysis | null =
          null

        let receivedGeneratedAt:
          Date | null =
          null

        const service =
          new GenerateScenarioDecisionService(
            analysisService,

            (
              currentAnalysis,
              currentGeneratedAt
            ) => {
              receivedAnalysis =
                currentAnalysis

              receivedGeneratedAt =
                currentGeneratedAt

              return createDecision(
                currentAnalysis,
                currentGeneratedAt
              )
            },

            () => generatedAt
          )

        const result =
          await service.execute({
            companyId:
              "company-1",

            projectionId:
              "projection-1",
          })

        assert.deepEqual(
          requestedInputs,
          [
            {
              companyId:
                "company-1",

              projectionId:
                "projection-1",
            },
          ]
        )

        assert.equal(
          receivedAnalysis,
          analysis
        )

        assert.ok(
          receivedGeneratedAt
        )

        assert.equal(
          receivedGeneratedAt
            ?.toISOString(),
          "2026-07-27T18:00:00.000Z"
        )

        assert.equal(
          result.scenarioId,
          "scenario-1"
        )

        assert.equal(
          result.recommendation,
          "approve"
        )
      }
    )

    it(
      "normaliza os identificadores antes de gerar a análise",
      async () => {
        const receivedInputs:
          Array<{
            companyId: string
            projectionId: string
          }> = []

        const service =
          new GenerateScenarioDecisionService(
            {
              async execute(input) {
                receivedInputs.push(
                  input
                )

                return createAnalysis()
              },
            },

            createDecision
          )

        await service.execute({
          companyId:
            "  company-1  ",

          projectionId:
            "  projection-1  ",
        })

        assert.deepEqual(
          receivedInputs,
          [
            {
              companyId:
                "company-1",

              projectionId:
                "projection-1",
            },
          ]
        )
      }
    )

    it(
      "rejeita companyId vazio antes de consultar a análise",
      async () => {
        let analysisWasRequested =
          false

        const service =
          new GenerateScenarioDecisionService(
            {
              async execute() {
                analysisWasRequested =
                  true

                return createAnalysis()
              },
            },

            createDecision
          )

        await assert.rejects(
          () =>
            service.execute({
              companyId:
                "   ",

              projectionId:
                "projection-1",
            }),
          /companyId é obrigatório/
        )

        assert.equal(
          analysisWasRequested,
          false
        )
      }
    )

    it(
      "rejeita projectionId vazio antes de consultar a análise",
      async () => {
        let analysisWasRequested =
          false

        const service =
          new GenerateScenarioDecisionService(
            {
              async execute() {
                analysisWasRequested =
                  true

                return createAnalysis()
              },
            },

            createDecision
          )

        await assert.rejects(
          () =>
            service.execute({
              companyId:
                "company-1",

              projectionId:
                "",
            }),
          /projectionId é obrigatório/
        )

        assert.equal(
          analysisWasRequested,
          false
        )
      }
    )

    it(
      "rejeita análise pertencente a outra projeção",
      async () => {
        let decisionWasCreated =
          false

        const service =
          new GenerateScenarioDecisionService(
            {
              async execute() {
                return createAnalysis({
                  projectionId:
                    "projection-2",
                })
              },
            },

            (
              analysis,
              generatedAt
            ) => {
              decisionWasCreated =
                true

              return createDecision(
                analysis,
                generatedAt
              )
            }
          )

        await assert.rejects(
          () =>
            service.execute({
              companyId:
                "company-1",

              projectionId:
                "projection-1",
            }),
          /não pertence à projeção/
        )

        assert.equal(
          decisionWasCreated,
          false
        )
      }
    )

    it(
      "propaga erros produzidos pelo serviço de análise",
      async () => {
        const service =
          new GenerateScenarioDecisionService(
            {
              async execute() {
                throw new Error(
                  "Falha ao gerar análise."
                )
              },
            },

            createDecision
          )

        await assert.rejects(
          () =>
            service.execute({
              companyId:
                "company-1",

              projectionId:
                "projection-1",
            }),
          /Falha ao gerar análise/
        )
      }
    )

    it(
      "rejeita uma data inválida produzida pelo relógio",
      async () => {
        let decisionWasCreated =
          false

        const service =
          new GenerateScenarioDecisionService(
            {
              async execute() {
                return createAnalysis()
              },
            },

            (
              analysis,
              generatedAt
            ) => {
              decisionWasCreated =
                true

              return createDecision(
                analysis,
                generatedAt
              )
            },

            () =>
              new Date(
                "invalid-date"
              )
          )

        await assert.rejects(
          () =>
            service.execute({
              companyId:
                "company-1",

              projectionId:
                "projection-1",
            }),
          /relógio do serviço/
        )

        assert.equal(
          decisionWasCreated,
          false
        )
      }
    )
  }
)
