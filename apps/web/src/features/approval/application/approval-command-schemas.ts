import { z } from "zod"

import {
  APPROVAL_ACTOR_TYPES,
  APPROVAL_DECISION_RULES,
  APPROVAL_PRINCIPAL_TYPES,
} from "../domain"

const identifierSchema = z.string().trim().min(1)
const uuidSchema = z.string().uuid()

const actorSchema = z.object({
  actorType: z.enum(APPROVAL_ACTOR_TYPES),
  actorId: identifierSchema.nullable(),
  personId: identifierSchema.nullable(),
  displayNameSnapshot: z.string().trim().min(1).nullable(),
})

const principalSchema = z.object({
  principalType: z.enum(APPROVAL_PRINCIPAL_TYPES),
  principalId: identifierSchema,
  displayNameSnapshot: z.string().trim().min(1).nullable(),
})

export const createApprovalRequestCommandSchema = z.object({
  id: uuidSchema,
  subject: z.object({
    companyId: uuidSchema,
    module: identifierSchema,
    entityType: identifierSchema,
    entityId: identifierSchema,
    entityVersion: identifierSchema,
    snapshotFingerprint: identifierSchema.nullable(),
  }),
  requester: actorSchema,
  context: z.object({
    schemaVersion: identifierSchema,
    summary: identifierSchema,
    metadata: z.record(z.string(), z.json()),
  }),
  planSnapshot: z.object({
    policyId: identifierSchema.nullable(),
    policyVersion: identifierSchema.nullable(),
    stages: z.array(
      z.object({
        stageId: uuidSchema,
        sequence: z.number().int().positive(),
        name: identifierSchema,
        decisionRule: z.enum(APPROVAL_DECISION_RULES),
        assignments: z.array(
          z.object({
            assignmentId: uuidSchema,
            principal: principalSchema,
          })
        ).min(1),
      })
    ).min(1),
  }),
  requestedAt: z.date(),
  expiresAt: z.date().nullable().optional(),
  idempotencyKey: identifierSchema,
  correlationId: identifierSchema.nullable().optional(),
  supersedesRequestId: uuidSchema.nullable().optional(),
})

const existingRequestCommandSchema = z.object({
  companyId: uuidSchema,
  approvalRequestId: uuidSchema,
  expectedVersion: z.number().int().positive(),
  actor: actorSchema,
  occurredAt: z.date(),
})

const decisionCommandSchema = existingRequestCommandSchema.extend({
  decisionId: uuidSchema,
  assignmentId: uuidSchema,
  subjectVersion: identifierSchema,
  idempotencyKey: identifierSchema,
})

export const approveRequestCommandSchema =
  decisionCommandSchema

export const rejectRequestCommandSchema =
  decisionCommandSchema.extend({
    comment: identifierSchema,
  })

export const withdrawRequestCommandSchema =
  existingRequestCommandSchema.extend({
    reason: identifierSchema,
  })

export const cancelRequestCommandSchema =
  existingRequestCommandSchema.extend({
    reason: identifierSchema,
  })

export const expireRequestCommandSchema =
  existingRequestCommandSchema
