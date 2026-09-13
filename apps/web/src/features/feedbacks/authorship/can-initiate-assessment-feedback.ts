import type { AssessmentResponseStatus } from "@/features/assessments/types/assessment-response"

/**
 * May this viewer be OFFERED authorship of the formal feedback for a response?
 *
 * This is a question about affordances, not about permission. The permission
 * question is answered by `create_assessment_feedback_v1`, which re-derives the
 * company, the sender, the receiver and the response's eligibility from the
 * caller's own identity and refuses anything it does not like — whether or not
 * this function returned true. Nothing here is load-bearing for security.
 *
 * It is therefore deliberately NARROWER than the boundary. It checks only what
 * the page can already prove from the read model it already has:
 *
 *   - the response reached a finalized state;
 *   - the viewer is its evaluator;
 *   - the evaluator is not also the evaluatee, so a self-assessment never
 *     offers a button that the boundary would reject.
 *
 * What it deliberately does NOT check is the response's `perspective`, which
 * the boundary requires to be 'manager'. No read model in the application
 * exposes that column — the evaluator workspace RPC does not return it and its
 * row schema is `.strict()` — and inventing a read path for it would mean a new
 * migration for a rule the database already enforces. A peer-perspective
 * response can therefore still show the call to action and be refused on
 * submit, which surfaces as a plain error and never as a false success.
 */
export function canInitiateAssessmentFeedback(input: {
  personId: string | null
  evaluatorId: string
  employeeId: string
  status: AssessmentResponseStatus
}): boolean {
  const isFinalized =
    input.status === "submitted" || input.status === "completed"

  return (
    isFinalized &&
    input.personId !== null &&
    input.personId === input.evaluatorId &&
    input.evaluatorId !== input.employeeId
  )
}
