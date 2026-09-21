import { createServerDatabase } from "@/lib/database/server-database"

import type { DevelopmentReview } from "../types/development-review"

type ReviewRow = {
  review_id: string
  development_plan_id: string
  reviewer_id: string
  review_type: "periodic" | "final"
  reviewed_at: string
  summary: string
  next_step: string | null
  created_at: string
}

function mapReview(row: ReviewRow): DevelopmentReview {
  return {
    id: row.review_id,
    planId: row.development_plan_id,
    reviewerId: row.reviewer_id,
    type: row.review_type,
    reviewedAt: row.reviewed_at,
    summary: row.summary,
    nextStep: row.next_step,
    createdAt: row.created_at,
  }
}

export async function createDevelopmentReviewRepository() {
  const supabase = await createServerDatabase()

  async function findByPlan(companyId: string, planId: string) {
    const { data, error } = await supabase.rpc("get_authorized_development_reviews_v1", {
      p_company_id: companyId,
      p_plan_id: planId,
    })
    return { data: ((data ?? []) as ReviewRow[]).map(mapReview), error }
  }

  return {
    findByPlan,
    async record(
      companyId: string,
      planId: string,
      input: { type: "periodic" | "final"; summary: string; nextStep?: string; idempotencyKey: string }
    ) {
      const { error } = await supabase.rpc("record_development_review_v1", {
        p_plan_id: planId,
        p_type: input.type,
        p_summary: input.summary,
        p_next_step: input.nextStep ?? null,
        p_idempotency_key: input.idempotencyKey,
      })
      if (error) return { data: null, error }
      return findByPlan(companyId, planId)
    },
  }
}
