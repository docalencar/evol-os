import assert from "node:assert/strict"
import {
  describe,
  it,
} from "node:test"

import type {
  PositionCapacityResult,
  ScenarioExecutiveSummary,
  ScenarioInsight,
  ScenarioIntelligence,
  ScenarioStructuralImpact,
  SpanOfControlResult,
} from "../../intelligence"

import {
  createScenarioAnalysis,
} from "../services"

function createIntelligence(
  overrides:
    Partial<ScenarioIntelligence> = {}
): ScenarioIntelligence {
  return {
    projectionId:
      "projection-1",

    scenarioId:
      "scenario-1",

    projectionVersion:
      2,

    generatedAt:
      new Date(
        "2026-07-27T12:00:00.000Z"
      ),

    workforce: {
      headcount: {
        current: 10,
        projected: 12,
        absolute: 2,
        percentage: 20,
        direction: "increase",
      },
    },

    vacancies: {
      vacancies: {
        current: 1,
        projected: 2,
        absolute: 1,
        percentage: 100,
        direction: "increase",
      },
    },

    financial: {
      salaryMass: {
        current: 100000,
        projected: 120000,
        absolute: 20000,
        percentage: 20,
        direction: "increase",
      },
    },

    organization: {
      departments: {
        current: 2,
        projected: 3,
        absolute: 1,
        percentage: 50,
        direction: "increase",
      },

      positions: {
        current: 5,
        projected: 6,
        absolute: 1,
        percentage: 20,
        direction: "increase",
      },
    },

    ...overrides,
  }
}

function createStructuralImpact():
  ScenarioStructuralImpact {
  return Object.freeze({
    marker:
      "structural-impact",
  }) as unknown as
    ScenarioStructuralImpact
}

function createSpanOfControl():
  SpanOfControlResult {
  return Object.freeze({
    marker:
      "span-of-control",
  }) as unknown as
    SpanOfControlResult
}

function createPositionCapacity():
  PositionCapacityResult {
  return Object.freeze({
    marker:
      "position-capacity",
  }) as unknown as
    PositionCapacityResult
}

function createInsights():
  readonly ScenarioInsight[] {
  return [
    Object.freeze({
      type:
        "headcount_growth",
      severity:
        "info",
      title:
        "Crescimento do quadro",
      description:
        "O cenário aumenta o quadro projetado.",
    }) as unknown as
      ScenarioInsight,
  ]
}

function createExecutiveSummary():
  ScenarioExecutiveSummary {
  return {
    status:
      "attention",

    recommendation:
      "review",

    totalChanges:
      2,

    structuralWarnings:
      1,

    leadershipWarnings:
      0,

    capacityWarnings:
      0,

    criticalRisks:
      0,

    summary:
      "O cenário deve ser revisado.",
  }
}

describe(
  "createScenarioAnalysis",
  () => {
    it(
      "consolida os resultados em um contrato canônico",
      () => {
        const intelligence =
          createIntelligence()

        const structuralImpact =
          createStructuralImpact()

        const spanOfControl =
          createSpanOfControl()

        const positionCapacity =
          createPositionCapacity()

        const insights =
          createInsights()

        const executiveSummary =
          createExecutiveSummary()

        const result =
          createScenarioAnalysis({
            intelligence,
            structuralImpact,
            spanOfControl,
            positionCapacity,
            insights,
            executiveSummary,
          })

        assert.equal(
          result.projectionId,
          "projection-1"
        )

        assert.equal(
          result.scenarioId,
          "scenario-1"
        )

        assert.equal(
          result.projectionVersion,
          2
        )

        assert.equal(
          result.intelligence,
          intelligence
        )

        assert.equal(
          result.structuralImpact,
          structuralImpact
        )

        assert.equal(
          result.spanOfControl,
          spanOfControl
        )

        assert.equal(
          result.positionCapacity,
          positionCapacity
        )

        assert.equal(
          result.executiveSummary,
          executiveSummary
        )

        assert.deepEqual(
          result.insights,
          insights
        )
      }
    )

    it(
      "produz um contrato e uma coleção de insights imutáveis",
      () => {
        const result =
          createScenarioAnalysis({
            intelligence:
              createIntelligence(),

            structuralImpact:
              createStructuralImpact(),

            spanOfControl:
              createSpanOfControl(),

            positionCapacity:
              createPositionCapacity(),

            insights:
              createInsights(),

            executiveSummary:
              createExecutiveSummary(),
          })

        assert.equal(
          Object.isFrozen(result),
          true
        )

        assert.equal(
          Object.isFrozen(
            result.insights
          ),
          true
        )
      }
    )

    it(
      "cria uma cópia defensiva da data de geração",
      () => {
        const generatedAt =
          new Date(
            "2026-07-27T15:00:00.000Z"
          )

        const result =
          createScenarioAnalysis({
            intelligence:
              createIntelligence(),

            structuralImpact:
              createStructuralImpact(),

            spanOfControl:
              createSpanOfControl(),

            positionCapacity:
              createPositionCapacity(),

            insights:
              createInsights(),

            executiveSummary:
              createExecutiveSummary(),

            generatedAt,
          })

        assert.notEqual(
          result.generatedAt,
          generatedAt
        )

        assert.equal(
          result.generatedAt.toISOString(),
          generatedAt.toISOString()
        )

        generatedAt.setFullYear(
          2030
        )

        assert.equal(
          result.generatedAt.toISOString(),
          "2026-07-27T15:00:00.000Z"
        )
      }
    )

    it(
      "usa a data da inteligência quando nenhuma data é informada",
      () => {
        const intelligence =
          createIntelligence({
            generatedAt:
              new Date(
                "2026-07-27T18:00:00.000Z"
              ),
          })

        const result =
          createScenarioAnalysis({
            intelligence,

            structuralImpact:
              createStructuralImpact(),

            spanOfControl:
              createSpanOfControl(),

            positionCapacity:
              createPositionCapacity(),

            insights:
              createInsights(),

            executiveSummary:
              createExecutiveSummary(),
          })

        assert.equal(
          result.generatedAt.toISOString(),
          "2026-07-27T18:00:00.000Z"
        )
      }
    )

    it(
      "rejeita identificador de projeção vazio",
      () => {
        assert.throws(
          () =>
            createScenarioAnalysis({
              intelligence:
                createIntelligence({
                  projectionId:
                    "   ",
                }),

              structuralImpact:
                createStructuralImpact(),

              spanOfControl:
                createSpanOfControl(),

              positionCapacity:
                createPositionCapacity(),

              insights:
                createInsights(),

              executiveSummary:
                createExecutiveSummary(),
            }),
          /projectionId é obrigatório/
        )
      }
    )

    it(
      "rejeita identificador de cenário vazio",
      () => {
        assert.throws(
          () =>
            createScenarioAnalysis({
              intelligence:
                createIntelligence({
                  scenarioId:
                    "",
                }),

              structuralImpact:
                createStructuralImpact(),

              spanOfControl:
                createSpanOfControl(),

              positionCapacity:
                createPositionCapacity(),

              insights:
                createInsights(),

              executiveSummary:
                createExecutiveSummary(),
            }),
          /scenarioId é obrigatório/
        )
      }
    )

    it(
      "rejeita versão de projeção inválida",
      () => {
        assert.throws(
          () =>
            createScenarioAnalysis({
              intelligence:
                createIntelligence({
                  projectionVersion:
                    0,
                }),

              structuralImpact:
                createStructuralImpact(),

              spanOfControl:
                createSpanOfControl(),

              positionCapacity:
                createPositionCapacity(),

              insights:
                createInsights(),

              executiveSummary:
                createExecutiveSummary(),
            }),
          /projectionVersion deve ser um inteiro positivo/
        )
      }
    )

    it(
      "rejeita data de geração inválida",
      () => {
        assert.throws(
          () =>
            createScenarioAnalysis({
              intelligence:
                createIntelligence(),

              structuralImpact:
                createStructuralImpact(),

              spanOfControl:
                createSpanOfControl(),

              positionCapacity:
                createPositionCapacity(),

              insights:
                createInsights(),

              executiveSummary:
                createExecutiveSummary(),

              generatedAt:
                new Date(
                  "invalid-date"
                ),
            }),
          /generatedAt deve ser uma data válida/
        )
      }
    )
  }
)
