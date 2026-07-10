import { z } from "zod"

export const employeeCompetencySourceSchema = z.enum([
  "manual",
  "assessment",
  "manager",
  "self",
])

const baseEmployeeCompetencySchema = z.object({
  employeeId: z.string().uuid("Colaborador inválido."),
  competencyId: z.string().uuid("Competência inválida."),
  currentLevel: z.coerce
    .number()
    .int("O nível atual deve ser um número inteiro.")
    .min(1, "O nível atual deve ser no mínimo 1.")
    .max(5, "O nível atual deve ser no máximo 5."),
  source: employeeCompetencySourceSchema.default("manual"),
  validatedAt: z.string().optional(),
  notes: z
    .string()
    .max(500, "As observações devem ter no máximo 500 caracteres.")
    .optional(),
})

export const createEmployeeCompetencySchema =
  baseEmployeeCompetencySchema

export const updateEmployeeCompetencySchema =
  baseEmployeeCompetencySchema

export type EmployeeCompetencySource = z.infer<
  typeof employeeCompetencySourceSchema
>

export type CreateEmployeeCompetencyInput = z.infer<
  typeof createEmployeeCompetencySchema
>

export type UpdateEmployeeCompetencyInput = z.infer<
  typeof updateEmployeeCompetencySchema
>
