"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  closeFeedbackThread,
} from "../services/close-feedback-thread"

type CloseFeedbackThreadActionState = {
  success: boolean
  message: string
}

export async function closeFeedbackThreadAction(
  threadId: string
): Promise<CloseFeedbackThreadActionState> {
  try {
    const {
      companyId,
    } = await getCurrentCompanyContext()

    const thread =
      await closeFeedbackThread({
        companyId,
        threadId,
      })

    try {
      await recordActivity({
        companyId,
        activityType: "feedback.closed",
        module: "feedback",
        title:
          "Conversa de feedback encerrada",
        description:
          `A conversa de feedback "${thread.title}" foi encerrada.`,
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
        "Erro ao registrar atividade de encerramento do feedback:",
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
        "Conversa de feedback encerrada com sucesso.",
    }
  } catch (error) {
    console.error(
      "Erro ao encerrar conversa de feedback:",
      error
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível encerrar a conversa de feedback.",
    }
  }
}
