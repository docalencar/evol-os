import {
  createMockAiProvider,
  type AiProvider,
} from "@/features/ai"

import type {
  DevelopmentPlanAiOutput,
} from "../types/development-plan-ai-output"

export function createDevelopmentPlanMockAiProvider(): AiProvider {
  return createMockAiProvider({
    model:
      "mock-development-plan-v1",

    generateOutput:
      (): DevelopmentPlanAiOutput => ({
        title:
          "Desenvolvimento de competências prioritárias",

        summary:
          "Plano de desenvolvimento voltado à evolução das competências com maior distância em relação ao nível esperado para o cargo.",

        goals: [
          {
            title:
              "Desenvolver a competência prioritária",

            description:
              "Elevar o nível da competência prioritária por meio de estudo dirigido, aplicação prática e acompanhamento periódico com o responsável pelo PDI.",
          },

          {
            title:
              "Aplicar o aprendizado no trabalho",

            description:
              "Executar uma atividade prática relacionada à competência desenvolvida e registrar os resultados, aprendizados e pontos de melhoria.",
          },

          {
            title:
              "Acompanhar a evolução do desenvolvimento",

            description:
              "Realizar revisões periódicas com o responsável pelo plano para avaliar o progresso e ajustar as ações quando necessário.",
          },
        ],
      }),
  })
}
