import assert from "node:assert/strict"
import test from "node:test"

import {
  calculateCostImpact,
} from "../calculate-cost-impact"


const assumptions = {
  averageEmployeeMonthlyCost: 8000,
  averageHiringCost: 5000,
  averageTerminationCost: 15000,
}


test(
  "calcula cenário saudável quando não existe aumento de custo",
  () => {
    const result =
      calculateCostImpact({
        workforce: {
          currentHeadcount: 100,
          projectedHeadcount: 100,
        },
        assumptions,
      })

    assert.equal(
      result.currentMonthlyCost,
      800000
    )

    assert.equal(
      result.projectedMonthlyCost,
      800000
    )

    assert.equal(
      result.monthlyVariation,
      0
    )

    assert.equal(
      result.status,
      "healthy"
    )
  }
)


test(
  "classifica atenção quando existe pequeno crescimento de custo",
  () => {
    const result =
      calculateCostImpact({
        workforce: {
          currentHeadcount: 100,
          projectedHeadcount: 102,
        },
        assumptions,
      })

    assert.equal(
      result.employeesAdded,
      2
    )

    assert.equal(
      result.monthlyVariation,
      16000
    )

    assert.equal(
      result.hiringImpact,
      10000
    )

    assert.equal(
      result.status,
      "attention"
    )
  }
)


test(
  "classifica crítico quando crescimento gera grande impacto financeiro",
  () => {
    const result =
      calculateCostImpact({
        workforce: {
          currentHeadcount: 100,
          projectedHeadcount: 120,
        },
        assumptions,
      })

    assert.equal(
      result.employeesAdded,
      20
    )

    assert.equal(
      result.monthlyVariation,
      160000
    )

    assert.equal(
      result.status,
      "critical"
    )
  }
)


test(
  "calcula impacto de redução de quadro",
  () => {
    const result =
      calculateCostImpact({
        workforce: {
          currentHeadcount: 100,
          projectedHeadcount: 95,
        },
        assumptions,
      })

    assert.equal(
      result.employeesRemoved,
      5
    )

    assert.equal(
      result.terminationImpact,
      75000
    )

    assert.equal(
      result.status,
      "healthy"
    )
  }
)
