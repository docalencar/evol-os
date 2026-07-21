"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  acknowledgeFeedbackThread,
} from "../services/acknowledge-feedback-thread"

type AcknowledgeFeedbackThreadActionState = {
  success: boolean
  message: string
}

export async function acknowledgeFeedbackThreadAction(
  threadId: string
): Promise<AcknowledgeFeedbackThreadActionState> {
  try {
    const {
      companyId,
      personId,
    } = await getCurrentCompanyContext()

    if (!personId) {
      return {
        success: false,
        message:
          "Não foi possível identificar a pessoa vinculada ao usuário.",
      }
    }

    const result =
      await acknowledgeFeedbackThread({
        companyId,
        threadId,
        employeeId: personId,
      })

    try {
      await recordActivity({
        companyId,
        activityType:
          "feedback.acknowledged",
        module: "feedback",
        title: "Feedback confirmado",
        description:
          `O recebimento do feedback "${result.thread.title}" foi confirmado.`,
        actorType: "user",
        entityType: "feedback_thread",
        entityId: result.thread.id,
        subjectType: "employee",
        subjectId: personId,
        visibility: "company",
        metadata: {
          threadId: result.thread.id,
          acknowledgementId:
            result.acknowledgement.id,
          acknowledgedByEmployeeId:
            personId,
          senderEmployeeId:
            result.thread.senderEmployeeId,
          receiverEmployeeId:
            result.thread.receiverEmployeeId,
          feedbackType:
            result.thread.type,
          status:
            result.thread.status,
          priority:
            result.thread.priority,
          feedbackVisibility:
            result.thread.visibility,
          acknowledgedAt:
            result.acknowledgement
              .acknowledgedAt
              .toISOString(),
        },
      })
    } catch (activityError) {
      console.error(
        "Erro ao registrar atividade de confirmação do feedback:",
        activityError
      )
    }

    revalidatePath("/app/feedbacks")
    revalidatePath(
      `/app/feedbacks/${result.thread.id}`
    )

    return {
      success: true,
      message:
        "Recebimento do feedback confirmado com sucesso.",
    }
  } catch (error) {
    console.error(
      "Erro ao confirmar feedback:",
      error
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar o feedback.",
    }
  }
}
