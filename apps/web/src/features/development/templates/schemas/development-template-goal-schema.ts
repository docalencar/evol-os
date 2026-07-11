import { z } from "zod"

export const createDevelopmentTemplateGoalSchema = z.object({
  templateId: z.string().uuid(),

  competencyId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("")),

  title: z
    .string()
    .trim()
    .min(2, "Informe o título do objetivo."),

  description: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),

  suggestedTargetLevel: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional(),

  orderIndex: z
    .number()
    .int()
    .min(0)
    .default(0),
})

export const updateDevelopmentTemplateGoalSchema =
  createDevelopmentTemplateGoalSchema.partial()

export type CreateDevelopmentTemplateGoalInput = z.infer<
  typeof createDevelopmentTemplateGoalSchema
>

export type UpdateDevelopmentTemplateGoalInput = z.infer<
  typeof updateDevelopmentTemplateGoalSchema
>