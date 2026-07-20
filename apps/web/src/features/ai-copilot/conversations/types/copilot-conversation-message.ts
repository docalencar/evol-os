export type CopilotConversationMessageRole =
  | "user"
  | "assistant"
  | "system"

export type CopilotConversationMessageStatus =
  | "pending"
  | "completed"
  | "failed"

export type CopilotConversationMessageMetadata =
  Record<string, unknown>

export type CopilotConversationMessage = {
  id: string
  conversationId: string
  role: CopilotConversationMessageRole
  content: string
  status: CopilotConversationMessageStatus
  metadata: CopilotConversationMessageMetadata
  inputTokens: number | null
  outputTokens: number | null
  createdAt: string
}
