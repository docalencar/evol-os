import type {
  CopilotSkillExecution,
} from "../../../copilot/skills"

export type AiMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type SkillExecutionRequest = {
  type: "skill"

  execution: CopilotSkillExecution

  systemPrompt?: string | null

  temperature?: number

  maxTokens?: number

  metadata: Record<string, unknown>
}

export type ConversationRequest = {
  type: "conversation"

  companyId: string

  conversationId: string

  messages: AiMessage[]

  temperature?: number

  maxTokens?: number

  metadata: Record<string, unknown>
}

export type AiRequest =
  | SkillExecutionRequest
  | ConversationRequest
