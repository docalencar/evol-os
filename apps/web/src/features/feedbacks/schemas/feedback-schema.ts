import {
  z,
} from "zod"

import {
  FEEDBACK_MESSAGE_TYPES,
  FEEDBACK_THREAD_PRIORITIES,
  FEEDBACK_THREAD_STATUSES,
  FEEDBACK_THREAD_TYPES,
  FEEDBACK_THREAD_VISIBILITIES,
} from "../constants/feedback-constants"

const optionalUuidSchema = z
  .string()
  .uuid()
  .nullable()
  .optional()

const optionalDateSchema = z
  .coerce
  .date()
  .nullable()
  .optional()

const feedbackMetadataValueSchema:
  z.ZodType<
    | string
    | number
    | boolean
    | null
    | unknown[]
    | {
        [key: string]: unknown
      }
  > = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(
      feedbackMetadataValueSchema
    ),
    z.record(
      z.string(),
      feedbackMetadataValueSchema
    ),
  ])
)

export const feedbackMetadataSchema =
  z.record(
    z.string(),
    feedbackMetadataValueSchema
  )

export const createFeedbackThreadSchema =
  z
    .object({
      companyId: z.string().uuid(),
      senderEmployeeId:
        z.string().uuid(),
      receiverEmployeeId:
        z.string().uuid(),
      createdByUserId:
        z.string().uuid(),
      assessmentId:
        optionalUuidSchema,
      developmentPlanId:
        optionalUuidSchema,
      competencyId:
        optionalUuidSchema,
      type: z
        .enum(FEEDBACK_THREAD_TYPES)
        .default("feedback"),
      status: z
        .enum(
          FEEDBACK_THREAD_STATUSES
        )
        .default("open"),
      priority: z
        .enum(
          FEEDBACK_THREAD_PRIORITIES
        )
        .default("normal"),
      visibility: z
        .enum(
          FEEDBACK_THREAD_VISIBILITIES
        )
        .default("participants"),
      title: z
        .string()
        .trim()
        .min(
          1,
          "O título é obrigatório."
        ),
      requiresFollowUp:
        z.boolean().default(false),
      followUpAt:
        optionalDateSchema,
    })
    .superRefine(
      (
        input,
        context
      ) => {
        if (
          input.senderEmployeeId ===
          input.receiverEmployeeId
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              "receiverEmployeeId",
            ],
            message:
              "O remetente e o destinatário devem ser pessoas diferentes.",
          })
        }

        if (
          !input.requiresFollowUp &&
          input.followUpAt
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              "followUpAt",
            ],
            message:
              "A data de acompanhamento exige que o acompanhamento esteja habilitado.",
          })
        }
      }
    )

export const updateFeedbackThreadSchema =
  z
    .object({
      companyId: z.string().uuid(),
      threadId: z.string().uuid(),
      type: z
        .enum(FEEDBACK_THREAD_TYPES)
        .optional(),
      status: z
        .enum(
          FEEDBACK_THREAD_STATUSES
        )
        .optional(),
      priority: z
        .enum(
          FEEDBACK_THREAD_PRIORITIES
        )
        .optional(),
      visibility: z
        .enum(
          FEEDBACK_THREAD_VISIBILITIES
        )
        .optional(),
      title: z
        .string()
        .trim()
        .min(
          1,
          "O título é obrigatório."
        )
        .optional(),
      assessmentId:
        optionalUuidSchema,
      developmentPlanId:
        optionalUuidSchema,
      competencyId:
        optionalUuidSchema,
      requiresFollowUp:
        z.boolean().optional(),
      followUpAt:
        optionalDateSchema,
      acknowledgedAt:
        optionalDateSchema,
      closedAt:
        optionalDateSchema,
    })
    .superRefine(
      (
        input,
        context
      ) => {
        if (
          input.requiresFollowUp ===
            false &&
          input.followUpAt
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              "followUpAt",
            ],
            message:
              "A data de acompanhamento exige que o acompanhamento esteja habilitado.",
          })
        }

        if (
          input.acknowledgedAt &&
          input.status &&
          ![
            "acknowledged",
            "closed",
            "archived",
          ].includes(input.status)
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              "acknowledgedAt",
            ],
            message:
              "A data de confirmação não é compatível com o status informado.",
          })
        }

        if (
          input.closedAt &&
          input.status &&
          ![
            "closed",
            "archived",
          ].includes(input.status)
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              "closedAt",
            ],
            message:
              "A data de encerramento não é compatível com o status informado.",
          })
        }
      }
    )

export const createFeedbackMessageSchema =
  z
    .object({
      companyId: z.string().uuid(),
      threadId: z.string().uuid(),
      authorEmployeeId:
        optionalUuidSchema,
      createdByUserId:
        z.string().uuid(),
      type: z
        .enum(FEEDBACK_MESSAGE_TYPES)
        .default("message"),
      content: z
        .string()
        .trim()
        .min(
          1,
          "O conteúdo da mensagem é obrigatório."
        ),
      metadata:
        feedbackMetadataSchema.default(
          {}
        ),
    })
    .superRefine(
      (
        input,
        context
      ) => {
        if (
          input.type !== "system" &&
          !input.authorEmployeeId
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              "authorEmployeeId",
            ],
            message:
              "O autor é obrigatório para mensagens que não sejam do sistema.",
          })
        }
      }
    )

export const updateFeedbackMessageSchema =
  z.object({
    companyId: z.string().uuid(),
    threadId: z.string().uuid(),
    messageId: z.string().uuid(),
    content: z
      .string()
      .trim()
      .min(
        1,
        "O conteúdo da mensagem é obrigatório."
      ),
    metadata:
      feedbackMetadataSchema.optional(),
  })

export const createFeedbackAcknowledgementSchema =
  z.object({
    companyId: z.string().uuid(),
    threadId: z.string().uuid(),
    employeeId: z.string().uuid(),
  })

export const createFeedbackAttachmentSchema =
  z.object({
    companyId: z.string().uuid(),
    threadId: z.string().uuid(),
    messageId:
      optionalUuidSchema,
    uploadedByEmployeeId:
      optionalUuidSchema,
    createdByUserId:
      z.string().uuid(),
    fileName: z
      .string()
      .trim()
      .min(
        1,
        "O nome do arquivo é obrigatório."
      ),
    storagePath: z
      .string()
      .trim()
      .min(
        1,
        "O caminho do arquivo é obrigatório."
      ),
    mimeType: z
      .string()
      .trim()
      .min(1)
      .nullable()
      .optional(),
    sizeBytes: z
      .number()
      .int()
      .nonnegative()
      .nullable()
      .optional(),
  })

export const createFeedbackMentionSchema =
  z.object({
    companyId: z.string().uuid(),
    threadId: z.string().uuid(),
    messageId: z.string().uuid(),
    mentionedEmployeeId:
      z.string().uuid(),
  })

export type CreateFeedbackThreadInput =
  z.input<
    typeof createFeedbackThreadSchema
  >

export type ValidatedCreateFeedbackThreadInput =
  z.output<
    typeof createFeedbackThreadSchema
  >

export type UpdateFeedbackThreadInput =
  z.input<
    typeof updateFeedbackThreadSchema
  >

export type ValidatedUpdateFeedbackThreadInput =
  z.output<
    typeof updateFeedbackThreadSchema
  >

export type CreateFeedbackMessageInput =
  z.input<
    typeof createFeedbackMessageSchema
  >

export type ValidatedCreateFeedbackMessageInput =
  z.output<
    typeof createFeedbackMessageSchema
  >

export type UpdateFeedbackMessageInput =
  z.input<
    typeof updateFeedbackMessageSchema
  >

export type ValidatedUpdateFeedbackMessageInput =
  z.output<
    typeof updateFeedbackMessageSchema
  >

export type CreateFeedbackAcknowledgementInput =
  z.input<
    typeof createFeedbackAcknowledgementSchema
  >

export type ValidatedCreateFeedbackAcknowledgementInput =
  z.output<
    typeof createFeedbackAcknowledgementSchema
  >

export type CreateFeedbackAttachmentInput =
  z.input<
    typeof createFeedbackAttachmentSchema
  >

export type ValidatedCreateFeedbackAttachmentInput =
  z.output<
    typeof createFeedbackAttachmentSchema
  >

export type CreateFeedbackMentionInput =
  z.input<
    typeof createFeedbackMentionSchema
  >

export type ValidatedCreateFeedbackMentionInput =
  z.output<
    typeof createFeedbackMentionSchema
  >
