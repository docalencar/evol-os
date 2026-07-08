 import { z } from "zod"

export const createPositionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome do cargo deve ter pelo menos 2 caracteres.")
    .max(100, "O nome do cargo deve ter no máximo 100 caracteres."),

  description: z
    .string()
    .trim()
    .max(255, "A descrição deve ter no máximo 255 caracteres.")
    .nullable()
    .optional(),
})

export type CreatePositionInput = z.infer<typeof createPositionSchema>
