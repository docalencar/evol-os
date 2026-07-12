export type AiMessageRole =
  | "system"
  | "user"
  | "assistant"

export type AiMessage = {
  role: AiMessageRole

  content: string
}