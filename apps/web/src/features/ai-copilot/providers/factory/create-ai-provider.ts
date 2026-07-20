import type { AiProvider } from "../types"

import { MockAiProvider } from "../mock"
import { OpenAiProvider } from "../openai"

export function createAiProvider(): AiProvider {
  const provider = (
    process.env.AI_PROVIDER ?? "mock"
  ).toLowerCase()

  switch (provider) {
    case "openai":
      return new OpenAiProvider()

    case "mock":
    default:
      return new MockAiProvider()
  }
}
