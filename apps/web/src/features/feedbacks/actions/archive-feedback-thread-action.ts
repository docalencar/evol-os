"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  archiveFeedbackThread,
} from "../services/archive-feedback-thread"

type ArchiveFeedbackThreadActionState = {
  success: boolean
  message: string
}

export async function archiveFeedbackThreadAction(
  threadId: string
): Promise<ArchiveFeedbackThreadActionState> {
  try {
    const {
      companyId,
    } = await getCurrentCompanyContext()

    const thread =
      await archiveFeedbackThread({
        companyId,
        threadId,
      })

    try {
      await recordActivity({
        companyId,
        activityType:
          "feedback.archived",
        module: "feedback",
        title:
          "Conversa de feedback arquivada",
        description:
          `A conversa de feedback "${thread.title}" foi arquivada.`,
        actorType: "user",
        entityType: "feedback_thread",
        entityId: thread.id,
        subjectType: "employee",
        subjectId:
          thread.receiverEmployeeId,
        visibility: "company",
        metadata: {
          threadId: thread.id,
          senderEmployeeId:
            thread.senderEmployeeId,
          receiverEmployeeId:
            thread.receiverEmployeeId,
          feedbackType: thread.type,
          status: thread.status,
          priority: thread.priority,
          feedbackVisibility:
            thread.visibility,
          closedAt:
            thread.closedAt?.toISOString() ??
            null,
        },
      })
    } catch (activityError) {
      console.error(
        "Erro ao registrar atividade de arquivamento do feedback:",
        activityError
      )
    }

    revalidatePath("/app/feedbacks")
    revalidatePath(
      `/app/feedbacks/${thread.id}`
    )

    return {
      success: true,
      message:
        "Conversa de feedback arquivada com sucesso.",
    }
  } catch (error) {
    console.error(
      "Erro ao arquivar conversa de feedback:",
      error
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível arquivar a conversa de feedback.",
    }
  }
}
