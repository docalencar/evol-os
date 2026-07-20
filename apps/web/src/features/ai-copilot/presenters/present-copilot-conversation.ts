import type {
  CopilotConversation,
} from "../types/copilot-conversation"

import type {
  CopilotConversationViewModel,
} from "../view-models/copilot-conversation-view-model"

export function presentCopilotConversation(
  conversation: CopilotConversation
): CopilotConversationViewModel {
  return {
    id: conversation.id,
    title: conversation.title,
    status: conversation.status,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      status: message.status,
      createdAt: message.createdAt,
    })),
  }
}
