import { z } from "zod"

import { DEVELOPMENT_ACTION_TYPES } from "../../constants/development-action"

export const developmentTemplateActionTypeSchema = z.enum(
  DEVELOPMENT_ACTION_TYPES
)

export const createDevelopmentTemplateActionSchema = z.object({
  templateGoalId: z.string().uuid(),

  title: z
    .string()
    .trim()
    .min(2, "Informe o título da ação."),

  description: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),

  type: developmentTemplateActionTypeSchema,

  suggestedDueDays: z
    .number()
    .int()
    .positive()
    .optional(),

  orderIndex: z
    .number()
    .int()
    .min(0)
    .default(0),
})

export const updateDevelopmentTemplateActionSchema =
  createDevelopmentTemplateActionSchema.partial()

export type CreateDevelopmentTemplateActionInput = z.infer<
  typeof createDevelopmentTemplateActionSchema
>

export type UpdateDevelopmentTemplateActionInput = z.infer<
  typeof updateDevelopmentTemplateActionSchema
>