import type {
  FeedbackMessage,
  FeedbackMetadata,
  FeedbackThread,
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
  thread: FeedbackThread
  messages: FeedbackMessage[]
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
  thread: FeedbackThread,
  employeeNames: Map<string, string>
): FeedbackAiContextParticipant[] {
  return [
    {
      employeeId:
        thread.senderEmployeeId,
      name: getEmployeeName(
        employeeNames,
        thread.senderEmployeeId
      ),
      role: "sender",
    },
    {
      employeeId:
        thread.receiverEmployeeId,
      name: getEmployeeName(
        employeeNames,
        thread.receiverEmployeeId
      ),
      role: "receiver",
    },
  ]
}

function createMessages(
  messages: FeedbackMessage[],
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
      authorName: getEmployeeName(
        employeeNames,
        message.authorEmployeeId
      ),
      content: message.content,
      createdAt:
        message.createdAt.toISOString(),
      editedAt:
        message.editedAt?.toISOString() ??
        null,
      metadata: normalizeMetadata(
        message.metadata
      ),
    }))
}

function createMetrics(
  thread: FeedbackThread,
  messages: FeedbackMessage[]
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
      assessmentId:
        thread.assessmentId,
      developmentPlanId:
        thread.developmentPlanId,
      competencyId:
        thread.competencyId,
    },
  }
}
