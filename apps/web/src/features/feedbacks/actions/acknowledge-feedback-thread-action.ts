"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createTrustedFeedbackMutationRepository } from "../repositories/trusted-feedback-mutation-repository"
import { feedbackMutationErrorMessage } from "./feedback-mutation-error-message"

export async function acknowledgeFeedbackThreadAction(threadId: string) {
  if (!z.string().uuid().safeParse(threadId).success) {
    return { success: false, message: "Conversa de feedback inválida." }
  }

  try {
    const result = await createTrustedFeedbackMutationRepository().acknowledge(threadId)
    revalidatePath("/app/feedbacks")
    revalidatePath(`/app/feedbacks/${result.feedbackThreadId}`)

    return {
      success: true,
      message:
        result.status === "already_acknowledged"
          ? "O recebimento deste feedback já estava confirmado."
          : "Recebimento do feedback confirmado com sucesso.",
    }
  } catch (error) {
    console.error("Erro ao confirmar feedback:", error)
    return {
      success: false,
      message: feedbackMutationErrorMessage(error, "Não foi possível confirmar o feedback."),
    }
  }
}
