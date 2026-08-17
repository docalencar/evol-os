import {
  FEEDBACK_THREAD_PRIORITY_LABELS,
  FEEDBACK_THREAD_STATUS_LABELS,
  FEEDBACK_THREAD_TYPE_LABELS,
  FEEDBACK_THREAD_VISIBILITY_LABELS,
} from "../../constants/feedback-constants"
import type {
  FeedbackMessage,
  FeedbackMessageDetail,
  FeedbackThread,
  FeedbackThreadDetail,
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
  thread: FeedbackThread | FeedbackThreadDetail
  messages: Array<FeedbackMessage | FeedbackMessageDetail>
  employees?: FeedbackEmployeeInput[]
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
  message: FeedbackMessage | FeedbackMessageDetail,
  employeeNameById: Map<string, string>,
  currentEmployeeId: string
): FeedbackThreadMessageViewModel {
  const isSystemMessage =
    message.type === "system"

  const authorName = isSystemMessage
    ? "Sistema"
    : "authorName" in message && message.authorName
      ? message.authorName
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
  employees = [],
  currentEmployeeId,
}: PresentFeedbackThreadInput): FeedbackThreadViewModel {
  const isSender =
    thread.senderEmployeeId ===
    currentEmployeeId

  const isReceiver =
    thread.receiverEmployeeId ===
    currentEmployeeId

  const employeeNameById = new Map(
    employees.map((employee) => [
      employee.id,
      employee.full_name,
    ])
  )

  const isParticipant = isSender || isReceiver

  const canReply = isParticipant &&
    thread.status !== "closed" &&
    thread.status !== "archived"

  const canAcknowledge =
    isReceiver &&
    thread.status ===
      "awaiting_acknowledgement"

  const canClose = isParticipant &&
    thread.status !== "closed" &&
    thread.status !== "archived"

  const canArchive = isParticipant &&
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
      name: "senderName" in thread ? thread.senderName : getEmployeeName(
        thread.senderEmployeeId,
        employeeNameById
      ),
    },

    receiver: {
      id: thread.receiverEmployeeId,
      name: "receiverName" in thread ? thread.receiverName : getEmployeeName(
        thread.receiverEmployeeId,
        employeeNameById
      ),
    },

    currentUserRole: isSender
      ? "sender"
      : isReceiver
        ? "receiver"
        : "hr_observer",

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
