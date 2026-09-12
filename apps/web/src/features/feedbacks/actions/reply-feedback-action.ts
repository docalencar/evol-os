"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createTrustedFeedbackMutationRepository } from "../repositories/trusted-feedback-mutation-repository"
import { feedbackMutationErrorMessage } from "./feedback-mutation-error-message"

const replyFeedbackSchema = z.object({
  threadId: z.string().uuid(),
  content: z.string().trim().min(1).max(10000),
})

type ReplyFeedbackActionState = {
  success: boolean
  message: string
  messageId?: string
}

export async function replyFeedbackAction(
  input: z.input<typeof replyFeedbackSchema>
): Promise<ReplyFeedbackActionState> {
  const parsedInput = replyFeedbackSchema.safeParse(input)

  if (!parsedInput.success) {
    return { success: false, message: "Dados inválidos para enviar a resposta." }
  }

  try {
    const repository = createTrustedFeedbackMutationRepository()
    const result = await repository.reply(
      parsedInput.data.threadId,
      parsedInput.data.content
    )
    revalidatePath("/app/feedbacks")
    revalidatePath(`/app/feedbacks/${result.feedbackThreadId}`)

    return {
      success: true,
      message: "Resposta enviada com sucesso.",
      messageId: result.feedbackMessageId,
    }
  } catch (error) {
    console.error("Erro ao responder conversa de feedback:", error)
    return {
      success: false,
      message: feedbackMutationErrorMessage(error, "Não foi possível enviar a resposta."),
    }
  }
}
