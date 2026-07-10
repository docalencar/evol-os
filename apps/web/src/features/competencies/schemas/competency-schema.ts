import { z } from "zod"

export const competencyCategorySchema = z.enum([
  "behavioral",
  "technical",
  "leadership",
])

export const createCompetencySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da competência."),
  description: z.string().trim().optional().or(z.literal("")),
  category: competencyCategorySchema.default("behavioral"),
  expectedLevel: z.coerce
    .number()
    .min(1, "O nível esperado mínimo é 1.")
    .max(5, "O nível esperado máximo é 5."),
  weight: z.coerce
    .number()
    .min(1, "O peso mínimo é 1.")
    .max(5, "O peso máximo é 5."),
  active: z.boolean().default(true),
})

export const updateCompetencySchema = createCompetencySchema.partial()

export type CreateCompetencyInput = z.infer<typeof createCompetencySchema>
export type UpdateCompetencyInput = z.infer<typeof updateCompetencySchema>
