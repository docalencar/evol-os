import { z } from "zod"

import {
  ASSESSMENT_CYCLE_STATUSES,
  ASSESSMENT_CYCLE_TYPES,
} from "../types/assessment-cycle"

const optionalDateSchema = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable()

export const assessmentCycleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "O nome do ciclo deve ter pelo menos 2 caracteres.")
      .max(120, "O nome do ciclo deve ter no máximo 120 caracteres."),

    description: z
      .string()
      .trim()
      .max(500, "A descrição deve ter no máximo 500 caracteres.")
      .transform((value) => value || null)
      .nullable()
      .optional(),

    assessmentType: z.enum(ASSESSMENT_CYCLE_TYPES),

    status: z.enum(ASSESSMENT_CYCLE_STATUSES),

    startDate: z
      .string()
      .trim()
      .min(1, "Informe a data de início."),

    endDate: z
      .string()
      .trim()
      .min(1, "Informe a data de término."),

    closeDate: optionalDateSchema,

    allowSelfAssessment: z.boolean(),

    allowManagerAssessment: z.boolean(),

    allowPeerAssessment: z.boolean(),

    allowDirectReportAssessment: z.boolean(),

    anonymous: z.boolean(),
  })
  .superRefine((data, context) => {
    const startDate = new Date(`${data.startDate}T00:00:00`)
    const endDate = new Date(`${data.endDate}T00:00:00`)

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return
    }

    if (endDate < startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message:
          "A data de término deve ser igual ou posterior à data de início.",
      })
    }

    if (data.closeDate) {
      const closeDate = new Date(`${data.closeDate}T00:00:00`)

      if (
        !Number.isNaN(closeDate.getTime()) &&
        closeDate < endDate
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["closeDate"],
          message:
            "A data de encerramento deve ser igual ou posterior à data de término.",
        })
      }
    }

    const hasAtLeastOneEvaluationSource =
      data.allowSelfAssessment ||
      data.allowManagerAssessment ||
      data.allowPeerAssessment ||
      data.allowDirectReportAssessment

    if (!hasAtLeastOneEvaluationSource) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allowManagerAssessment"],
        message:
          "Selecione pelo menos uma origem de avaliação.",
      })
    }
  })

export type AssessmentCycleInput = z.infer<
  typeof assessmentCycleSchema
>