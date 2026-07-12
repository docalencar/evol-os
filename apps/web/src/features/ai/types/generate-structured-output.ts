import type {
  ZodType,
} from "zod"

import type {
  AiMessage,
} from "./ai-message"

export type GenerateStructuredOutputInput<
  TOutput,
> = {
  messages: AiMessage[]

  schema: ZodType<TOutput>

  schemaName: string

  temperature?: number
}

export type GenerateStructuredOutputResult<
  TOutput,
> = {
  output: TOutput

  provider: string

  model: string
}