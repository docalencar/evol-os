import { z } from "zod"

import {
  ASSESSMENT_TEMPLATE_STATUSES,
  ASSESSMENT_TEMPLATE_TYPES,
} from "../types/assessment-template"

export const assessmentTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      2,
      "O nome do template deve ter pelo menos 2 caracteres."
    )
    .max(
      120,
      "O nome do template deve ter no máximo 120 caracteres."
    ),

  description: z
    .string()
    .trim()
    .max(
      500,
      "A descrição deve ter no máximo 500 caracteres."
    )
    .transform((value) => value || null)
    .nullable()
    .optional(),

  instructions: z
    .string()
    .trim()
    .max(
      2000,
      "As instruções devem ter no máximo 2.000 caracteres."
    )
    .transform((value) => value || null)
    .nullable()
    .optional(),

  type: z.enum(ASSESSMENT_TEMPLATE_TYPES),

  status: z.enum(ASSESSMENT_TEMPLATE_STATUSES),
})

export type AssessmentTemplateInput = z.infer<
  typeof assessmentTemplateSchema
>
