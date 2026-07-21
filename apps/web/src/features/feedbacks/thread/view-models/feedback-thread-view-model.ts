import type {
  FeedbackMessageType,
  FeedbackThreadPriority,
  FeedbackThreadStatus,
  FeedbackThreadType,
  FeedbackThreadVisibility,
} from "../../types/feedback"

export type FeedbackThreadParticipantViewModel = {
  id: string
  name: string
}

export type FeedbackThreadCurrentUserRole =
  | "sender"
  | "receiver"

export type FeedbackThreadMessageViewModel = {
  id: string
  authorEmployeeId: string | null
  authorName: string
  type: FeedbackMessageType
  content: string
  createdAt: Date
  editedAt: Date | null
  isCurrentUser: boolean
  isSystemMessage: boolean
}

export type FeedbackThreadViewModel = {
  id: string
  title: string

  sender: FeedbackThreadParticipantViewModel
  receiver: FeedbackThreadParticipantViewModel

  currentUserRole:
    FeedbackThreadCurrentUserRole

  type: FeedbackThreadType
  typeLabel: string

  status: FeedbackThreadStatus
  statusLabel: string

  priority: FeedbackThreadPriority
  priorityLabel: string

  visibility: FeedbackThreadVisibility
  visibilityLabel: string

  canReply: boolean
  canAcknowledge: boolean
  canClose: boolean
  canArchive: boolean

  requiresFollowUp: boolean
  followUpAt: Date | null
  acknowledgedAt: Date | null
  closedAt: Date | null

  createdAt: Date
  updatedAt: Date

  messages: FeedbackThreadMessageViewModel[]
}
