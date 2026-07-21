"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  createFeedbackMessageRepository,
} from "../repositories/feedback-message-repository"
import {
  createFeedbackThreadRepository,
} from "../repositories/feedback-thread-repository"
import {
  createFeedbackMessageSchema,
} from "../schemas/feedback-schema"
import type {
  FeedbackMetadata,
} from "../types/feedback"

type ReplyFeedbackActionInput = {
  threadId: string
  content: string
  metadata?: FeedbackMetadata
}

type ReplyFeedbackActionState = {
  success: boolean
  message: string
  messageId?: string
}

export async function replyFeedbackAction(
  input: ReplyFeedbackActionInput
): Promise<ReplyFeedbackActionState> {
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

    const parsedInput =
      createFeedbackMessageSchema.safeParse({
        companyId,
        threadId: input.threadId,
        authorEmployeeId: personId,
        createdByUserId: user.id,
        type: "message",
        content: input.content,
        metadata: input.metadata ?? {},
      })

    if (!parsedInput.success) {
      return {
        success: false,
        message:
          parsedInput.error.issues[0]?.message ??
          "Dados inválidos para enviar a resposta.",
      }
    }

    const threadRepository =
      await createFeedbackThreadRepository()

    const {
      data: thread,
      error: threadError,
    } = await threadRepository.findById(
      companyId,
      parsedInput.data.threadId
    )

    if (threadError) {
      return {
        success: false,
        message:
          "Não foi possível carregar a conversa de feedback.",
      }
    }

    if (!thread) {
      return {
        success: false,
        message:
          "Conversa de feedback não encontrada.",
      }
    }

    const isParticipant =
      thread.senderEmployeeId === personId ||
      thread.receiverEmployeeId === personId

    if (!isParticipant) {
      return {
        success: false,
        message:
          "Somente participantes podem responder a esta conversa.",
      }
    }

    if (thread.status === "closed") {
      return {
        success: false,
        message:
          "Não é possível responder a uma conversa encerrada.",
      }
    }

    if (thread.status === "archived") {
      return {
        success: false,
        message:
          "Não é possível responder a uma conversa arquivada.",
      }
    }

    const messageRepository =
      await createFeedbackMessageRepository()

    const {
      data: message,
      error: messageError,
    } = await messageRepository.create(
      parsedInput.data
    )

    if (messageError || !message) {
      return {
        success: false,
        message:
          messageError?.message ??
          "Não foi possível enviar a resposta.",
      }
    }

    const otherParticipantId =
      thread.senderEmployeeId === personId
        ? thread.receiverEmployeeId
        : thread.senderEmployeeId

    try {
      await recordActivity({
        companyId,
        activityType: "feedback.replied",
        module: "feedback",
        title: "Feedback respondido",
        description:
          `Uma resposta foi adicionada à conversa "${thread.title}".`,
        actorType: "user",
        entityType: "feedback_thread",
        entityId: thread.id,
        subjectType: "employee",
        subjectId: otherParticipantId,
        visibility: "company",
        metadata: {
          threadId: thread.id,
          messageId: message.id,
          authorEmployeeId: personId,
          senderEmployeeId:
            thread.senderEmployeeId,
          receiverEmployeeId:
            thread.receiverEmployeeId,
          feedbackType: thread.type,
          status: thread.status,
          priority: thread.priority,
          feedbackVisibility:
            thread.visibility,
        },
      })
    } catch (activityError) {
      console.error(
        "Erro ao registrar atividade de resposta ao feedback:",
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
        "Resposta enviada com sucesso.",
      messageId: message.id,
    }
  } catch (error) {
    console.error(
      "Erro ao responder conversa de feedback:",
      error
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a resposta.",
    }
  }
}
