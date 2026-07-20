export type AiTokenUsage = {
  inputTokens: number

  outputTokens: number

  totalTokens: number
}

export type AiResponse = {
  content: string

  usage?: AiTokenUsage

  metadata: Record<string, unknown>
}
