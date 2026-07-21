import {
  createMockAiProvider,
} from "@/features/ai"

export function createFeedbackMockAiProvider() {
  return createMockAiProvider({
    model: "feedback-ai-mock-v1",

    generateOutput() {
      return {
        summary:
          "A conversa apresentou um feedback construtivo com foco em melhoria contínua.",

        tone: "constructive",

        themes: [
          "Comunicação",
          "Organização",
        ],

        competencies: [
          "Comunicação",
          "Planejamento",
        ],

        agreements: [
          "Realizar alinhamentos semanais.",
        ],

        nextSteps: [
          "Revisar prioridades.",
          "Novo feedback em 30 dias.",
        ],
      }
    },
  })
}
