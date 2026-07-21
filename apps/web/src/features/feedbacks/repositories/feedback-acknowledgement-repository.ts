import { createServerDatabase } from "@/lib/database/server-database"

import type {
  ValidatedCreateFeedbackAcknowledgementInput,
} from "../schemas/feedback-schema"
import type {
  FeedbackAcknowledgement,
} from "../types/feedback"

type FeedbackAcknowledgementRow = {
  id: string
  company_id: string
  thread_id: string
  employee_id: string
  acknowledged_at: string
  created_at: string
}

function mapFeedbackAcknowledgement(
  row: FeedbackAcknowledgementRow
): FeedbackAcknowledgement {
  return {
    id: row.id,
    companyId: row.company_id,
    threadId: row.thread_id,
    employeeId: row.employee_id,
    acknowledgedAt:
      new Date(row.acknowledged_at),
    createdAt: new Date(row.created_at),
  }
}

function mapRows(
  rows: FeedbackAcknowledgementRow[] | null
) {
  return (
    rows?.map((row) =>
      mapFeedbackAcknowledgement(row)
    ) ?? null
  )
}

export async function createFeedbackAcknowledgementRepository() {
  const supabase =
    await createServerDatabase()

  return {
    async findByThread(
      companyId: string,
      threadId: string
    ) {
      const { data, error } = await supabase
        .from(
          "feedback_acknowledgements"
        )
        .select("*")
        .eq("company_id", companyId)
        .eq("thread_id", threadId)
        .order("acknowledged_at", {
          ascending: true,
        })

      return {
        data: mapRows(
          data as
            | FeedbackAcknowledgementRow[]
            | null
        ),
        error,
      }
    },

    async findByEmployee(
      companyId: string,
      employeeId: string
    ) {
      const { data, error } = await supabase
        .from(
          "feedback_acknowledgements"
        )
        .select("*")
        .eq("company_id", companyId)
        .eq("employee_id", employeeId)
        .order("acknowledged_at", {
          ascending: false,
        })

      return {
        data: mapRows(
          data as
            | FeedbackAcknowledgementRow[]
            | null
        ),
        error,
      }
    },

    async create(
      input: ValidatedCreateFeedbackAcknowledgementInput
    ) {
      const { data, error } = await supabase
        .from(
          "feedback_acknowledgements"
        )
        .insert({
          company_id: input.companyId,
          thread_id: input.threadId,
          employee_id: input.employeeId,
        })
        .select("*")
        .single()

      return {
        data: data
          ? mapFeedbackAcknowledgement(
              data as FeedbackAcknowledgementRow
            )
          : null,
        error,
      }
    },

    async delete(
      companyId: string,
      acknowledgementId: string
    ) {
      return supabase
        .from(
          "feedback_acknowledgements"
        )
        .delete()
        .eq("company_id", companyId)
        .eq("id", acknowledgementId)
    },
  }
}
