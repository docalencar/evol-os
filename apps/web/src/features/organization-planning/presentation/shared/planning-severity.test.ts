import assert from "node:assert/strict"
import test from "node:test"

import { presentPlanningSeverity } from "./planning-severity"

test("maps every severity to stable presentation metadata", () => {
  assert.deepEqual(presentPlanningSeverity("critical"), {
    value: "critical",
    label: "Crítico",
    riskLabel: "Risco Crítico",
    color: "red",
    icon: "alert-triangle",
  })
  assert.equal(presentPlanningSeverity("high").riskLabel, "Risco Alto")
  assert.equal(presentPlanningSeverity("medium").color, "amber")
  assert.equal(presentPlanningSeverity("low").icon, "circle")
  assert.equal(Object.isFrozen(presentPlanningSeverity("critical")), true)
})
