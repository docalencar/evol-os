import type {
  CopilotConversation,
  CopilotConversationContextType,
  CopilotConversationWithMessages,
} from "../types"

export type FindCopilotConversationByIdInput = {
  companyId: string
  conversationId: string
}

export type CreateCopilotConversationInput = {
  companyId: string
  title?: string
  contextType?: CopilotConversationContextType
  contextId?: string | null
}

export interface CopilotConversationRepository {
  findById(
    input: FindCopilotConversationByIdInput
  ): Promise<CopilotConversationWithMessages | null>

  create(
    input: CreateCopilotConversationInput
  ): Promise<CopilotConversation>
}
