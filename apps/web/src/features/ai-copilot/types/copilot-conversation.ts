export type CopilotConversationStatus =
  | "idle"
  | "processing"
  | "completed"
  | "failed"

export type CopilotMessageRole =
  | "system"
  | "user"
  | "assistant"

export type CopilotMessageStatus =
  | "pending"
  | "completed"
  | "failed"

export type CopilotMessageSource = {
  id: string
  label: string
  type: string
}

export type CopilotMessage = {
  id: string

  role: CopilotMessageRole

  content: string

  status: CopilotMessageStatus

  sources: CopilotMessageSource[]

  createdAt: string

  completedAt: string | null
}

export type CopilotConversationContext = {
  entityType: string | null

  entityId: string | null

  entityTitle: string | null
}

export type CopilotConversation = {
  id: string

  title: string

  status: CopilotConversationStatus

  messages: CopilotMessage[]

  context: CopilotConversationContext

  createdAt: string

  updatedAt: string
}
