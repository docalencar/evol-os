import { createServerDatabase } from "@/lib/database/server-database"

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
  }
}
