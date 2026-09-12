import "server-only"

import { z } from "zod"

import { createServerDatabase } from "@/lib/database/server-database"

/**
 * The only human write path for Assessment Feedback.
 *
 * Every method calls one purpose-bound trusted function. Nothing here supplies a
 * company, an actor, a sender, a receiver, a type, a status, a visibility or a
 * title: the database derives all of them from `auth.uid()` and the selected
 * row. The adapter's whole job is to pass a selector and validated text, and to
 * translate the boundary's SQLSTATE contract into typed domain errors.
 */

/**
 * Error classes the UI is allowed to distinguish.
 *
 * `unavailable` is deliberately one class for four situations — foreign,
 * cross-tenant, ineligible and nonexistent selectors — because telling them
 * apart would tell the caller whether a row they may not see exists. The
 * boundary already collapses them into a single SQLSTATE; this preserves that.
 *
 * `invalid_transition` and `invalid_content` stay distinguishable because a
 * caller only reaches them after the boundary has already authorized them, so
 * they reveal nothing the caller was not entitled to know.
 */
export type TrustedFeedbackMutationErrorCode =
  | "authentication_required"
  | "unavailable"
  | "invalid_content"
  | "invalid_transition"
  | "unknown"

export class TrustedFeedbackMutationError extends Error {
  constructor(readonly code: TrustedFeedbackMutationErrorCode) {
    super("Não foi possível concluir a operação de feedback.")
    this.name = "TrustedFeedbackMutationError"
  }
}

/**
 * SQLSTATE is the contract. The PostgREST message, the constraint name and the
 * details are never read and never propagated — they can name a row the caller
 * may not know exists.
 */
function translate(sqlState: string | undefined): TrustedFeedbackMutationError {
  switch (sqlState) {
    case "42501":
      return new TrustedFeedbackMutationError("authentication_required")
    case "P0002":
      return new TrustedFeedbackMutationError("unavailable")
    case "22023":
      return new TrustedFeedbackMutationError("invalid_content")
    case "55000":
      return new TrustedFeedbackMutationError("invalid_transition")
    default:
      return new TrustedFeedbackMutationError("unknown")
  }
}

/**
 * Discriminated on `status`, so a shape the boundary cannot produce — a
 * `created` without its message id, an `already_closed` carrying one — fails
 * parsing instead of reaching a caller as `undefined`.
 */
const threadOnly = <Status extends string>(status: Status) =>
  z.object({
    status: z.literal(status),
    feedbackThreadId: z.string().uuid(),
  })

const threadAndMessage = <Status extends string>(status: Status) =>
  z.object({
    status: z.literal(status),
    feedbackThreadId: z.string().uuid(),
    feedbackMessageId: z.string().uuid(),
  })

const threadAndStatus = <Status extends string>(status: Status, threadStatus: string) =>
  z.object({
    status: z.literal(status),
    feedbackThreadId: z.string().uuid(),
    threadStatus: z.literal(threadStatus),
  })

const createResultSchema = z.discriminatedUnion("status", [
  threadAndMessage("created"),
  threadOnly("already_exists"),
])

const replyResultSchema = z.discriminatedUnion("status", [threadAndMessage("replied")])

const acknowledgeResultSchema = z.discriminatedUnion("status", [
  threadAndStatus("acknowledged", "acknowledged"),
  threadAndStatus("already_acknowledged", "acknowledged"),
])

const closeResultSchema = z.discriminatedUnion("status", [
  threadAndStatus("closed", "closed"),
  threadAndStatus("already_closed", "closed"),
])

const archiveResultSchema = z.discriminatedUnion("status", [
  threadAndStatus("archived", "archived"),
  threadAndStatus("already_archived", "archived"),
])

export type CreateAssessmentFeedbackResult = z.infer<typeof createResultSchema>
export type ReplyFeedbackResult = z.infer<typeof replyResultSchema>
export type AcknowledgeFeedbackResult = z.infer<typeof acknowledgeResultSchema>
export type CloseFeedbackResult = z.infer<typeof closeResultSchema>
export type ArchiveFeedbackResult = z.infer<typeof archiveResultSchema>

async function callBoundary<Result>(
  name: string,
  parameters: Readonly<Record<string, string>>,
  schema: z.ZodType<Result>
): Promise<Result> {
  const database = await createServerDatabase()
  const { data, error } = await database.rpc(name, parameters)

  if (error) {
    throw translate(error.code)
  }

  const parsed = schema.safeParse(data)

  if (!parsed.success) {
    // A result the contract cannot produce is a failure, never a silent success.
    throw new TrustedFeedbackMutationError("unknown")
  }

  return parsed.data
}

export function createTrustedFeedbackMutationRepository() {
  return {
    create(
      assessmentResponseId: string,
      initialMessage: string
    ): Promise<CreateAssessmentFeedbackResult> {
      return callBoundary(
        "create_assessment_feedback_v1",
        {
          p_assessment_response_id: assessmentResponseId,
          p_initial_message: initialMessage,
        },
        createResultSchema
      )
    },

    reply(threadId: string, content: string): Promise<ReplyFeedbackResult> {
      return callBoundary(
        "reply_feedback_v1",
        { p_thread_id: threadId, p_content: content },
        replyResultSchema
      )
    },

    acknowledge(threadId: string): Promise<AcknowledgeFeedbackResult> {
      return callBoundary(
        "acknowledge_feedback_v1",
        { p_thread_id: threadId },
        acknowledgeResultSchema
      )
    },

    close(threadId: string): Promise<CloseFeedbackResult> {
      return callBoundary(
        "close_feedback_v1",
        { p_thread_id: threadId },
        closeResultSchema
      )
    },

    archive(threadId: string): Promise<ArchiveFeedbackResult> {
      return callBoundary(
        "archive_feedback_v1",
        { p_thread_id: threadId },
        archiveResultSchema
      )
    },
  }
}
