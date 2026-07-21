"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  openFeedbackConversation,
} from "../services/open-feedback-conversation"
import type {
  OpenFeedbackConversationInput,
} from "../services/open-feedback-conversation"

type CreateFeedbackConversationActionInput =
  Omit<
    OpenFeedbackConversationInput,
    | "companyId"
    | "senderEmployeeId"
    | "createdByUserId"
    | "initialMessage"
  > & {
    initialMessage: Omit<
      OpenFeedbackConversationInput["initialMessage"],
      "authorEmployeeId"
    >
  }

type CreateFeedbackConversationActionState = {
  success: boolean
  message: string
  threadId?: string
}

export async function createFeedbackConversationAction(
  input: CreateFeedbackConversationActionInput
): Promise<CreateFeedbackConversationActionState> {
  try {
    const {
      companyId,
      personId,
      user,
    } = await getCurrentCompanyContext()

    if (!personId) {
      return {
        success: false,
        message:
          "Não foi possível identificar a pessoa vinculada ao usuário.",
      }
    }

    const result =
      await openFeedbackConversation({
        ...input,
        companyId,
        senderEmployeeId: personId,
        createdByUserId: user.id,
        initialMessage: {
          ...input.initialMessage,
          authorEmployeeId: personId,
        },
      })

    try {
      await recordActivity({
        companyId,
        activityType: "feedback.created",
        module: "feedback",
        title: "Conversa de feedback criada",
        description:
          `A conversa de feedback "${result.thread.title}" foi criada.`,
        actorType: "user",
        entityType: "feedback_thread",
        entityId: result.thread.id,
        subjectType: "employee",
        subjectId:
          result.thread.receiverEmployeeId,
        visibility: "company",
        metadata: {
          threadId: result.thread.id,
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
          assessmentId:
            result.thread.assessmentId,
          developmentPlanId:
            result.thread.developmentPlanId,
          competencyId:
            result.thread.competencyId,
          requiresFollowUp:
            result.thread.requiresFollowUp,
        },
      })
    } catch (activityError) {
      console.error(
        "Erro ao registrar atividade de criação da conversa de feedback:",
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
        "Conversa de feedback criada com sucesso.",
      threadId: result.thread.id,
    }
  } catch (error) {
    console.error(
      "Erro ao criar conversa de feedback:",
      error
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível criar a conversa de feedback.",
    }
  }
}
