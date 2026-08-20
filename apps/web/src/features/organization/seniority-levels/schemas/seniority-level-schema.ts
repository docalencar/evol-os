import { z } from "zod"

// Mirrors the 0100 boundary contract: code 1–40, label 1–80, rank integer >= 0.
// rank is NOT unique and does not need to be sequential.
export const createSeniorityLevelSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Informe o código da senioridade.")
    .max(40, "O código deve ter no máximo 40 caracteres."),
  label: z
    .string()
    .trim()
    .min(1, "Informe o nome da senioridade.")
    .max(80, "O nome deve ter no máximo 80 caracteres."),
  rank: z.coerce
    .number()
    .int("A ordem deve ser um número inteiro.")
    .min(0, "A ordem deve ser maior ou igual a 0."),
})

export const updateSeniorityLevelSchema = createSeniorityLevelSchema

export type CreateSeniorityLevelInput = z.infer<typeof createSeniorityLevelSchema>
export type UpdateSeniorityLevelInput = z.infer<typeof updateSeniorityLevelSchema>
