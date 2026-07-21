import { z } from "zod"

import {
  JOB_OPENING_PRIORITIES,
  JOB_OPENING_REASONS,
} from "../types/job-opening"

const requiredIdSchema = (
  message: string
) =>
  z
    .string()
    .nullable()
    .refine((value) => value !== null, {
      message,
    })

export const jobOpeningWizardSchema = z.object({
  openingReason: z
    .enum(JOB_OPENING_REASONS)
    .nullable()
    .refine((value) => value !== null, {
      message: "Selecione o motivo da vaga.",
    }),
  departmentId: requiredIdSchema(
    "Selecione o departamento."
  ),
  positionId: requiredIdSchema(
    "Selecione o cargo."
  ),
  requestingManagerId: requiredIdSchema(
    "Selecione o gestor responsável."
  ),
  recruiterId: requiredIdSchema(
    "Selecione o recruiter."
  ),
  approverId: requiredIdSchema(
    "Selecione o aprovador."
  ),
  priority: z
    .enum(JOB_OPENING_PRIORITIES)
    .nullable()
    .refine((value) => value !== null, {
      message: "Selecione a prioridade.",
    }),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  targetHireDate: z.string().nullable(),
  notes: z.string().nullable(),
})
