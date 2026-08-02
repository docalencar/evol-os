import assert from "node:assert/strict"
import test from "node:test"

import {
  AssessmentAuthorizationError,
  requireAssessmentAdministrator,
  requireAssessmentEvaluator,
  type AssessmentActor,
} from "./assessment-authorization"
import type { AssessmentResponse } from "../types/assessment-response"

const companyId = "11111111-1111-4111-8111-111111111111"
const evaluatorId = "22222222-2222-4222-8222-222222222222"

function actor(
  role: AssessmentActor["role"],
  personId: string | null = evaluatorId
): AssessmentActor {
  return {
    userId: "33333333-3333-4333-8333-333333333333",
    companyId,
    role,
    personId,
  }
}

function response(
  status: AssessmentResponse["status"] = "in_progress"
): AssessmentResponse {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    company_id: companyId,
    assessment_cycle_id: "55555555-5555-4555-8555-555555555555",
    assessment_template_id: "66666666-6666-4666-8666-666666666666",
    employee_id: "77777777-7777-4777-8777-777777777777",
    evaluator_id: evaluatorId,
    status,
    started_at: null,
    completed_at: null,
    submitted_at: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
  }
}

test("somente owner, admin e hr administram avaliações", () => {
  for (const role of ["owner", "admin", "hr"] as const) {
    assert.doesNotThrow(() =>
      requireAssessmentAdministrator(actor(role), companyId)
    )
  }

  for (const role of ["manager", "employee"] as const) {
    assert.throws(
      () => requireAssessmentAdministrator(actor(role), companyId),
      AssessmentAuthorizationError
    )
  }
})

test("evaluator lê e altera somente a própria resposta aberta", () => {
  assert.doesNotThrow(() =>
    requireAssessmentEvaluator(actor("manager"), response(), "read")
  )
  assert.doesNotThrow(() =>
    requireAssessmentEvaluator(actor("manager"), response(), "write")
  )
  assert.throws(
    () =>
      requireAssessmentEvaluator(
        actor("manager", "88888888-8888-4888-8888-888888888888"),
        response(),
        "read"
      ),
    AssessmentAuthorizationError
  )
})

test("resposta enviada permanece legível e não pode ser alterada", () => {
  assert.doesNotThrow(() =>
    requireAssessmentEvaluator(actor("employee"), response("submitted"), "read")
  )
  assert.throws(
    () =>
      requireAssessmentEvaluator(
        actor("employee"),
        response("submitted"),
        "write"
      ),
    AssessmentAuthorizationError
  )
})
