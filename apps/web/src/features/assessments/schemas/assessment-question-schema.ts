import { z } from "zod"

import {
  ASSESSMENT_QUESTION_TYPES,
} from "../types/assessment-question"

const optionalText = (
  maximumLength: number,
  message: string
) =>
  z
    .string()
    .trim()
    .max(maximumLength, message)
    .transform((value) => value || null)
    .optional()
    .nullable()

export const assessmentQuestionSchema = z.object({
  assessmentSectionId: z.string().uuid(),

  code: optionalText(
    30,
    "Código deve possuir no máximo 30 caracteres."
  ),

  question: z
    .string()
    .trim()
    .min(5)
    .max(500),

  helpText: optionalText(
    1000,
    "Texto de ajuda muito grande."
  ),

  questionType: z.enum(
    ASSESSMENT_QUESTION_TYPES
  ),

  scaleMin: z.coerce.number(),

  scaleMax: z.coerce.number(),

  weight: z.coerce
    .number()
    .positive(),

  displayOrder: z.coerce
    .number()
    .int()
    .min(0),

  required: z.boolean(),

  active: z.boolean(),
})

export type AssessmentQuestionInput =
  z.infer<
    typeof assessmentQuestionSchema
  >
