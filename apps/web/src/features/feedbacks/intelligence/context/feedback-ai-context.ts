import type {
  FeedbackThreadPriority,
  FeedbackThreadStatus,
  FeedbackThreadType,
  FeedbackThreadVisibility,
} from "../../types/feedback"

export type FeedbackAiContextParticipantRole =
  | "sender"
  | "receiver"

export type FeedbackAiContextParticipant = {
  employeeId: string
  name: string
  role: FeedbackAiContextParticipantRole
}

export type FeedbackAiContextMessageType =
  | "message"
  | "summary"
  | "system"

export type FeedbackAiContextMessage = {
  id: string
  type: FeedbackAiContextMessageType
  authorEmployeeId: string | null
  authorName: string
  content: string
  createdAt: string
  editedAt: string | null
  metadata: Record<string, unknown>
}

export type FeedbackAiContextConversation = {
  threadId: string
  companyId: string
  title: string
  type: FeedbackThreadType
  status: FeedbackThreadStatus
  priority: FeedbackThreadPriority
  visibility: FeedbackThreadVisibility
  requiresFollowUp: boolean
  followUpAt: string | null
  acknowledgedAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export type FeedbackAiContextMetrics = {
  totalMessages: number
  participantMessages: number
  systemMessages: number
  summaryMessages: number
  editedMessages: number
  uniqueAuthors: number
  hasAcknowledgement: boolean
  isClosed: boolean
  isArchived: boolean
  hasScheduledFollowUp: boolean
}

export type FeedbackAiContext = {
  kind: "feedback_thread"
  version: 1
  generatedAt: string
  locale: string
  timeZone: string
  conversation: FeedbackAiContextConversation
  participants: FeedbackAiContextParticipant[]
  messages: FeedbackAiContextMessage[]
  metrics: FeedbackAiContextMetrics
  metadata: {
    assessmentId: string | null
    developmentPlanId: string | null
    competencyId: string | null
  }
}
