import { z } from "zod"

export const positionCompetencyTypeSchema = z.enum([
  "core",
  "leadership",
  "promotion",
  "optional",
])

const basePositionCompetencySchema = z.object({
  positionId: z.string().uuid("Cargo inválido."),
  competencyId: z.string().uuid("Competência inválida."),
  expectedLevel: z.coerce.number().int().min(1).max(5),
  weight: z.coerce.number().int().min(1).max(5),
  required: z.boolean().default(true),
  type: positionCompetencyTypeSchema.default("core"),
  notes: z.string().max(500).optional(),
})

export const createPositionCompetencySchema = basePositionCompetencySchema
export const updatePositionCompetencySchema = basePositionCompetencySchema

export type PositionCompetencyType = z.infer<
  typeof positionCompetencyTypeSchema
>

export type CreatePositionCompetencyInput = z.infer<
  typeof createPositionCompetencySchema
>

export type UpdatePositionCompetencyInput = z.infer<
  typeof updatePositionCompetencySchema
>