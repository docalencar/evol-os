import { z } from "zod"

export const positionRequirementCategorySchema =
  z.enum([
    "education",
    "experience",
    "certification",
    "language",
    "knowledge",
    "other",
  ])

const basePositionRequirementSchema =
  z.object({
    positionId: z
      .string()
      .uuid("Cargo inválido."),

    category:
      positionRequirementCategorySchema,

    value: z
      .string()
      .trim()
      .min(
        2,
        "O requisito deve ter pelo menos 2 caracteres."
      )
      .max(
        200,
        "O requisito deve ter no máximo 200 caracteres."
      ),

    required: z
      .boolean()
      .default(true),

    notes: z
      .string()
      .trim()
      .max(
        500,
        "As observações devem ter no máximo 500 caracteres."
      )
      .optional(),
  })

export const createPositionRequirementSchema =
  basePositionRequirementSchema

export const updatePositionRequirementSchema =
  basePositionRequirementSchema

export type PositionRequirementCategory =
  z.infer<
    typeof positionRequirementCategorySchema
  >

export type CreatePositionRequirementInput =
  z.infer<
    typeof createPositionRequirementSchema
  >

export type UpdatePositionRequirementInput =
  z.infer<
    typeof updatePositionRequirementSchema
  >
  