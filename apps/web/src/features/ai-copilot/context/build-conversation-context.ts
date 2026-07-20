import type { AiMessage } from "../providers/types"
import { buildSystemPrompt } from "../prompts/builder"

type ConversationMessage = {
  role: "user" | "assistant"
  content: string
}

type BuildConversationContextInput = {
  systemPrompt?: string | null
  messages: ConversationMessage[]
}

export function buildConversationContext(
  input: BuildConversationContextInput
): AiMessage[] {
  const context: AiMessage[] = [
  {
    role: "system",
    content: buildSystemPrompt(),
  },
]

  if (input.systemPrompt?.trim()) {
    context.push({
      role: "system",
      content: input.systemPrompt.trim(),
    })
  }

  context.push(
    ...input.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }))
  )

  return context
}
