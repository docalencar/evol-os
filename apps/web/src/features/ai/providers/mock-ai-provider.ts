import type {
  AiProvider,
} from "./ai-provider"

import type {
  GenerateStructuredOutputInput,
  GenerateStructuredOutputResult,
} from "../types/generate-structured-output"

type MockOutputFactory = (
  input: GenerateStructuredOutputInput<unknown>
) => unknown | Promise<unknown>

type CreateMockAiProviderInput = {
  model?: string

  generateOutput: MockOutputFactory
}

export function createMockAiProvider({
  model = "mock-structured-output-v1",
  generateOutput,
}: CreateMockAiProviderInput): AiProvider {
  return {
    name: "mock",

    async generateStructuredOutput<TOutput>(
      input: GenerateStructuredOutputInput<TOutput>
    ): Promise<
      GenerateStructuredOutputResult<TOutput>
    > {
      const rawOutput =
        await generateOutput(
          input as GenerateStructuredOutputInput<unknown>
        )

      const output =
        input.schema.parse(rawOutput)

      return {
        output,
        provider: "mock",
        model,
      }
    },
  }
}