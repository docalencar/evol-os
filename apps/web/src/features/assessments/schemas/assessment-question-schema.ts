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

export const assessmentQuestionSchema = z
  .object({
    assessmentSectionId: z
      .string()
      .uuid("Seção de avaliação inválida."),

    code: optionalText(
      30,
      "O código deve possuir no máximo 30 caracteres."
    ),

    question: z
      .string()
      .trim()
      .min(
        5,
        "A pergunta deve possuir pelo menos 5 caracteres."
      )
      .max(
        500,
        "A pergunta deve possuir no máximo 500 caracteres."
      ),

    helpText: optionalText(
      1000,
      "O texto de ajuda deve possuir no máximo 1.000 caracteres."
    ),

    questionType: z.enum(
      ASSESSMENT_QUESTION_TYPES
    ),

    scaleMin: z.coerce.number({
      message:
        "Informe um valor mínimo válido.",
    }),

    scaleMax: z.coerce.number({
      message:
        "Informe um valor máximo válido.",
    }),

    weight: z.coerce
      .number({
        message:
          "Informe um peso válido para a pergunta.",
      })
      .positive(
        "O peso da pergunta deve ser maior que zero."
      )
      .max(
        100,
        "O peso da pergunta deve ser de no máximo 100."
      ),

    displayOrder: z.coerce
      .number()
      .int()
      .min(0),

    required: z.boolean(),

    active: z.boolean(),
  })
  .superRefine((data, context) => {
    if (
      (
        data.questionType === "scale" ||
        data.questionType === "number"
      ) &&
      data.scaleMax <= data.scaleMin
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scaleMax"],
        message:
          "O valor máximo deve ser maior que o valor mínimo.",
      })
    }
  })

export type AssessmentQuestionInput =
  z.infer<
    typeof assessmentQuestionSchema
  >
