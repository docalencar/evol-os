import { z } from "zod"

import {
  JOB_OPENING_EMPLOYMENT_TYPES,
  JOB_OPENING_PRIORITIES,
  JOB_OPENING_REASONS,
  JOB_OPENING_STATUSES,
  JOB_OPENING_WORK_MODELS,
} from "../types/job-opening"

const requiredUuidSchema = z
  .string()
  .uuid("Identificador inválido.")

const optionalUuidSchema = z.preprocess(
  (value) =>
    value === "" || value === undefined
      ? null
      : value,
  z
    .string()
    .uuid("Identificador inválido.")
    .nullable()
)

const optionalTextSchema = (
  maximumLength: number,
  message: string
) =>
  z
    .string()
    .trim()
    .max(maximumLength, message)
    .nullable()
    .optional()
    .transform((value) => value || null)

const optionalNonNegativeNumberSchema =
  z.preprocess(
    (value) =>
      value === "" || value === undefined
        ? null
        : value,
    z.coerce
      .number()
      .finite("Informe um valor válido.")
      .min(0, "O valor não pode ser negativo.")
      .nullable()
  )

const optionalDateSchema = z.preprocess(
  (value) =>
    value === "" || value === undefined
      ? null
      : value,
  z
    .string()
    .date("Informe uma data válida.")
    .nullable()
)

const jobOpeningFieldsSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Informe o título da vaga.")
      .max(
        160,
        "O título deve ter no máximo 160 caracteres."
      ),

    description: z
      .string()
      .trim()
      .min(1, "Informe a descrição da vaga.")
      .max(
        5000,
        "A descrição deve ter no máximo 5000 caracteres."
      ),

    departmentId: requiredUuidSchema,
    positionId: requiredUuidSchema,
    requestingManagerId: requiredUuidSchema,
    recruiterId: optionalUuidSchema,

    openingReason: z.enum(
      JOB_OPENING_REASONS
    ),

    replacedEmployeeId: optionalUuidSchema,

    openingJustification: z
      .string()
      .trim()
      .min(
        1,
        "Informe a justificativa para abertura da vaga."
      )
      .max(
        2000,
        "A justificativa deve ter no máximo 2000 caracteres."
      ),

    positionsCount: z.coerce
      .number()
      .int(
        "A quantidade de posições deve ser um número inteiro."
      )
      .min(
        1,
        "A vaga deve possuir pelo menos uma posição."
      ),

    currentHeadcount: z.coerce
      .number()
      .int(
        "O quadro atual deve ser um número inteiro."
      )
      .min(
        0,
        "O quadro atual não pode ser negativo."
      ),

    targetHeadcount: z.coerce
      .number()
      .int(
        "O quadro ideal deve ser um número inteiro."
      )
      .min(
        0,
        "O quadro ideal não pode ser negativo."
      ),

    workModel: z.enum(
      JOB_OPENING_WORK_MODELS
    ),

    location: optionalTextSchema(
      255,
      "O local deve ter no máximo 255 caracteres."
    ),

    employmentType: z.enum(
      JOB_OPENING_EMPLOYMENT_TYPES
    ),

    salaryMin:
      optionalNonNegativeNumberSchema,

    salaryMax:
      optionalNonNegativeNumberSchema,

    priority: z.enum(
      JOB_OPENING_PRIORITIES
    ),

    targetHireDate: optionalDateSchema,

    notes: optionalTextSchema(
      5000,
      "As observações devem ter no máximo 5000 caracteres."
    ),

    estimatedMonthlyCost:
      optionalNonNegativeNumberSchema,

    isBudgeted: z.boolean(),
  })
  .superRefine((input, context) => {
    if (
      input.salaryMin !== null &&
      input.salaryMax !== null &&
      input.salaryMax < input.salaryMin
    ) {
      context.addIssue({
        code: "custom",
        path: ["salaryMax"],
        message:
          "O salário máximo não pode ser menor que o salário mínimo.",
      })
    }

    if (
      input.openingReason === "replacement" &&
      !input.replacedEmployeeId
    ) {
      context.addIssue({
        code: "custom",
        path: ["replacedEmployeeId"],
        message:
          "Informe a pessoa que será substituída.",
      })
    }

    if (
      input.openingReason !== "replacement" &&
      input.replacedEmployeeId
    ) {
      context.addIssue({
        code: "custom",
        path: ["replacedEmployeeId"],
        message:
          "A pessoa substituída só pode ser informada em vagas de substituição.",
      })
    }
  })

export const jobOpeningIdSchema = z.object({
  jobOpeningId: requiredUuidSchema,
})

export const createJobOpeningSchema =
  jobOpeningFieldsSchema

export const updateJobOpeningSchema =
  jobOpeningFieldsSchema.and(
    jobOpeningIdSchema
  )

export const changeJobOpeningStatusSchema =
  jobOpeningIdSchema.extend({
    status: z.enum(
      JOB_OPENING_STATUSES
    ),
    approverId: optionalUuidSchema,
  })

export type CreateJobOpeningInput =
  z.infer<typeof createJobOpeningSchema>

export type UpdateJobOpeningInput =
  z.infer<typeof updateJobOpeningSchema>

export type ChangeJobOpeningStatusInput =
  z.infer<
    typeof changeJobOpeningStatusSchema
  >
