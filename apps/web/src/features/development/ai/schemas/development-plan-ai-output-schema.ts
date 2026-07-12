import {
  z,
  type ZodType,
} from "zod"

import type {
  DevelopmentPlanAiOutput,
} from "../types/development-plan-ai-output"

export const developmentPlanAiOutputSchema: ZodType<DevelopmentPlanAiOutput> =
  z.object({
    title: z
      .string()
      .trim()
      .min(
        3,
        "O título do PDI é obrigatório."
      )
      .max(
        120,
        "O título do PDI deve ter no máximo 120 caracteres."
      ),

    summary: z
      .string()
      .trim()
      .min(
        10,
        "O resumo do PDI é obrigatório."
      )
      .max(
        1000,
        "O resumo do PDI deve ter no máximo 1000 caracteres."
      ),

    goals: z
      .array(
        z.object({
          title: z
            .string()
            .trim()
            .min(
              3,
              "O título do objetivo é obrigatório."
            )
            .max(
              160,
              "O título do objetivo deve ter no máximo 160 caracteres."
            ),

          description: z
            .string()
            .trim()
            .min(
              10,
              "A descrição do objetivo é obrigatória."
            )
            .max(
              1000,
              "A descrição do objetivo deve ter no máximo 1000 caracteres."
            ),
        })
      )
      .min(
        1,
        "O PDI deve possuir pelo menos um objetivo."
      )
      .max(
        5,
        "O PDI deve possuir no máximo cinco objetivos."
      ),
  })