import { z } from "zod"

import {
  POSITION_HIERARCHICAL_LEVELS,
  POSITION_STATUSES,
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
})

export type CreatePositionInput = z.infer<typeof createPositionSchema>