"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createTrustedFeedbackMutationRepository } from "../repositories/trusted-feedback-mutation-repository"
import { feedbackMutationErrorMessage } from "./feedback-mutation-error-message"

/**
 * Only the origin selector and the mandatory first message. Company, sender,
 * receiver, type, visibility, status and title are derived by the boundary and
 * cannot be supplied here — there is no field for them by construction.
 *
 * This Action has no navigable caller yet. E5-P1 adds the authorship surface.
 */
const createAssessmentFeedbackSchema = z.object({
  assessmentResponseId: z.string().uuid(),
  initialMessage: z.string().trim().min(1).max(10000),
})

type CreateFeedbackConversationActionState = {
  success: boolean
  message: string
  threadId?: string
}

export async function createFeedbackConversationAction(
  input: z.input<typeof createAssessmentFeedbackSchema>
): Promise<CreateFeedbackConversationActionState> {
  const parsedInput = createAssessmentFeedbackSchema.safeParse(input)

  if (!parsedInput.success) {
    return { success: false, message: "Dados inválidos para criar o feedback." }
  }

  try {
    const repository = createTrustedFeedbackMutationRepository()
    const result = await repository.create(
      parsedInput.data.assessmentResponseId,
      parsedInput.data.initialMessage
    )
    revalidatePath("/app/feedbacks")
    revalidatePath(`/app/feedbacks/${result.feedbackThreadId}`)

    return {
      success: true,
      message:
        result.status === "already_exists"
          ? "O feedback desta avaliação já foi criado."
          : "Conversa de feedback criada com sucesso.",
      threadId: result.feedbackThreadId,
    }
  } catch (error) {
    console.error("Erro ao criar conversa de feedback:", error)
    return {
      success: false,
      message: feedbackMutationErrorMessage(
        error,
        "Não foi possível criar a conversa de feedback."
      ),
    }
  }
}
