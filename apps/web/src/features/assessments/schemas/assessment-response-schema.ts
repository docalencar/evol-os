import { z } from "zod"

export const startAssessmentResponseSchema = z.object({
  assessmentCycleId: z
    .string()
    .uuid("Ciclo de avaliação inválido."),

  assessmentTemplateId: z
    .string()
    .uuid("Template de avaliação inválido."),

  employeeId: z
    .string()
    .uuid("Colaborador avaliado inválido."),

  evaluatorId: z
    .string()
    .uuid("Avaliador inválido."),
})

export type StartAssessmentResponseInput = z.infer<
  typeof startAssessmentResponseSchema
>
