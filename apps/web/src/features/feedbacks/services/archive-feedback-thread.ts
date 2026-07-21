import "server-only"

import {
  createFeedbackThreadRepository,
} from "../repositories/feedback-thread-repository"

type ArchiveFeedbackThreadInput = {
  companyId: string
  threadId: string
}

export async function archiveFeedbackThread(
  input: ArchiveFeedbackThreadInput
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

  if (thread.status === "archived") {
    throw new Error(
      "Esta conversa de feedback já está arquivada."
    )
  }

  const {
    data: updatedThread,
    error: updateError,
  } = await threadRepository.update({
    companyId: input.companyId,
    threadId: input.threadId,
    status: "archived",
    closedAt:
      thread.closedAt ?? new Date(),
  })

  if (updateError || !updatedThread) {
    throw new Error(
      "Não foi possível arquivar a conversa de feedback."
    )
  }

  return updatedThread
}
