import { createServerDatabase } from "@/lib/database/server-database"

import type {
  ValidatedCreateFeedbackThreadInput,
  ValidatedUpdateFeedbackThreadInput,
} from "../schemas/feedback-schema"
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

function normalizeCreateInput(
  input: ValidatedCreateFeedbackThreadInput
) {
  return {
    company_id: input.companyId,
    sender_employee_id:
      input.senderEmployeeId,
    receiver_employee_id:
      input.receiverEmployeeId,
    created_by_user_id:
      input.createdByUserId,
    assessment_id:
      input.assessmentId ?? null,
    development_plan_id:
      input.developmentPlanId ?? null,
    competency_id:
      input.competencyId ?? null,
    type: input.type,
    status: input.status,
    priority: input.priority,
    visibility: input.visibility,
    title: input.title,
    requires_follow_up:
      input.requiresFollowUp,
    follow_up_at:
      input.followUpAt?.toISOString() ?? null,
    updated_at: new Date().toISOString(),
  }
}

function normalizeUpdateInput(
  input: ValidatedUpdateFeedbackThreadInput
) {
  const normalized: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.type !== undefined) {
    normalized.type = input.type
  }

  if (input.status !== undefined) {
    normalized.status = input.status
  }

  if (input.priority !== undefined) {
    normalized.priority = input.priority
  }

  if (input.visibility !== undefined) {
    normalized.visibility = input.visibility
  }

  if (input.title !== undefined) {
    normalized.title = input.title
  }

  if (input.assessmentId !== undefined) {
    normalized.assessment_id =
      input.assessmentId
  }

  if (
    input.developmentPlanId !== undefined
  ) {
    normalized.development_plan_id =
      input.developmentPlanId
  }

  if (input.competencyId !== undefined) {
    normalized.competency_id =
      input.competencyId
  }

  if (
    input.requiresFollowUp !== undefined
  ) {
    normalized.requires_follow_up =
      input.requiresFollowUp
  }

  if (input.followUpAt !== undefined) {
    normalized.follow_up_at =
      input.followUpAt?.toISOString() ?? null
  }

  if (
    input.acknowledgedAt !== undefined
  ) {
    normalized.acknowledged_at =
      input.acknowledgedAt?.toISOString() ??
      null
  }

  if (input.closedAt !== undefined) {
    normalized.closed_at =
      input.closedAt?.toISOString() ?? null
  }

  return normalized
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

    async create(
      input: ValidatedCreateFeedbackThreadInput
    ) {
      const { data, error } = await supabase
        .from("feedback_threads")
        .insert(
          normalizeCreateInput(input)
        )
        .select("*")
        .single()

      return {
        data: data
          ? mapFeedbackThread(
              data as FeedbackThreadRow
            )
          : null,
        error,
      }
    },

    async update(
      input: ValidatedUpdateFeedbackThreadInput
    ) {
      const { data, error } = await supabase
        .from("feedback_threads")
        .update(
          normalizeUpdateInput(input)
        )
        .eq("company_id", input.companyId)
        .eq("id", input.threadId)
        .select("*")
        .single()

      return {
        data: data
          ? mapFeedbackThread(
              data as FeedbackThreadRow
            )
          : null,
        error,
      }
    },

    async delete(
      companyId: string,
      threadId: string
    ) {
      return supabase
        .from("feedback_threads")
        .delete()
        .eq("company_id", companyId)
        .eq("id", threadId)
    },
  }
}
