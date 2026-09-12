"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createTrustedFeedbackMutationRepository } from "../repositories/trusted-feedback-mutation-repository"
import { feedbackMutationErrorMessage } from "./feedback-mutation-error-message"

export async function closeFeedbackThreadAction(threadId: string) {
  if (!z.string().uuid().safeParse(threadId).success) {
    return { success: false, message: "Conversa de feedback inválida." }
  }

  try {
    const result = await createTrustedFeedbackMutationRepository().close(threadId)
    revalidatePath("/app/feedbacks")
    revalidatePath(`/app/feedbacks/${result.feedbackThreadId}`)

    return {
      success: true,
      message:
        result.status === "already_closed"
          ? "Esta conversa de feedback já estava encerrada."
          : "Conversa de feedback encerrada com sucesso.",
    }
  } catch (error) {
    console.error("Erro ao encerrar conversa de feedback:", error)
    return {
      success: false,
      message: feedbackMutationErrorMessage(
        error,
        "Não foi possível encerrar a conversa de feedback."
      ),
    }
  }
}
