export type FeedbackThreadType =
  | "feedback"
  | "feedforward"
  | "recognition"
  | "check_in"
  | "one_on_one"

export type FeedbackThreadStatus =
  | "open"
  | "awaiting_acknowledgement"
  | "acknowledged"
  | "closed"
  | "archived"

export type FeedbackThreadPriority =
  | "low"
  | "normal"
  | "high"

export type FeedbackThreadVisibility =
  | "participants"
  | "management"
  | "hr"

export type FeedbackMessageType =
  | "message"
  | "summary"
  | "system"

export type FeedbackMetadataPrimitive =
  | string
  | number
  | boolean
  | null

export type FeedbackMetadataValue =
  | FeedbackMetadataPrimitive
  | FeedbackMetadataValue[]
  | {
      [key: string]:
        FeedbackMetadataValue
    }

export type FeedbackMetadata = {
  [key: string]:
    FeedbackMetadataValue
}

export type FeedbackThread = {
  id: string
  companyId: string
  senderEmployeeId: string
  receiverEmployeeId: string
  createdByUserId: string
  assessmentId: string | null
  developmentPlanId: string | null
  competencyId: string | null
  type: FeedbackThreadType
  status: FeedbackThreadStatus
  priority: FeedbackThreadPriority
  visibility: FeedbackThreadVisibility
  title: string
  requiresFollowUp: boolean
  followUpAt: Date | null
  acknowledgedAt: Date | null
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type FeedbackMessage = {
  id: string
  companyId: string
  threadId: string
  authorEmployeeId: string | null
  createdByUserId: string
  type: FeedbackMessageType
  content: string
  metadata: FeedbackMetadata
  editedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type FeedbackThreadListItem = Pick<
  FeedbackThread,
  | "id"
  | "senderEmployeeId"
  | "receiverEmployeeId"
  | "type"
  | "status"
  | "priority"
  | "title"
  | "updatedAt"
> & {
  senderName: string
  receiverName: string
}

export type FeedbackThreadDetail = Pick<
  FeedbackThread,
  | "id"
  | "companyId"
  | "senderEmployeeId"
  | "receiverEmployeeId"
  | "type"
  | "status"
  | "priority"
  | "visibility"
  | "title"
  | "requiresFollowUp"
  | "followUpAt"
  | "acknowledgedAt"
  | "closedAt"
  | "createdAt"
  | "updatedAt"
> & {
  senderName: string
  receiverName: string
}

export type FeedbackMessageDetail = Pick<
  FeedbackMessage,
  | "id"
  | "companyId"
  | "threadId"
  | "authorEmployeeId"
  | "type"
  | "content"
  | "editedAt"
  | "createdAt"
> & {
  authorName: string | null
}

export type FeedbackAcknowledgement = {
  id: string
  companyId: string
  threadId: string
  employeeId: string
  acknowledgedAt: Date
  createdAt: Date
}

export type FeedbackAttachment = {
  id: string
  companyId: string
  threadId: string
  messageId: string | null
  uploadedByEmployeeId: string | null
  createdByUserId: string
  fileName: string
  storagePath: string
  mimeType: string | null
  sizeBytes: number | null
  createdAt: Date
}

export type FeedbackMention = {
  id: string
  companyId: string
  threadId: string
  messageId: string
  mentionedEmployeeId: string
  createdAt: Date
}
