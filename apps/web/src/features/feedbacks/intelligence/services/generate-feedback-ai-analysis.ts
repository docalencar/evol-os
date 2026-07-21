import {
  renderAiInstruction,
  type AiProvider,
  type GenerateStructuredOutputResult,
} from "@/features/ai"

import {
  feedbackAiAnalysisSchema,
} from "../schemas"

import type {
  FeedbackAiAnalysis,
} from "../types"

import type {
  FeedbackAiContextPresentation,
} from "../presenters"

import {
  toFeedbackAiInstruction,
} from "./to-feedback-ai-instruction"

export async function generateFeedbackAiAnalysis(
  provider: AiProvider,
  context: FeedbackAiContextPresentation
): Promise<
  GenerateStructuredOutputResult<FeedbackAiAnalysis>
> {
  const instruction =
    toFeedbackAiInstruction(context)

  const prompt =
    renderAiInstruction(
      instruction
    )

  return provider.generateStructuredOutput({
    messages: [
      {
        role: "system",
        content:
          "Você é um especialista em gestão de pessoas e feedback organizacional.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],

    schema:
      feedbackAiAnalysisSchema,

    schemaName:
      "feedback_ai_analysis",

    temperature: 0.2,
  })
}
