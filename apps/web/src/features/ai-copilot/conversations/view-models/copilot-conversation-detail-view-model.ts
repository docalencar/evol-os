import type {
  CopilotConversationContextType,
  CopilotConversationMessageRole,
  CopilotConversationMessageStatus,
  CopilotConversationStatus,
} from "../types"

export type CopilotConversationMessageViewModel = {
  id: string
  role: CopilotConversationMessageRole
  content: string
  status: CopilotConversationMessageStatus
  createdAt: string
}

export type CopilotConversationDetailViewModel = {
  id: string
  title: string
  contextType: CopilotConversationContextType
  contextId: string | null
  status: CopilotConversationStatus
  messages: CopilotConversationMessageViewModel[]
  createdAt: string
  updatedAt: string
}
