import { z } from "zod"

import {
  DEVELOPMENT_PLAN_PRIORITIES,
} from "../constants/development-plan"

const optionalUuidSchema = z
  .union([
    z.string().uuid(
      "Responsável inválido."
    ),
    z.literal(""),
  ])
  .optional()

const optionalDateSchema = z
  .union([
    z.string().date(
      "Informe uma data válida."
    ),
    z.literal(""),
  ])
  .optional()

export const updateDevelopmentPlanSchema =
  z
    .object({
      title: z
        .string()
        .trim()
        .min(
          3,
          "O título deve ter pelo menos 3 caracteres."
        )
        .max(
          120,
          "O título deve ter no máximo 120 caracteres."
        ),

      description: z
        .string()
        .trim()
        .max(
          1000,
          "A descrição deve ter no máximo 1000 caracteres."
        )
        .optional(),

      ownerId: optionalUuidSchema,

      priority: z.enum(
        DEVELOPMENT_PLAN_PRIORITIES
      ),

      startDate: optionalDateSchema,

      dueDate: optionalDateSchema,
    })
    .superRefine(
      (
        {
          startDate,
          dueDate,
        },
        context
      ) => {
        if (
          startDate &&
          dueDate &&
          dueDate < startDate
        ) {
          context.addIssue({
            code: "custom",
            path: ["dueDate"],
            message:
              "A data prevista não pode ser anterior à data de início.",
          })
        }
      }
    )

export type UpdateDevelopmentPlanInput =
  z.infer<
    typeof updateDevelopmentPlanSchema
  >