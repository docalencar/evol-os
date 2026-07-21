import "server-only"

import {
  createFeedbackAcknowledgementRepository,
} from "../repositories/feedback-acknowledgement-repository"
import {
  createFeedbackThreadRepository,
} from "../repositories/feedback-thread-repository"

type AcknowledgeFeedbackThreadInput = {
  companyId: string
  threadId: string
  employeeId: string
}

export async function acknowledgeFeedbackThread(
  input: AcknowledgeFeedbackThreadInput
) {
  const threadRepository =
    await createFeedbackThreadRepository()

  const acknowledgementRepository =
    await createFeedbackAcknowledgementRepository()

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

  if (
    input.employeeId !==
      thread.senderEmployeeId &&
    input.employeeId !==
      thread.receiverEmployeeId
  ) {
    throw new Error(
      "Somente participantes podem confirmar o recebimento deste feedback."
    )
  }

  if (
    thread.status === "acknowledged"
  ) {
    throw new Error(
      "Este feedback já foi confirmado."
    )
  }

  if (thread.status === "closed") {
    throw new Error(
      "Não é possível confirmar um feedback encerrado."
    )
  }

  if (thread.status === "archived") {
    throw new Error(
      "Não é possível confirmar um feedback arquivado."
    )
  }

  if (
    thread.status !==
    "awaiting_acknowledgement"
  ) {
    throw new Error(
      "Este feedback não está aguardando confirmação."
    )
  }

  const acknowledgedAt = new Date()

  const {
    data: acknowledgement,
    error: acknowledgementError,
  } = await acknowledgementRepository.create({
    companyId: input.companyId,
    threadId: input.threadId,
    employeeId: input.employeeId,
  })

  if (
    acknowledgementError ||
    !acknowledgement
  ) {
    if (
      acknowledgementError?.code ===
      "23505"
    ) {
      throw new Error(
        "Este feedback já foi confirmado por este colaborador."
      )
    }

    throw new Error(
      "Não foi possível registrar a confirmação do feedback."
    )
  }

  const {
    data: updatedThread,
    error: updateError,
  } = await threadRepository.update({
    companyId: input.companyId,
    threadId: input.threadId,
    status: "acknowledged",
    acknowledgedAt,
  })

  if (updateError || !updatedThread) {
    const { error: rollbackError } =
      await acknowledgementRepository.delete(
        input.companyId,
        acknowledgement.id
      )

    if (rollbackError) {
      console.error(
        "Não foi possível desfazer a confirmação de feedback após falha na atualização da conversa:",
        rollbackError
      )
    }

    throw new Error(
      "Não foi possível atualizar o status do feedback."
    )
  }

  return {
    thread: updatedThread,
    acknowledgement,
  }
}
