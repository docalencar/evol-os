import { z } from "zod"

import {
  ACTIVITY_ACTOR_TYPES,
  ACTIVITY_VISIBILITIES,
} from "../types/activity"

const optionalUuidSchema = z
  .string()
  .uuid()
  .nullable()
  .optional()

const optionalTextSchema = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()

export const recordActivitySchema = z
  .object({
    companyId: z.string().uuid(),

    activityType: z
      .string()
      .trim()
      .min(1)
      .max(160),

    idempotencyKey: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .optional(),

    module: z
      .string()
      .trim()
      .min(1)
      .max(80),

    title: z
      .string()
      .trim()
      .min(1)
      .max(200),

    description: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional(),

    actorType: z
      .enum(ACTIVITY_ACTOR_TYPES)
      .default("user"),

    actorId: optionalUuidSchema,

    entityType: optionalTextSchema,
    entityId: optionalUuidSchema,

    subjectType: optionalTextSchema,
    subjectId: optionalUuidSchema,

    visibility: z
      .enum(ACTIVITY_VISIBILITIES)
      .default("company"),

    metadata: z
      .record(z.string(), z.unknown())
      .default({}),

    occurredAt: z
      .coerce
      .date()
      .optional(),
  })
  .superRefine((input, context) => {
    const hasEntityType = Boolean(input.entityType)
    const hasEntityId = Boolean(input.entityId)

    if (hasEntityType !== hasEntityId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entityId"],
        message:
          "Tipo e identificador da entidade devem ser informados juntos.",
      })
    }

    const hasSubjectType = Boolean(input.subjectType)
    const hasSubjectId = Boolean(input.subjectId)

    if (hasSubjectType !== hasSubjectId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subjectId"],
        message:
          "Tipo e identificador do sujeito devem ser informados juntos.",
      })
    }
  })

export type RecordActivityInput =
  z.input<typeof recordActivitySchema>

export type ValidatedRecordActivityInput =
  z.output<typeof recordActivitySchema>
