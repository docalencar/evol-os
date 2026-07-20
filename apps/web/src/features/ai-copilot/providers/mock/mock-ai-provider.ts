import type {
  AiProvider,
  AiRequest,
  AiResponse,
} from "../types"

export class MockAiProvider implements AiProvider {
  async execute(
    request: AiRequest
  ): Promise<AiResponse> {
    if (request.type === "conversation") {
      return {
        content:
          "Resposta de conversa gerada pelo Mock AI Provider.",

        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },

        metadata: {
          provider: "mock",
          requestType: "conversation",
          conversationId: request.conversationId,
        },
      }
    }

    const skillId = request.execution.skill.id

    const contentMap: Record<string, string> = {
      "executive-summary":
        "Resumo executivo gerado pelo Mock AI Provider.",

      "employee-analysis":
        "Análise do colaborador gerada pelo Mock AI Provider.",

      "organizational-risks":
        "Riscos organizacionais identificados pelo Mock AI Provider.",
    }

    return {
      content:
        contentMap[skillId] ??
        "Resposta padrão do Mock AI Provider.",

      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },

      metadata: {
        provider: "mock",
        requestType: "skill",
      },
    }
  }
}
