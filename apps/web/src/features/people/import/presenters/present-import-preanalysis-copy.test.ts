import assert from "node:assert/strict"
import test from "node:test"

import {
  presentImportComparisonSentence,
} from "./present-import-preanalysis-copy"

test("A. singular agreement", () => {
  assert.equal(
    presentImportComparisonSentence(1),
    "1 colaborador será comparado com a organização atual."
  )
})

test("B. plural agreement", () => {
  assert.equal(
    presentImportComparisonSentence(5),
    "5 colaboradores serão comparados com a organização atual."
  )
})

test("C. never produces the broken 'seráão' (or other suffix-append artifacts)", () => {
  for (const n of [0, 1, 2, 3, 5, 10, 42]) {
    const sentence = presentImportComparisonSentence(n)
    assert.doesNotMatch(sentence, /seráão|colaboradores? seráão|serãoo/i)
    assert.doesNotMatch(sentence, /colaboradorão|comparadoos/i)
  }
})

test("D. plural verb/participle agreement is correct by construction", () => {
  const plural = presentImportComparisonSentence(5)
  assert.match(plural, /colaboradores serão comparados/)
  const singular = presentImportComparisonSentence(1)
  assert.match(singular, /colaborador será comparado/)
  // No mixed-agreement artifacts.
  assert.doesNotMatch(plural, /colaborador será/)
  assert.doesNotMatch(singular, /colaboradores serão/)
})
