import assert from "node:assert/strict"
import test from "node:test"

import { canInitiateAssessmentFeedback } from "./can-initiate-assessment-feedback"

const EVALUATOR = "11111111-1111-4111-8111-111111111111"
const EVALUATEE = "22222222-2222-4222-8222-222222222222"
const BYSTANDER = "33333333-3333-4333-8333-333333333333"

const eligible = {
  personId: EVALUATOR,
  evaluatorId: EVALUATOR,
  employeeId: EVALUATEE,
  status: "submitted",
} as const

test("the evaluator of a finalized response may be offered authorship", () => {
  assert.equal(canInitiateAssessmentFeedback(eligible), true)
  assert.equal(
    canInitiateAssessmentFeedback({ ...eligible, status: "completed" }),
    true
  )
})

test("only the evaluator is offered authorship", () => {
  // The evaluatee reading their own result, and anyone else who can reach the
  // page, get no create affordance.
  assert.equal(
    canInitiateAssessmentFeedback({ ...eligible, personId: EVALUATEE }),
    false
  )
  assert.equal(
    canInitiateAssessmentFeedback({ ...eligible, personId: BYSTANDER }),
    false
  )
  // No person bound to the session is not "maybe the evaluator".
  assert.equal(
    canInitiateAssessmentFeedback({ ...eligible, personId: null }),
    false
  )
})

test("a self-assessment is never offered authorship", () => {
  // perspective='self': the boundary would refuse it, so the button never
  // appears. This is the one perspective the page can rule out from the read
  // model it already has.
  assert.equal(
    canInitiateAssessmentFeedback({
      ...eligible,
      personId: EVALUATOR,
      employeeId: EVALUATOR,
    }),
    false
  )
})

test("an unfinished response is never offered authorship", () => {
  for (const status of ["draft", "in_progress", "cancelled"] as const) {
    assert.equal(
      canInitiateAssessmentFeedback({ ...eligible, status }),
      false,
      `status ${status} must not offer authorship`
    )
  }
})

test("the affordance rule is narrower than the boundary, never wider", () => {
  // Every input that this function accepts is one the boundary also accepts on
  // these three axes. The proof that matters is the converse direction: there
  // is no input where this returns true and the response is unfinished, or the
  // caller is not the evaluator, or sender and receiver would be the same
  // person — the three things the database would reject with an error the user
  // would have to read.
  const cases = [
    { ...eligible },
    { ...eligible, status: "completed" as const },
    { ...eligible, personId: BYSTANDER },
    { ...eligible, status: "draft" as const },
    { ...eligible, employeeId: EVALUATOR },
    { ...eligible, personId: null },
  ]

  for (const input of cases) {
    if (!canInitiateAssessmentFeedback(input)) continue
    assert.ok(
      input.status === "submitted" || input.status === "completed",
      "offered on an unfinished response"
    )
    assert.equal(input.personId, input.evaluatorId, "offered to a non-evaluator")
    assert.notEqual(
      input.evaluatorId,
      input.employeeId,
      "offered on a self-assessment"
    )
  }
})
