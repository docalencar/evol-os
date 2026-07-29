import assert from "node:assert/strict"
import test from "node:test"

import type { AssessmentAnswer } from "../types/assessment-answer"
import type { AssessmentResponse } from "../types/assessment-response"
import { summarizeEmployeeAssessments } from "./get-employee-assessment-summary"

function response(
  id: string,
  status: AssessmentResponse["status"],
  completedAt: string | null = null
): AssessmentResponse {
  return {
    id,
    company_id: "company-1",
    assessment_cycle_id: "cycle-1",
    assessment_template_id: "template-1",
    employee_id: "employee-1",
    evaluator_id: "manager-1",
    status,
    started_at: null,
    submitted_at: null,
    completed_at: completedAt,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  }
}

function answer(id: string, score: number | null): AssessmentAnswer {
  return {
    id,
    company_id: "company-1",
    assessment_response_id: "response-1",
    assessment_question_id: `question-${id}`,
    answer_text: null,
    answer_number: null,
    answer_boolean: null,
    score,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  }
}

test("summarizeEmployeeAssessments returns an empty summary", () => {
  assert.deepEqual(summarizeEmployeeAssessments([], []), {
    completedAssessments: 0,
    pendingAssessments: 0,
    averageScore: null,
    latestAssessmentAt: null,
  })
})

test("summarizeEmployeeAssessments summarizes completed and pending assessments", () => {
  const summary = summarizeEmployeeAssessments(
    [
      response("response-1", "completed", "2026-06-01T00:00:00.000Z"),
      response("response-2", "completed", "2026-07-01T00:00:00.000Z"),
      response("response-3", "in_progress"),
    ],
    [answer("1", 4), answer("2", 2), answer("3", null)]
  )

  assert.deepEqual(summary, {
    completedAssessments: 2,
    pendingAssessments: 1,
    averageScore: 3,
    latestAssessmentAt: "2026-07-01T00:00:00.000Z",
  })
})
