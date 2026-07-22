import { z } from "zod"

import {
  JOB_OPENING_EMPLOYMENT_TYPES,
  JOB_OPENING_PRIORITIES,
  JOB_OPENING_REASONS,
  JOB_OPENING_WORK_MODELS,
} from "../types/job-opening"

const requiredUuid = (message: string) =>
  z
    .string()
    .uuid("Identificador inválido.")
    .nullable()
    .refine((value) => value !== null, { message })

const requiredInteger = (message: string, minimum: number) =>
  z
    .number()
    .int("Informe um número inteiro.")
    .min(minimum, message)
    .nullable()
    .refine((value) => value !== null, { message })

const optionalNonNegativeNumber = z
  .number()
  .finite("Informe um valor válido.")
  .min(0, "O valor não pode ser negativo.")
  .nullable()

export const jobOpeningWizardSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Informe o título da vaga.")
      .max(160, "O título deve ter no máximo 160 caracteres."),
    description: z
      .string()
      .trim()
      .min(1, "Informe a descrição da vaga.")
      .max(5000, "A descrição deve ter no máximo 5000 caracteres."),
    departmentId: requiredUuid("Selecione o departamento."),
    positionId: requiredUuid("Selecione o cargo."),
    requestingManagerId: requiredUuid(
      "Selecione o gestor responsável."
    ),
    recruiterId: z.string().uuid().nullable(),
    openingReason: z
      .enum(JOB_OPENING_REASONS)
      .nullable()
      .refine((value) => value !== null, {
        message: "Selecione o motivo da vaga.",
      }),
    replacedEmployeeId: z.string().uuid().nullable(),
    openingJustification: z
      .string()
      .trim()
      .min(1, "Informe a justificativa para abertura da vaga.")
      .max(
        2000,
        "A justificativa deve ter no máximo 2000 caracteres."
      ),
    positionsCount: requiredInteger(
      "Informe pelo menos uma posição.",
      1
    ),
    currentHeadcount: requiredInteger(
      "O quadro atual não pode ser negativo.",
      0
    ),
    targetHeadcount: requiredInteger(
      "O quadro ideal não pode ser negativo.",
      0
    ),
    workModel: z
      .enum(JOB_OPENING_WORK_MODELS)
      .nullable()
      .refine((value) => value !== null, {
        message: "Selecione o modelo de trabalho.",
      }),
    employmentType: z
      .enum(JOB_OPENING_EMPLOYMENT_TYPES)
      .nullable()
      .refine((value) => value !== null, {
        message: "Selecione o regime de contratação.",
      }),
    salaryMin: optionalNonNegativeNumber,
    salaryMax: optionalNonNegativeNumber,
    priority: z
      .enum(JOB_OPENING_PRIORITIES)
      .nullable()
      .refine((value) => value !== null, {
        message: "Selecione a prioridade.",
      }),
    targetHireDate: z.string().date().nullable(),
    notes: z.string().trim().max(5000).nullable(),
    isBudgeted: z
      .boolean()
      .nullable()
      .refine((value) => value !== null, {
        message: "Informe se a vaga está prevista no orçamento.",
      }),
  })
  .superRefine((values, context) => {
    if (
      values.openingReason === "replacement" &&
      !values.replacedEmployeeId
    ) {
      context.addIssue({
        code: "custom",
        path: ["replacedEmployeeId"],
        message: "Informe a pessoa que será substituída.",
      })
    }

    if (
      values.openingReason !== "replacement" &&
      values.replacedEmployeeId
    ) {
      context.addIssue({
        code: "custom",
        path: ["replacedEmployeeId"],
        message:
          "A pessoa substituída só pode ser informada em vagas de substituição.",
      })
    }
  })
