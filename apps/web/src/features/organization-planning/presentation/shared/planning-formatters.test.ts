import assert from "node:assert/strict"
import test from "node:test"

import {
  formatHeadcount,
  formatHeadcountDelta,
  formatPercentage,
  pluralize,
} from "./planning-formatters"

test("formats pluralization and headcount deltas", () => {
  assert.equal(pluralize(1, "vaga", "vagas"), "vaga")
  assert.equal(pluralize(-1, "vaga", "vagas"), "vaga")
  assert.equal(pluralize(0, "vaga", "vagas"), "vagas")
  assert.equal(formatHeadcount(1), "1 colaborador")
  assert.equal(formatHeadcountDelta(3), "+3 colaboradores")
  assert.equal(formatHeadcountDelta(-1), "-1 colaborador")
  assert.equal(formatHeadcountDelta(0), "0 colaboradores")
})

test("formats percentages deterministically in pt-BR", () => {
  assert.equal(formatPercentage(12.5), "12,5%")
  assert.equal(formatPercentage(0), "0%")
})
