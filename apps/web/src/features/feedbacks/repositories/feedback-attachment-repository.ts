import { createServerDatabase } from "@/lib/database/server-database"

import type {
  ValidatedCreateFeedbackAttachmentInput,
} from "../schemas/feedback-schema"
import type {
  FeedbackAttachment,
} from "../types/feedback"

type FeedbackAttachmentRow = {
  id: string
  company_id: string
  thread_id: string
  message_id: string | null
  uploaded_by_employee_id: string | null
  created_by_user_id: string
  file_name: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}

function mapFeedbackAttachment(
  row: FeedbackAttachmentRow
): FeedbackAttachment {
  return {
    id: row.id,
    companyId: row.company_id,
    threadId: row.thread_id,
    messageId: row.message_id,
    uploadedByEmployeeId:
      row.uploaded_by_employee_id,
    createdByUserId:
      row.created_by_user_id,
    fileName: row.file_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: new Date(row.created_at),
  }
}

function mapRows(
  rows: FeedbackAttachmentRow[] | null
) {
  return (
    rows?.map((row) =>
      mapFeedbackAttachment(row)
    ) ?? null
  )
}

export async function createFeedbackAttachmentRepository() {
  const supabase =
    await createServerDatabase()

  return {
    async findByThread(
      companyId: string,
      threadId: string
    ) {
      const { data, error } = await supabase
        .from("feedback_attachments")
        .select("*")
        .eq("company_id", companyId)
        .eq("thread_id", threadId)
        .order("created_at", {
          ascending: true,
        })

      return {
        data: mapRows(
          data as
            | FeedbackAttachmentRow[]
            | null
        ),
        error,
      }
    },

    async findByMessage(
      companyId: string,
      messageId: string
    ) {
      const { data, error } = await supabase
        .from("feedback_attachments")
        .select("*")
        .eq("company_id", companyId)
        .eq("message_id", messageId)
        .order("created_at", {
          ascending: true,
        })

      return {
        data: mapRows(
          data as
            | FeedbackAttachmentRow[]
            | null
        ),
        error,
      }
    },

    async create(
      input: ValidatedCreateFeedbackAttachmentInput
    ) {
      const { data, error } = await supabase
        .from("feedback_attachments")
        .insert({
          company_id: input.companyId,
          thread_id: input.threadId,
          message_id:
            input.messageId ?? null,
          uploaded_by_employee_id:
            input.uploadedByEmployeeId ??
            null,
          created_by_user_id:
            input.createdByUserId,
          file_name: input.fileName,
          storage_path:
            input.storagePath,
          mime_type:
            input.mimeType ?? null,
          size_bytes:
            input.sizeBytes ?? null,
        })
        .select("*")
        .single()

      return {
        data: data
          ? mapFeedbackAttachment(
              data as FeedbackAttachmentRow
            )
          : null,
        error,
      }
    },

    async delete(
      companyId: string,
      attachmentId: string
    ) {
      return supabase
        .from("feedback_attachments")
        .delete()
        .eq("company_id", companyId)
        .eq("id", attachmentId)
    },
  }
}
