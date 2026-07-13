import {
  z,
  type ZodType,
} from "zod"

import type {
  DevelopmentPlanAiInput,
} from "../types/development-plan-ai-input"

export const developmentPlanAiInputSchema: ZodType<DevelopmentPlanAiInput> =
  z.object({
    employeeName: z
      .string()
      .trim()
      .min(
        2,
        "O nome do colaborador é obrigatório."
      )
      .max(
        160,
        "O nome do colaborador deve ter no máximo 160 caracteres."
      ),

    positionName: z
      .string()
      .trim()
      .min(
        2,
        "O cargo do colaborador é obrigatório."
      )
      .max(
        160,
        "O cargo deve ter no máximo 160 caracteres."
      ),

    competencyGaps: z
      .array(
        z.object({
          competency: z
            .string()
            .trim()
            .min(
              2,
              "O nome da competência é obrigatório."
            )
            .max(
              160,
              "O nome da competência deve ter no máximo 160 caracteres."
            ),

          currentLevel: z
            .number()
            .int()
            .min(0)
            .max(5),

          expectedLevel: z
            .number()
            .int()
            .min(1)
            .max(5),

          required: z.boolean(),
        })
      )
      .min(
        1,
        "Informe pelo menos uma competência com GAP."
      )
      .max(
        10,
        "Informe no máximo dez competências."
      ),
  })