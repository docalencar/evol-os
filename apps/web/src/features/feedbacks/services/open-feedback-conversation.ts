import {
  z,
} from "zod"

import {
  createFeedbackMessageRepository,
} from "../repositories/feedback-message-repository"
import {
  createFeedbackThreadRepository,
} from "../repositories/feedback-thread-repository"
import {
  createFeedbackMessageSchema,
  createFeedbackThreadSchema,
} from "../schemas/feedback-schema"
import type {
  FeedbackMessage,
  FeedbackMetadata,
  FeedbackThread,
} from "../types/feedback"

const openFeedbackConversationSchema =
  createFeedbackThreadSchema.extend({
    initialMessage: z.object({
      authorEmployeeId:
        z.string().uuid(),
      content: z
        .string()
        .trim()
        .min(
          1,
          "A primeira mensagem é obrigatória."
        ),
      metadata: z
        .custom<FeedbackMetadata>()
        .optional(),
    }),
  })

export type OpenFeedbackConversationInput =
  z.input<
    typeof openFeedbackConversationSchema
  >

export type OpenFeedbackConversationResult = {
  thread: FeedbackThread
  initialMessage: FeedbackMessage
}

export async function openFeedbackConversation(
  input: OpenFeedbackConversationInput
): Promise<OpenFeedbackConversationResult> {
  const validatedInput =
    openFeedbackConversationSchema.parse(
      input
    )

  const {
    initialMessage,
    ...threadInput
  } = validatedInput

  const validatedThreadInput =
    createFeedbackThreadSchema.parse(
      threadInput
    )

  const threadRepository =
    await createFeedbackThreadRepository()

  const {
    data: thread,
    error: threadError,
  } = await threadRepository.create(
    validatedThreadInput
  )

  if (threadError) {
    throw new Error(
      `Não foi possível criar a conversa de feedback: ${threadError.message}`
    )
  }

  if (!thread) {
    throw new Error(
      "A conversa de feedback não foi criada."
    )
  }

  const validatedMessageInput =
    createFeedbackMessageSchema.parse({
      companyId:
        validatedThreadInput.companyId,
      threadId: thread.id,
      authorEmployeeId:
        initialMessage.authorEmployeeId,
      createdByUserId:
        validatedThreadInput.createdByUserId,
      type: "message",
      content:
        initialMessage.content,
      metadata:
        initialMessage.metadata ?? {},
    })

  const messageRepository =
    await createFeedbackMessageRepository()

  const {
    data: message,
    error: messageError,
  } = await messageRepository.create(
    validatedMessageInput
  )

  if (messageError || !message) {
    const cleanupResult =
      await threadRepository.delete(
        thread.companyId,
        thread.id
      )

    if (cleanupResult.error) {
      console.error(
        "Não foi possível remover a conversa após falha na criação da primeira mensagem:",
        {
          threadId: thread.id,
          error:
            cleanupResult.error.message,
        }
      )
    }

    throw new Error(
      messageError
        ? `Não foi possível criar a primeira mensagem: ${messageError.message}`
        : "A primeira mensagem não foi criada."
    )
  }

  return {
    thread,
    initialMessage: message,
  }
}
