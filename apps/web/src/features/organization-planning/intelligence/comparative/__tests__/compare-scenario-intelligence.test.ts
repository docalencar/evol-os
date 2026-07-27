import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  compareScenarioIntelligence,
} from "../compare-scenario-intelligence"

import type {
  ScenarioIntelligence,
} from "../../types"


function createScenario(
  input: Partial<ScenarioIntelligence> = {}
): ScenarioIntelligence {

  return {
    projectionId: "projection-1",
    scenarioId: "scenario-1",
    projectionVersion: 1,
    generatedAt: new Date(),

    workforce: {
      headcount: {
        current: 100,
        projected: 120,
        absolute: 20,
        percentage: 20,
        direction: "increase",
      },
    },

    vacancies: {
      vacancies: {
        current: 5,
        projected: 8,
        absolute: 3,
        percentage: 60,
        direction: "increase",
      },
    },

    financial: {
      salaryMass: {
        current: 50000,
        projected: 80000,
        absolute: 30000,
        percentage: 60,
        direction: "increase",
      },
    },

    organization: {
      departments: {
        current: 5,
        projected: 6,
        absolute: 1,
        percentage: 20,
        direction: "increase",
      },

      positions: {
        current: 20,
        projected: 25,
        absolute: 5,
        percentage: 25,
        direction: "increase",
      },
    },

    ...input,
  }
}


describe(
  "compareScenarioIntelligence",
  () => {

    it(
      "recomenda o cenário com menor custo",
      () => {
        const first =
          createScenario({
            scenarioId: "scenario-a",
            financial: {
              salaryMass: {
                current: 50000,
                projected: 70000,
                absolute: 20000,
                percentage: 40,
                direction: "increase",
              },
            },
          })


        const second =
          createScenario({
            scenarioId: "scenario-b",
            financial: {
              salaryMass: {
                current: 50000,
                projected: 90000,
                absolute: 40000,
                percentage: 80,
                direction: "increase",
              },
            },
          })


        const result =
          compareScenarioIntelligence(
            first,
            second
          )


        assert.equal(
          result.recommendation,
          "first"
        )
      }
    )


    it(
      "recomenda o segundo cenário quando ele possui menor custo",
      () => {
        const result =
          compareScenarioIntelligence(
            createScenario({
              scenarioId: "scenario-a",
            }),
            createScenario({
              scenarioId: "scenario-b",
              financial: {
                salaryMass: {
                  current: 50000,
                  projected: 40000,
                  absolute: -10000,
                  percentage: -20,
                  direction: "decrease",
                },
              },
            })
          )


        assert.equal(
          result.recommendation,
          "second"
        )
      }
    )


    it(
      "retorna neutro quando os custos são iguais",
      () => {
        const result =
          compareScenarioIntelligence(
            createScenario(),
            createScenario()
          )


        assert.equal(
          result.recommendation,
          "neutral"
        )
      }
    )
  }
)
