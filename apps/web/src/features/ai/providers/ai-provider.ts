import type {
  GenerateStructuredOutputInput,
  GenerateStructuredOutputResult,
} from "../types/generate-structured-output"

export type AiProvider = {
  name: string

  generateStructuredOutput<TOutput>(
    input: GenerateStructuredOutputInput<TOutput>
  ): Promise<
    GenerateStructuredOutputResult<TOutput>
  >
}