import { createServerDatabase } from "@/lib/database/server-database"

import type {
  ValidatedCreateFeedbackMessageInput,
  ValidatedUpdateFeedbackMessageInput,
} from "../schemas/feedback-schema"
import type {
  FeedbackMessage,
  FeedbackMetadata,
} from "../types/feedback"

type FeedbackMessageRow = {
  id: string
  company_id: string
  thread_id: string
  author_employee_id: string | null
  created_by_user_id: string
  type: FeedbackMessage["type"]
  content: string
  metadata: FeedbackMetadata
  edited_at: string | null
  created_at: string
  updated_at: string
}

function mapFeedbackMessage(
  row: FeedbackMessageRow
): FeedbackMessage {
  return {
    id: row.id,
    companyId: row.company_id,
    threadId: row.thread_id,
    authorEmployeeId:
      row.author_employee_id,
    createdByUserId:
      row.created_by_user_id,
    type: row.type,
    content: row.content,
    metadata: row.metadata ?? {},
    editedAt: row.edited_at
      ? new Date(row.edited_at)
      : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function mapRows(
  rows: FeedbackMessageRow[] | null
) {
  return (
    rows?.map((row) =>
      mapFeedbackMessage(row)
    ) ?? null
  )
}

export async function createFeedbackMessageRepository() {
  const supabase =
    await createServerDatabase()

  return {
    async findByThread(
      companyId: string,
      threadId: string
    ) {
      const { data, error } = await supabase
        .from("feedback_messages")
        .select("*")
        .eq("company_id", companyId)
        .eq("thread_id", threadId)
        .order("created_at", {
          ascending: true,
        })

      return {
        data: mapRows(
          data as FeedbackMessageRow[] | null
        ),
        error,
      }
    },

    async findById(
      companyId: string,
      messageId: string
    ) {
      const { data, error } = await supabase
        .from("feedback_messages")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", messageId)
        .maybeSingle()

      return {
        data: data
          ? mapFeedbackMessage(
              data as FeedbackMessageRow
            )
          : null,
        error,
      }
    },

    async create(
      input: ValidatedCreateFeedbackMessageInput
    ) {
      const { data, error } = await supabase
        .from("feedback_messages")
        .insert({
          company_id: input.companyId,
          thread_id: input.threadId,
          author_employee_id:
            input.authorEmployeeId ?? null,
          created_by_user_id:
            input.createdByUserId,
          type: input.type,
          content: input.content,
          metadata: input.metadata,
          updated_at:
            new Date().toISOString(),
        })
        .select("*")
        .single()

      return {
        data: data
          ? mapFeedbackMessage(
              data as FeedbackMessageRow
            )
          : null,
        error,
      }
    },

    async update(
      input: ValidatedUpdateFeedbackMessageInput
    ) {
      const normalized: Record<
        string,
        unknown
      > = {
        content: input.content,
        edited_at: new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      }

      if (input.metadata !== undefined) {
        normalized.metadata =
          input.metadata
      }

      const { data, error } = await supabase
        .from("feedback_messages")
        .update(normalized)
        .eq("company_id", input.companyId)
        .eq("thread_id", input.threadId)
        .eq("id", input.messageId)
        .select("*")
        .single()

      return {
        data: data
          ? mapFeedbackMessage(
              data as FeedbackMessageRow
            )
          : null,
        error,
      }
    },

    async delete(
      companyId: string,
      threadId: string,
      messageId: string
    ) {
      return supabase
        .from("feedback_messages")
        .delete()
        .eq("company_id", companyId)
        .eq("thread_id", threadId)
        .eq("id", messageId)
    },
  }
}
