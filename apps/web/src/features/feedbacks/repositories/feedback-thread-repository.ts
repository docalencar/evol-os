import { createServerDatabase } from "@/lib/database/server-database"

import type { FeedbackThread } from "../types/feedback"

type FeedbackThreadRow = {
  id: string
  company_id: string
  sender_employee_id: string
  receiver_employee_id: string
  created_by_user_id: string
  assessment_id: string | null
  development_plan_id: string | null
  competency_id: string | null
  type: FeedbackThread["type"]
  status: FeedbackThread["status"]
  priority: FeedbackThread["priority"]
  visibility: FeedbackThread["visibility"]
  title: string
  requires_follow_up: boolean
  follow_up_at: string | null
  acknowledged_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

function mapFeedbackThread(
  row: FeedbackThreadRow
): FeedbackThread {
  return {
    id: row.id,
    companyId: row.company_id,
    senderEmployeeId: row.sender_employee_id,
    receiverEmployeeId: row.receiver_employee_id,
    createdByUserId: row.created_by_user_id,
    assessmentId: row.assessment_id,
    developmentPlanId: row.development_plan_id,
    competencyId: row.competency_id,
    type: row.type,
    status: row.status,
    priority: row.priority,
    visibility: row.visibility,
    title: row.title,
    requiresFollowUp: row.requires_follow_up,
    followUpAt: row.follow_up_at
      ? new Date(row.follow_up_at)
      : null,
    acknowledgedAt: row.acknowledged_at
      ? new Date(row.acknowledged_at)
      : null,
    closedAt: row.closed_at
      ? new Date(row.closed_at)
      : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function mapRows(
  rows: FeedbackThreadRow[] | null
) {
  return (
    rows?.map((row) =>
      mapFeedbackThread(row)
    ) ?? null
  )
}

export async function createFeedbackThreadRepository() {
  const supabase =
    await createServerDatabase()

  return {
    async findAllByCompany(
      companyId: string
    ) {
      const { data, error } = await supabase
        .from("feedback_threads")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", {
          ascending: false,
        })

      return {
        data: mapRows(
          data as FeedbackThreadRow[] | null
        ),
        error,
      }
    },

    async findByEmployee(
      companyId: string,
      employeeId: string
    ) {
      const { data, error } = await supabase
        .from("feedback_threads")
        .select("*")
        .eq("company_id", companyId)
        .or(
          `sender_employee_id.eq.${employeeId},receiver_employee_id.eq.${employeeId}`
        )
        .order("created_at", {
          ascending: false,
        })

      return {
        data: mapRows(
          data as FeedbackThreadRow[] | null
        ),
        error,
      }
    },

    async findById(
      companyId: string,
      threadId: string
    ) {
      const { data, error } = await supabase
        .from("feedback_threads")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", threadId)
        .maybeSingle()

      return {
        data: data
          ? mapFeedbackThread(
              data as FeedbackThreadRow
            )
          : null,
        error,
      }
    },
  }
}
