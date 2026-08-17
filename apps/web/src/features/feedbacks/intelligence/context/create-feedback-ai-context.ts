import type {
  FeedbackMessage,
  FeedbackMessageDetail,
  FeedbackMetadata,
  FeedbackThread,
  FeedbackThreadDetail,
} from "../../types/feedback"

import type {
  FeedbackAiContext,
  FeedbackAiContextMessage,
  FeedbackAiContextParticipant,
} from "./feedback-ai-context"

type EmployeeReference = {
  id: string
  full_name: string
}

export type CreateFeedbackAiContextInput = {
  thread: FeedbackThread | FeedbackThreadDetail
  messages: Array<FeedbackMessage | FeedbackMessageDetail>
  employees: EmployeeReference[]
  generatedAt?: string
  locale?: string
  timeZone?: string
}

function createEmployeeNameMap(
  employees: EmployeeReference[]
) {
  return new Map(
    employees.map((employee) => [
      employee.id,
      employee.full_name,
    ])
  )
}

function getEmployeeName(
  employeeNames: Map<string, string>,
  employeeId: string | null
) {
  if (!employeeId) {
    return "Sistema"
  }

  return (
    employeeNames.get(employeeId) ??
    "Colaborador não encontrado"
  )
}

function normalizeMetadata(
  metadata: FeedbackMetadata
): Record<string, unknown> {
  return metadata as Record<string, unknown>
}

function createParticipants(
  thread: FeedbackThread | FeedbackThreadDetail,
  employeeNames: Map<string, string>
): FeedbackAiContextParticipant[] {
  return [
    {
      employeeId:
        thread.senderEmployeeId,
      name: "senderName" in thread ? thread.senderName : getEmployeeName(
        employeeNames,
        thread.senderEmployeeId
      ),
      role: "sender",
    },
    {
      employeeId:
        thread.receiverEmployeeId,
      name: "receiverName" in thread ? thread.receiverName : getEmployeeName(
        employeeNames,
        thread.receiverEmployeeId
      ),
      role: "receiver",
    },
  ]
}

function createMessages(
  messages: Array<FeedbackMessage | FeedbackMessageDetail>,
  employeeNames: Map<string, string>
): FeedbackAiContextMessage[] {
  return [...messages]
    .sort(
      (firstMessage, secondMessage) =>
        firstMessage.createdAt.getTime() -
        secondMessage.createdAt.getTime()
    )
    .map((message) => ({
      id: message.id,
      type: message.type,
      authorEmployeeId:
        message.authorEmployeeId,
      authorName: "authorName" in message && message.authorName
        ? message.authorName
        : getEmployeeName(
        employeeNames,
        message.authorEmployeeId
      ),
      content: message.content,
      createdAt:
        message.createdAt.toISOString(),
      editedAt:
        message.editedAt?.toISOString() ??
        null,
      metadata: "metadata" in message
        ? normalizeMetadata(message.metadata)
        : {},
    }))
}

function createMetrics(
  thread: FeedbackThread | FeedbackThreadDetail,
  messages: Array<FeedbackMessage | FeedbackMessageDetail>
): FeedbackAiContext["metrics"] {
  const uniqueAuthors = new Set(
    messages
      .map(
        (message) =>
          message.authorEmployeeId
      )
      .filter(
        (
          employeeId
        ): employeeId is string =>
          Boolean(employeeId)
      )
  )

  return {
    totalMessages: messages.length,

    participantMessages:
      messages.filter(
        (message) =>
          message.type === "message"
      ).length,

    systemMessages:
      messages.filter(
        (message) =>
          message.type === "system"
      ).length,

    summaryMessages:
      messages.filter(
        (message) =>
          message.type === "summary"
      ).length,

    editedMessages:
      messages.filter(
        (message) =>
          Boolean(message.editedAt)
      ).length,

    uniqueAuthors: uniqueAuthors.size,

    hasAcknowledgement:
      Boolean(thread.acknowledgedAt),

    isClosed:
      thread.status === "closed",

    isArchived:
      thread.status === "archived",

    hasScheduledFollowUp:
      thread.requiresFollowUp &&
      Boolean(thread.followUpAt),
  }
}

export function createFeedbackAiContext({
  thread,
  messages,
  employees,
  generatedAt =
    new Date().toISOString(),
  locale = "pt-BR",
  timeZone = "UTC",
}: CreateFeedbackAiContextInput): FeedbackAiContext {
  const employeeNames =
    createEmployeeNameMap(employees)

  return {
    kind: "feedback_thread",
    version: 1,
    generatedAt,
    locale,
    timeZone,

    conversation: {
      threadId: thread.id,
      companyId: thread.companyId,
      title: thread.title,
      type: thread.type,
      status: thread.status,
      priority: thread.priority,
      visibility: thread.visibility,
      requiresFollowUp:
        thread.requiresFollowUp,
      followUpAt:
        thread.followUpAt?.toISOString() ??
        null,
      acknowledgedAt:
        thread.acknowledgedAt?.toISOString() ??
        null,
      closedAt:
        thread.closedAt?.toISOString() ??
        null,
      createdAt:
        thread.createdAt.toISOString(),
      updatedAt:
        thread.updatedAt.toISOString(),
    },

    participants: createParticipants(
      thread,
      employeeNames
    ),

    messages: createMessages(
      messages,
      employeeNames
    ),

    metrics: createMetrics(
      thread,
      messages
    ),

    metadata: {
      assessmentId: "assessmentId" in thread ? thread.assessmentId : null,
      developmentPlanId: "developmentPlanId" in thread ? thread.developmentPlanId : null,
      competencyId: "competencyId" in thread ? thread.competencyId : null,
    },
  }
}
