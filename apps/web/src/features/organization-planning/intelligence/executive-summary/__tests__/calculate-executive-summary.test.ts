import assert from "node:assert/strict"
import test from "node:test"

import {
  calculateExecutiveScenarioSummary,
} from "../calculate-executive-summary"


const structuralImpact = {
  departments: {
    current: 5,
    projected: 5,
    variation: 0,
  },
  teams: {
    current: 10,
    projected: 10,
    variation: 0,
  },
  positions: {
    current: 20,
    projected: 20,
    variation: 0,
  },
  employees: {
    current: 100,
    projected: 100,
    variation: 0,
  },
}


const comparison = {
  departmentsCreated: 0,
  departmentsUpdated: 0,
  departmentsArchived: 0,

  teamsCreated: 0,
  teamsUpdated: 0,
  teamsArchived: 0,

  positionsCreated: 0,
  positionsUpdated: 0,
  positionsMoved: 0,
  positionsArchived: 0,

  employeesCreated: 0,
  employeesUpdated: 0,
  employeesMoved: 0,
  employeesTerminated: 0,
  employeesArchived: 0,
}


function healthyInput() {
  return {
    comparison,
    structuralImpact,
    insights: [],
    spanOfControl: {
      managers: [],
      totalManagers: 0,
      attentionCount: 0,
      criticalCount: 0,
    },
    positionCapacity: {
      positions: [],
      totalPositions: 0,
      attentionCount: 0,
      criticalCount: 0,
    },
  }
}


test(
  "gera resumo executivo saudável quando não existem riscos",
  () => {
    const result =
      calculateExecutiveScenarioSummary(
        healthyInput()
      )

    assert.equal(
      result.status,
      "healthy"
    )

    assert.equal(
      result.recommendation,
      "approve"
    )

    assert.equal(
      result.criticalRisks,
      0
    )
  }
)


test(
  "classifica cenário como atenção quando existe risco de liderança",
  () => {
    const result =
      calculateExecutiveScenarioSummary({
        ...healthyInput(),
        spanOfControl: {
          managers: [],
          totalManagers: 1,
          attentionCount: 1,
          criticalCount: 0,
        },
      })

    assert.equal(
      result.status,
      "attention"
    )

    assert.equal(
      result.recommendation,
      "review"
    )

    assert.equal(
      result.leadershipWarnings,
      1
    )
  }
)


test(
  "classifica cenário como crítico quando existe insight crítico",
  () => {
    const result =
      calculateExecutiveScenarioSummary({
        ...healthyInput(),
        insights: [
          {
            type: "critical-risk",
            severity: "critical",
            title: "Risco estrutural",
            description:
              "Alteração crítica identificada.",
          },
        ],
      })

    assert.equal(
      result.status,
      "critical"
    )

    assert.equal(
      result.recommendation,
      "reject"
    )

    assert.equal(
      result.criticalRisks,
      1
    )
  }
)
