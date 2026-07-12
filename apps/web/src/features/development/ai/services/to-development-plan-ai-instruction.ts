import type {
  AiInstruction,
} from "@/features/ai"

import type {
  DevelopmentPlanAiInput,
} from "../types/development-plan-ai-input"

function buildContext(
  input: DevelopmentPlanAiInput
): string[] {
  return [
    `Colaborador: ${input.employeeName}`,
    `Cargo: ${input.positionName}`,
    "",
    "Competências com GAP:",
    ...input.competencyGaps.map((gap) => {
      return [
        `• ${gap.competency}`,
        `Atual: ${gap.currentLevel}`,
        `Esperado: ${gap.expectedLevel}`,
        `Obrigatória: ${
          gap.required ? "Sim" : "Não"
        }`,
      ].join(" | ")
    }),
  ]
}

export function toDevelopmentPlanAiInstruction(
  input: DevelopmentPlanAiInput
): AiInstruction {
  return {
    objective:
      "Criar um Plano de Desenvolvimento Individual (PDI) personalizado para o colaborador.",

    context: buildContext(input),

    rules: [
      "Considere apenas as competências informadas.",
      "Priorize competências obrigatórias.",
      "Utilize objetivos SMART.",
      "Sugira ações práticas e aplicáveis ao ambiente corporativo.",
      "Evite conteúdos genéricos.",
    ],

    expectedOutput:
      "Retorne exatamente o objeto definido pelo schema informado.",

    notes: [
      "A resposta deve estar em português do Brasil.",
      "O tom deve ser profissional e objetivo.",
    ],
  }
}
