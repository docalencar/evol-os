import OpenAI from "openai"

import type {
  AiProvider,
  AiRequest,
  AiResponse,
} from "../types"

const DEFAULT_OPENAI_MODEL = "gpt-5-mini"

type OpenAiProviderOptions = {
  apiKey?: string
  model?: string
}

export class OpenAiProvider implements AiProvider {
  private readonly client: OpenAI
  private readonly model: string

  constructor(options: OpenAiProviderOptions = {}) {
    this.client = new OpenAI({
      apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
    })

    this.model =
      options.model ??
      process.env.OPENAI_MODEL ??
      DEFAULT_OPENAI_MODEL
  }

  async execute(
    request: AiRequest
  ): Promise<AiResponse> {
    const response = await this.client.responses.create({
      model: this.model,
            input: this.createInput(request),
      temperature: request.temperature,
      max_output_tokens: request.maxTokens,
    })

    return {
      content: response.output_text,

      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },

      metadata: {
        ...request.metadata,
        provider: "openai",
        model: this.model,
        responseId: response.id,
        requestType: request.type,
      },
    }
  }

  private createInput(
    request: AiRequest
  ): string {
    if (request.type === "conversation") {
      return request.messages.map(message => `${message.role}: ${message.content}`).join("\n\n")
    }

    return JSON.stringify(request.execution)
  }
}
