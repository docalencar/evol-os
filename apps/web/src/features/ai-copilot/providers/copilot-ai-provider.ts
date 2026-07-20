export type GenerateCopilotResponseInput = {
  companyId: string
  conversationId: string
  prompt: string
}

export type GenerateCopilotResponseResult = {
  content: string
  inputTokens?: number | null
  outputTokens?: number | null
}

export interface CopilotAIProvider {
  generateResponse(
    input: GenerateCopilotResponseInput
  ): Promise<GenerateCopilotResponseResult>
}
