import "server-only"

import { z } from "zod"

import { createFeedbackThreadRepository } from "../repositories/feedback-thread-repository"
import type { AssessmentResponseFeedbackLink } from "../types/assessment-response-feedback-link"

/**
 * Does this assessment response already have its formal Feedback thread?
 *
 * Absence is not an error. A finalized response with no feedback yet is the
 * ordinary case this whole slice exists to serve.
 */
const getAssessmentResponseFeedbackLinkSchema = z.object({
  companyId: z.string().uuid(),
  assessmentResponseId: z.string().uuid(),
})

export type GetAssessmentResponseFeedbackLinkInput = z.input<
  typeof getAssessmentResponseFeedbackLinkSchema
>

/**
 * Never throws. The callers are server components rendering a page whose main
 * content is the assessment result; a feedback lookup that fails is a reason to
 * withhold an affordance, not a reason to lose the page.
 */
export async function getAssessmentResponseFeedbackLink(
  input: GetAssessmentResponseFeedbackLinkInput
): Promise<AssessmentResponseFeedbackLink> {
  const parsedInput =
    getAssessmentResponseFeedbackLinkSchema.safeParse(input)

  if (!parsedInput.success) {
    return { status: "unavailable" }
  }

  try {
    const repository = await createFeedbackThreadRepository()
    const { data, error } = await repository.findByAssessmentResponse(
      parsedInput.data.companyId,
      parsedInput.data.assessmentResponseId
    )

    if (error) {
      console.error(
        "Erro ao verificar feedback formal da avaliação:",
        error
      )
      return { status: "unavailable" }
    }

    return data
      ? { status: "existing_formal_feedback", threadId: data.id }
      : { status: "no_formal_feedback" }
  } catch (error) {
    console.error("Erro ao verificar feedback formal da avaliação:", error)
    return { status: "unavailable" }
  }
}
