import { z } from "zod"

const organizationEntitySchema = z.enum([
  "department",
  "team",
  "position",
  "employee",
])

const organizationSyncOperationSchema = z.enum([
  "create",
  "update",
  "move",
  "archive",
  "restore",
  "unchanged",
  "conflict",
])

const organizationExecutionItemSummarySchema =
  z.object({
    appliedItems: z.number().int().nonnegative(),
    skippedItems: z.number().int().nonnegative(),
    failedItems: z.number().int().nonnegative(),
  })

const organizationExecutionMessageSchema =
  z.object({
    itemId: z.string().min(1),
    entity: organizationEntitySchema,
    operation: organizationSyncOperationSchema,
    message: z.string().min(1),
  })


const organizationMutationReceiptSchema =
  z.object({
    itemId: z.string().min(1),
    entity: organizationEntitySchema,
    operation: organizationSyncOperationSchema,
    entityId: z.string().min(1),
  })

export const persistOrganizationTimelineSchema =
  z.object({
    companyId: z.string().uuid(),
    createdBy: z.string().uuid(),

    report: z.object({
      startedAt: z.date(),
      finishedAt: z.date(),

      duration: z.number().int().nonnegative(),

      appliedItems: z.number().int().nonnegative(),
      skippedItems: z.number().int().nonnegative(),
      failedItems: z.number().int().nonnegative(),

      entitySummary: z.object({
        department:
          organizationExecutionItemSummarySchema,
        team:
          organizationExecutionItemSummarySchema,
        position:
          organizationExecutionItemSummarySchema,
        employee:
          organizationExecutionItemSummarySchema,
      }),

      operationSummary: z.object({
        create:
          organizationExecutionItemSummarySchema,
        update:
          organizationExecutionItemSummarySchema,
        move:
          organizationExecutionItemSummarySchema,
        archive:
          organizationExecutionItemSummarySchema,
        restore:
          organizationExecutionItemSummarySchema,
        unchanged:
          organizationExecutionItemSummarySchema,
        conflict:
          organizationExecutionItemSummarySchema,
      }),

      warnings: z.array(
        organizationExecutionMessageSchema
      ),

      errors: z.array(
        organizationExecutionMessageSchema
      ),

      receipts: z.array(
        organizationMutationReceiptSchema
      ),
    }).refine(
      (report) =>
        report.finishedAt.getTime() >=
        report.startedAt.getTime(),
      {
        message:
          "O término da execução não pode ser anterior ao início.",
        path: ["finishedAt"],
      }
    ),
  })

export type PersistOrganizationTimelineInput =
  z.input<typeof persistOrganizationTimelineSchema>

export type ValidatedOrganizationTimelineInput =
  z.output<typeof persistOrganizationTimelineSchema>
