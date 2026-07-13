import { z } from "zod"

import {
  POSITION_EMPLOYMENT_TYPES,
  POSITION_HIERARCHICAL_LEVELS,
  POSITION_STATUSES,
  POSITION_TRAVEL_REQUIREMENTS,
  POSITION_WORK_MODELS,
} from "../types/position"

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

  departmentId: z
    .string()
    .uuid("Departamento inválido.")
    .nullable()
    .optional(),

  hierarchicalLevel: z.enum(POSITION_HIERARCHICAL_LEVELS),

  status: z.enum(POSITION_STATUSES),

  weeklyWorkloadHours: z.coerce
    .number()
    .int("A carga horária semanal deve ser um número inteiro.")
    .min(1, "A carga horária semanal deve ser de pelo menos 1 hora.")
    .max(168, "A carga horária semanal deve ser de no máximo 168 horas."),

  workModel: z.enum(POSITION_WORK_MODELS),

  employmentType: z.enum(POSITION_EMPLOYMENT_TYPES),

  travelRequirement: z.enum(POSITION_TRAVEL_REQUIREMENTS),
})

export type CreatePositionInput = z.infer<typeof createPositionSchema>