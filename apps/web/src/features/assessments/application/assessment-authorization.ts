import type { CorporateRole } from "@/features/authorization"

import type { AssessmentResponse } from "../types/assessment-response"

export type AssessmentActor = Readonly<{
  userId: string
  companyId: string
  role: CorporateRole
  personId: string | null
}>

export class AssessmentAuthorizationError extends Error {
  constructor() {
    super("ASSESSMENT_ACCESS_DENIED")
    this.name = "AssessmentAuthorizationError"
  }
}

export function requireAssessmentAdministrator(
  actor: AssessmentActor,
  companyId: string
): void {
  if (
    actor.companyId !== companyId ||
    !["owner", "admin", "hr"].includes(actor.role)
  ) {
    throw new AssessmentAuthorizationError()
  }
}

export function requireAssessmentEvaluator(
  actor: AssessmentActor,
  response: AssessmentResponse,
  operation: "read" | "write"
): void {
  const isEvaluator =
    actor.companyId === response.company_id &&
    actor.personId === response.evaluator_id

  const isOpen =
    response.status === "draft" ||
    response.status === "in_progress"

  if (!isEvaluator || (operation === "write" && !isOpen)) {
    throw new AssessmentAuthorizationError()
  }
}
