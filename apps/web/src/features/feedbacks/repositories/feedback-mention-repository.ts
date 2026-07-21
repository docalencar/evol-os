import { createServerDatabase } from "@/lib/database/server-database"

import type {
  ValidatedCreateFeedbackMentionInput,
} from "../schemas/feedback-schema"
import type {
  FeedbackMention,
} from "../types/feedback"

type FeedbackMentionRow = {
  id: string
  company_id: string
  thread_id: string
  message_id: string
  mentioned_employee_id: string
  created_at: string
}

function mapFeedbackMention(
  row: FeedbackMentionRow
): FeedbackMention {
  return {
    id: row.id,
    companyId: row.company_id,
    threadId: row.thread_id,
    messageId: row.message_id,
    mentionedEmployeeId:
      row.mentioned_employee_id,
    createdAt: new Date(row.created_at),
  }
}

function mapRows(
  rows: FeedbackMentionRow[] | null
) {
  return (
    rows?.map((row) =>
      mapFeedbackMention(row)
    ) ?? null
  )
}

export async function createFeedbackMentionRepository() {
  const supabase =
    await createServerDatabase()

  return {
    async findByThread(
      companyId: string,
      threadId: string
    ) {
      const { data, error } = await supabase
        .from("feedback_mentions")
        .select("*")
        .eq("company_id", companyId)
        .eq("thread_id", threadId)
        .order("created_at", {
          ascending: true,
        })

      return {
        data: mapRows(
          data as FeedbackMentionRow[] | null
        ),
        error,
      }
    },

    async findByMessage(
      companyId: string,
      messageId: string
    ) {
      const { data, error } = await supabase
        .from("feedback_mentions")
        .select("*")
        .eq("company_id", companyId)
        .eq("message_id", messageId)
        .order("created_at", {
          ascending: true,
        })

      return {
        data: mapRows(
          data as FeedbackMentionRow[] | null
        ),
        error,
      }
    },

    async findByMentionedEmployee(
      companyId: string,
      employeeId: string
    ) {
      const { data, error } = await supabase
        .from("feedback_mentions")
        .select("*")
        .eq("company_id", companyId)
        .eq(
          "mentioned_employee_id",
          employeeId
        )
        .order("created_at", {
          ascending: false,
        })

      return {
        data: mapRows(
          data as FeedbackMentionRow[] | null
        ),
        error,
      }
    },

    async create(
      input: ValidatedCreateFeedbackMentionInput
    ) {
      const { data, error } = await supabase
        .from("feedback_mentions")
        .insert({
          company_id: input.companyId,
          thread_id: input.threadId,
          message_id: input.messageId,
          mentioned_employee_id:
            input.mentionedEmployeeId,
        })
        .select("*")
        .single()

      return {
        data: data
          ? mapFeedbackMention(
              data as FeedbackMentionRow
            )
          : null,
        error,
      }
    },

    async delete(
      companyId: string,
      mentionId: string
    ) {
      return supabase
        .from("feedback_mentions")
        .delete()
        .eq("company_id", companyId)
        .eq("id", mentionId)
    },
  }
}
