import {
  FEEDBACK_THREAD_PRIORITY_LABELS,
  FEEDBACK_THREAD_STATUS_LABELS,
  FEEDBACK_THREAD_TYPE_LABELS,
  FEEDBACK_THREAD_VISIBILITY_LABELS,
} from "../../constants/feedback-constants"
import type {
  FeedbackMessage,
  FeedbackThread,
} from "../../types/feedback"
import type {
  FeedbackThreadMessageViewModel,
  FeedbackThreadViewModel,
} from "../view-models/feedback-thread-view-model"

type FeedbackEmployeeInput = {
  id: string
  full_name: string
}

type PresentFeedbackThreadInput = {
  thread: FeedbackThread
  messages: FeedbackMessage[]
  employees: FeedbackEmployeeInput[]
  currentEmployeeId: string
}

function getEmployeeName(
  employeeId: string,
  employeeNameById: Map<string, string>
) {
  return (
    employeeNameById.get(employeeId) ??
    "Colaborador não encontrado"
  )
}

function presentMessage(
  message: FeedbackMessage,
  employeeNameById: Map<string, string>,
  currentEmployeeId: string
): FeedbackThreadMessageViewModel {
  const isSystemMessage =
    message.type === "system"

  const authorName = isSystemMessage
    ? "Sistema"
    : message.authorEmployeeId
      ? getEmployeeName(
          message.authorEmployeeId,
          employeeNameById
        )
      : "Autor não identificado"

  return {
    id: message.id,
    authorEmployeeId:
      message.authorEmployeeId,
    authorName,
    type: message.type,
    content: message.content,
    createdAt: message.createdAt,
    editedAt: message.editedAt,
    isCurrentUser:
      message.authorEmployeeId ===
      currentEmployeeId,
    isSystemMessage,
  }
}

export function presentFeedbackThread({
  thread,
  messages,
  employees,
  currentEmployeeId,
}: PresentFeedbackThreadInput): FeedbackThreadViewModel {
  const isSender =
    thread.senderEmployeeId ===
    currentEmployeeId

  const isReceiver =
    thread.receiverEmployeeId ===
    currentEmployeeId

  if (!isSender && !isReceiver) {
    throw new Error(
      "O colaborador atual não participa desta conversa de feedback."
    )
  }

  const employeeNameById = new Map(
    employees.map((employee) => [
      employee.id,
      employee.full_name,
    ])
  )

  const canReply =
    thread.status !== "closed" &&
    thread.status !== "archived"

  const canAcknowledge =
    isReceiver &&
    thread.status ===
      "awaiting_acknowledgement"

  const canClose =
    thread.status !== "closed" &&
    thread.status !== "archived"

  const canArchive =
    thread.status === "closed"

  const presentedMessages = messages
    .map((message) =>
      presentMessage(
        message,
        employeeNameById,
        currentEmployeeId
      )
    )
    .sort(
      (firstMessage, secondMessage) =>
        firstMessage.createdAt.getTime() -
        secondMessage.createdAt.getTime()
    )

  return {
    id: thread.id,
    title: thread.title,

    sender: {
      id: thread.senderEmployeeId,
      name: getEmployeeName(
        thread.senderEmployeeId,
        employeeNameById
      ),
    },

    receiver: {
      id: thread.receiverEmployeeId,
      name: getEmployeeName(
        thread.receiverEmployeeId,
        employeeNameById
      ),
    },

    currentUserRole: isSender
      ? "sender"
      : "receiver",

    type: thread.type,
    typeLabel:
      FEEDBACK_THREAD_TYPE_LABELS[
        thread.type
      ],

    status: thread.status,
    statusLabel:
      FEEDBACK_THREAD_STATUS_LABELS[
        thread.status
      ],

    priority: thread.priority,
    priorityLabel:
      FEEDBACK_THREAD_PRIORITY_LABELS[
        thread.priority
      ],

    visibility: thread.visibility,
    visibilityLabel:
      FEEDBACK_THREAD_VISIBILITY_LABELS[
        thread.visibility
      ],

    canReply,
    canAcknowledge,
    canClose,
    canArchive,

    requiresFollowUp:
      thread.requiresFollowUp,
    followUpAt: thread.followUpAt,
    acknowledgedAt:
      thread.acknowledgedAt,
    closedAt: thread.closedAt,

    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,

    messages: presentedMessages,
  }
}
