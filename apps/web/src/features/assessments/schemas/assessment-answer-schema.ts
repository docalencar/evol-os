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

    answerNumber: z.number().nullable().optional(),

    answerBoolean: z.boolean().nullable().optional(),

    score: z
      .number()
      .min(0, "A pontuação não pode ser negativa.")
      .max(100, "A pontuação deve ser de no máximo 100.")
      .nullable()
      .optional(),
  })
  .superRefine((data, context) => {
    const hasAnswer =
      data.answerText !== null &&
        data.answerText !== undefined ||
      data.answerNumber !== null &&
        data.answerNumber !== undefined ||
      data.answerBoolean !== null &&
        data.answerBoolean !== undefined ||
      data.score !== null &&
        data.score !== undefined

    if (!hasAnswer) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answerText"],
        message: "Informe uma resposta.",
      })
    }
  })

export type SaveAssessmentAnswerInput = z.infer<
  typeof saveAssessmentAnswerSchema
>
