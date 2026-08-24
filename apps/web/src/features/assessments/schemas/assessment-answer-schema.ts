import { z } from "zod"

export const saveAssessmentAnswerSchema = z
  .object({
    assessmentResponseId: z
      .string()
      .uuid("Execução de avaliação inválida."),

    assessmentQuestionId: z
      .string()
      .uuid("Pergunta inválida."),

    answerText: z
      .string()
      .trim()
      .max(5000, "A resposta deve ter no máximo 5.000 caracteres.")
      .transform((value) => value || null)
      .nullable()
      .optional(),

    answerNumber: z.number().finite().nullable().optional(),

    answerBoolean: z.boolean().nullable().optional(),

    score: z
      .number()
      .int("A pontuação deve ser um número inteiro.")
      .nullable()
      .optional(),
  })
  .superRefine((data, context) => {
    const answerCount = [
      data.answerText,
      data.answerNumber,
      data.answerBoolean,
      data.score,
    ].filter(
      (value) => value !== null && value !== undefined
    ).length

    if (answerCount !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answerText"],
        message:
          answerCount === 0
            ? "Informe uma resposta."
            : "Informe somente o valor correspondente ao tipo da pergunta.",
      })
    }
  })

export type SaveAssessmentAnswerInput = z.infer<
  typeof saveAssessmentAnswerSchema
>
