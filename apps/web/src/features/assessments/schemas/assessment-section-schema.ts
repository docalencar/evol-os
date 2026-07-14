import { z } from "zod"

const optionalTextSchema = (maximumLength: number, message: string) =>
  z
    .string()
    .trim()
    .max(maximumLength, message)
    .transform((value) => value || null)
    .nullable()
    .optional()

export const assessmentSectionSchema = z.object({
  assessmentTemplateId: z
    .string()
    .uuid("Template de avaliação inválido."),

  code: optionalTextSchema(
    30,
    "O código deve ter no máximo 30 caracteres."
  ).transform((value) => value?.toUpperCase() ?? null),

  name: z
    .string()
    .trim()
    .min(2, "O nome da seção deve ter pelo menos 2 caracteres.")
    .max(120, "O nome da seção deve ter no máximo 120 caracteres."),

  description: optionalTextSchema(
    500,
    "A descrição deve ter no máximo 500 caracteres."
  ),

  icon: optionalTextSchema(
    50,
    "O ícone deve ter no máximo 50 caracteres."
  ),

  color: optionalTextSchema(
    30,
    "A cor deve ter no máximo 30 caracteres."
  ),

  weight: z.coerce
    .number()
    .positive("O peso deve ser maior que zero.")
    .max(100, "O peso deve ser de no máximo 100."),

  displayOrder: z.coerce
    .number()
    .int("A ordem deve ser um número inteiro.")
    .min(0, "A ordem não pode ser negativa."),

  active: z.boolean(),
})

export type AssessmentSectionInput = z.infer<
  typeof assessmentSectionSchema
>
