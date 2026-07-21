import type {
  AiInstruction,
} from "@/features/ai"

import type {
  FeedbackAiContextPresentation,
} from "../presenters"

export function toFeedbackAiInstruction(
  context: FeedbackAiContextPresentation
): AiInstruction {
  return {
    objective:
      "Analisar uma conversa de feedback organizacional.",

    context: [
      context.summary,
      context.transcript,
    ],

    rules: [
      "Seja objetivo.",
      "Não invente informações.",
      "Utilize apenas o conteúdo da conversa.",
      "Não faça diagnósticos psicológicos.",
      "Resuma somente fatos observáveis.",
    ],

    expectedOutput: `
{
  "summary": "...",
  "tone": "positive | constructive | neutral | attention",
  "themes": [],
  "competencies": [],
  "agreements": [],
  "nextSteps": []
}
`.trim(),
  }
}
