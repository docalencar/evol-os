import type {
  CopilotConversationWithMessages,
} from "../types"

import type {
  CopilotConversationDetailViewModel,
} from "../view-models"

export function presentCopilotConversation(
  data: CopilotConversationWithMessages
): CopilotConversationDetailViewModel {
  return {
    id: data.conversation.id,
    title: data.conversation.title,
    contextType:
      data.conversation.contextType,
    contextId:
      data.conversation.contextId,
    status: data.conversation.status,
    createdAt:
      data.conversation.createdAt,
    updatedAt:
      data.conversation.updatedAt,
    messages: data.messages.map(
      (message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        status: message.status,
        createdAt: message.createdAt,
      })
    ),
  }
}
