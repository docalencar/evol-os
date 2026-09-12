"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createTrustedFeedbackMutationRepository } from "../repositories/trusted-feedback-mutation-repository"
import { feedbackMutationErrorMessage } from "./feedback-mutation-error-message"

export async function archiveFeedbackThreadAction(threadId: string) {
  if (!z.string().uuid().safeParse(threadId).success) {
    return { success: false, message: "Conversa de feedback inválida." }
  }

  try {
    const result = await createTrustedFeedbackMutationRepository().archive(threadId)
    revalidatePath("/app/feedbacks")
    revalidatePath(`/app/feedbacks/${result.feedbackThreadId}`)

    return {
      success: true,
      message:
        result.status === "already_archived"
          ? "Esta conversa de feedback já estava arquivada."
          : "Conversa de feedback arquivada com sucesso.",
    }
  } catch (error) {
    console.error("Erro ao arquivar conversa de feedback:", error)
    return {
      success: false,
      message: feedbackMutationErrorMessage(
        error,
        "Não foi possível arquivar a conversa de feedback."
      ),
    }
  }
}
