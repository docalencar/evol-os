import { z } from "zod"

import {
  ATTENTION_PRIORITIES,
  ATTENTION_REASON_TYPES,
  type AttentionItem,
} from "../types/attention-item"

/**
 * The minimum surface of the trusted database client this adapter needs. Keeping
 * it structural is what lets the mapping and the failure semantics be proven
 * without a server runtime, following the same adapter/factory split the
 * Planning repositories use.
 */
export type LeadershipAttentionDatabase = {
  rpc(
    name: string,
    parameters: Record<string, unknown>
  ): Promise<{ data: unknown; error: { message: string } | null }>
}

/**
 * Mirrors `get_manager_leadership_attention_v1` (0140) exactly. The queue
 * projection carries identities, canonical statuses, due dates and versions
 * only — never Assessment answers or scores, Feedback message content or
 * Development review text.
 */
const leadershipAttentionRowSchema = z.object({
  subject_id: z.string().uuid(),
  subject_name: z.string().min(1),
  subject_status: z.enum(["active", "on_leave"]),
  reason: z.enum(ATTENTION_REASON_TYPES),
  priority: z.enum(ATTENTION_PRIORITIES),
  source_type: z.enum([
    "assessment_response",
    "development_plan",
    "development_subject",
  ]),
  source_id: z.string().uuid(),
  source_status: z.string().min(1),
  due_date: z.string().nullable(),
  source_version: z.number().int().nullable(),
  source_updated_at: z.string().nullable(),
})

function mapAttentionItem(
  row: z.infer<typeof leadershipAttentionRowSchema>
): AttentionItem {
  return {
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    subjectStatus: row.subject_status,
    reason: row.reason,
    priority: row.priority,
    sourceType: row.source_type,
    sourceId: row.source_id,
    sourceStatus: row.source_status,
    dueDate: row.due_date,
    sourceVersion: row.source_version,
    sourceUpdatedAt: row.source_updated_at,
  }
}

export function createLeadershipAttentionRepositoryAdapter(
  database: LeadershipAttentionDatabase
) {
  return {
    async findForCurrentManager(companyId: string): Promise<AttentionItem[]> {
      const { data, error } = await database.rpc(
        "get_manager_leadership_attention_v1",
        { p_company_id: companyId }
      )

      // A boundary failure is NOT an empty queue. Throwing here is what lets the
      // route's error boundary render, instead of the surface quietly claiming
      // the manager has nothing to act on.
      if (error) {
        throw new Error(`LEADERSHIP_ATTENTION_READ_FAILED: ${error.message}`)
      }

      const parsed = z.array(leadershipAttentionRowSchema).safeParse(data)

      if (!parsed.success) {
        throw new Error("LEADERSHIP_ATTENTION_INVALID_READBACK")
      }

      // Order is the boundary's, not ours: 0140 already orders by priority,
      // due date nulls last, reason, subject name and subject id. Re-sorting
      // here would create a second definition of the contract's ordering.
      return parsed.data.map(mapAttentionItem)
    },
  }
}
