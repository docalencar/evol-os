import type {
  CopilotConversation,
} from "./copilot-conversation"

import type {
  CopilotConversationMessage,
} from "./copilot-conversation-message"

export type CopilotConversationWithMessages = {
  conversation: CopilotConversation
  messages: CopilotConversationMessage[]
}
