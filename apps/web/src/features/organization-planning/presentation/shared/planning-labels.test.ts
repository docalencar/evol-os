import assert from "node:assert/strict"
import test from "node:test"

import {
  getPlanningCategoryLabel,
  getPlanningFieldLabel,
  getPlanningInsightTitle,
  planningChangeLabels,
} from "./planning-labels"

test("centralizes stable planning labels and preserves unknown identifiers", () => {
  assert.equal(planningChangeLabels.transferred, "Transferido")
  assert.equal(getPlanningCategoryLabel("workforce"), "Pessoas")
  assert.equal(getPlanningFieldLabel("departmentId"), "Departamento")
  assert.equal(getPlanningInsightTitle("high_terminations"), "Volume elevado de desligamentos")
  assert.equal(getPlanningFieldLabel("futureField"), "futureField")
  assert.equal(getPlanningInsightTitle("future_insight"), "future_insight")
})
