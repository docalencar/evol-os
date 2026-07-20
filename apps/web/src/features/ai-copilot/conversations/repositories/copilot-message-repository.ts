import type {
  CopilotConversationMessage,
  CopilotConversationMessageMetadata,
  CopilotConversationMessageRole,
  CopilotConversationMessageStatus,
} from "../types"

export type AppendCopilotMessageInput = {
  conversationId: string
  role: CopilotConversationMessageRole
  content: string
  status?: CopilotConversationMessageStatus
  metadata?: CopilotConversationMessageMetadata
  inputTokens?: number | null
  outputTokens?: number | null
}

export interface CopilotMessageRepository {
  append(
    input: AppendCopilotMessageInput
  ): Promise<CopilotConversationMessage>
}
