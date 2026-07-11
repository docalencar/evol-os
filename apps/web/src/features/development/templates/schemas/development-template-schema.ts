import { z } from "zod"

export const developmentTemplateScopeSchema = z.enum([
  "global",
  "company",
])

export const createDevelopmentTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do template."),

  description: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),

  suggestedDurationDays: z
    .number()
    .int()
    .positive()
    .optional(),

  active: z.boolean().default(true),
})

export const updateDevelopmentTemplateSchema =
  createDevelopmentTemplateSchema
    .partial()
    .extend({
      suggestedDurationDays: z
        .number()
        .int()
        .positive()
        .nullable()
        .optional(),
    })

export type CreateDevelopmentTemplateInput = z.infer<
  typeof createDevelopmentTemplateSchema
>

export type UpdateDevelopmentTemplateInput = z.infer<
  typeof updateDevelopmentTemplateSchema
>
