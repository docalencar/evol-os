import "server-only"

import {
  createFeedbackThreadRepository,
} from "../repositories/feedback-thread-repository"

type CloseFeedbackThreadInput = {
  companyId: string
  threadId: string
}

export async function closeFeedbackThread(
  input: CloseFeedbackThreadInput
) {
  const threadRepository =
    await createFeedbackThreadRepository()

  const {
    data: thread,
    error: threadError,
  } = await threadRepository.findById(
    input.companyId,
    input.threadId
  )

  if (threadError) {
    throw new Error(
      "Não foi possível carregar a conversa de feedback."
    )
  }

  if (!thread) {
    throw new Error(
      "Conversa de feedback não encontrada."
    )
  }

  if (thread.status === "closed") {
    throw new Error(
      "Esta conversa de feedback já está encerrada."
    )
  }

  if (thread.status === "archived") {
    throw new Error(
      "Não é possível encerrar uma conversa arquivada."
    )
  }

  const {
    data: updatedThread,
    error: updateError,
  } = await threadRepository.update({
    companyId: input.companyId,
    threadId: input.threadId,
    status: "closed",
    closedAt: new Date(),
  })

  if (updateError || !updatedThread) {
    throw new Error(
      "Não foi possível encerrar a conversa de feedback."
    )
  }

  return updatedThread
}
