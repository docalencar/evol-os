import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  createExecutiveDecision,
} from "../create-executive-decision"


function createComparison() {
  return {
    departmentsCreated: 1,
    departmentsUpdated: 0,
    departmentsArchived: 0,

    teamsCreated: 0,
    teamsUpdated: 0,
    teamsArchived: 0,

    positionsCreated: 2,
    positionsUpdated: 0,
    positionsMoved: 0,
    positionsArchived: 0,

    employeesCreated: 5,
    employeesUpdated: 0,
    employeesMoved: 0,
    employeesTerminated: 0,
    employeesArchived: 0,
  }
}


function createStructuralImpact() {
  return {
    departments: {
      current: 5,
      projected: 6,
      variation: 1,
    },

    teams: {
      current: 10,
      projected: 10,
      variation: 0,
    },

    positions: {
      current: 20,
      projected: 22,
      variation: 2,
    },

    employees: {
      current: 100,
      projected: 105,
      variation: 5,
    },
  }
}


function createSpanOfControl() {
  return {
    managers: [],
    totalManagers: 5,
    attentionCount: 0,
    criticalCount: 0,
  }
}


function createPositionCapacity() {
  return {
    positions: [],
    attentionCount: 0,
    criticalCount: 0,
  }
}


describe(
  "createExecutiveDecision",
  () => {

    it(
      "aprova cenário saudável",
      () => {
        const result =
          createExecutiveDecision({
            comparison:
              createComparison(),

            structuralImpact:
              createStructuralImpact(),

            insights: [],

            spanOfControl:
              createSpanOfControl(),

            positionCapacity:
              createPositionCapacity(),
          })


        assert.equal(
          result.summary.status,
          "healthy"
        )

        assert.equal(
          result.summary.recommendation,
          "approve"
        )
      }
    )


    it(
      "solicita revisão quando existem pontos de atenção",
      () => {
        const result =
          createExecutiveDecision({
            comparison:
              createComparison(),

            structuralImpact:
              createStructuralImpact(),

            insights: [
              {
                type: "capacity",
                severity: "warning",
                title: "Capacidade",
                description:
                  "Necessita avaliação.",
              },
            ],

            spanOfControl:
              createSpanOfControl(),

            positionCapacity:
              createPositionCapacity(),
          })


        assert.equal(
          result.summary.status,
          "attention"
        )

        assert.equal(
          result.summary.recommendation,
          "review"
        )
      }
    )


    it(
      "rejeita cenário com risco crítico",
      () => {
        const result =
          createExecutiveDecision({
            comparison:
              createComparison(),

            structuralImpact:
              createStructuralImpact(),

            insights: [
              {
                type: "risk",
                severity: "critical",
                title: "Risco crítico",
                description:
                  "Impacto elevado.",
              },
            ],

            spanOfControl:
              createSpanOfControl(),

            positionCapacity:
              createPositionCapacity(),
          })


        assert.equal(
          result.summary.status,
          "critical"
        )

        assert.equal(
          result.summary.recommendation,
          "reject"
        )
      }
    )
  }
)
