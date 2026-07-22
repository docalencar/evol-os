import "server-only"

import {
  createServerDatabase,
} from "@/lib/database/server-database"

import type {
  ValidatedRecordActivityInput,
} from "../schemas/activity-schema"

export type ListActivitiesRepositoryInput = {
  companyId: string
  limit: number
  module?: string
  activityType?: string
  entityType?: string
  entityId?: string
  subjectType?: string
  subjectId?: string
}

export async function createActivityRepository() {
  const supabase = await createServerDatabase()

  return {
    async create(
      input: ValidatedRecordActivityInput
    ) {
      const result = await supabase
        .from("activity_events")
        .insert({
          company_id: input.companyId,
          activity_type: input.activityType,
          idempotency_key: input.idempotencyKey ?? null,
          module: input.module,
          title: input.title,
          description: input.description ?? null,
          actor_type: input.actorType,
          actor_id: input.actorId ?? null,
          entity_type: input.entityType ?? null,
          entity_id: input.entityId ?? null,
          subject_type: input.subjectType ?? null,
          subject_id: input.subjectId ?? null,
          visibility: input.visibility,
          metadata: input.metadata,
          occurred_at:
            input.occurredAt?.toISOString() ??
            new Date().toISOString(),
        })
        .select(`
          id,
          company_id,
          activity_type,
          module,
          title,
          description,
          actor_type,
          actor_id,
          entity_type,
          entity_id,
          subject_type,
          subject_id,
          visibility,
          metadata,
          occurred_at,
          created_at
        `)
        .single()

      if (
        result.error?.code !== "23505" ||
        !input.idempotencyKey
      ) {
        return result
      }

      return supabase
        .from("activity_events")
        .select(`
          id,
          company_id,
          activity_type,
          module,
          title,
          description,
          actor_type,
          actor_id,
          entity_type,
          entity_id,
          subject_type,
          subject_id,
          visibility,
          metadata,
          occurred_at,
          created_at
        `)
        .eq("company_id", input.companyId)
        .eq("idempotency_key", input.idempotencyKey)
        .single()
    },

    async list(
      input: ListActivitiesRepositoryInput
    ) {
      let query = supabase
        .from("activity_events")
        .select(`
          id,
          company_id,
          activity_type,
          module,
          title,
          description,
          actor_type,
          actor_id,
          entity_type,
          entity_id,
          subject_type,
          subject_id,
          visibility,
          metadata,
          occurred_at,
          created_at
        `)
        .eq("company_id", input.companyId)
        .order("occurred_at", {
          ascending: false,
        })
        .limit(input.limit)

      if (input.module) {
        query = query.eq(
          "module",
          input.module
        )
      }

      if (input.activityType) {
        query = query.eq(
          "activity_type",
          input.activityType
        )
      }

      if (input.entityType) {
        query = query.eq(
          "entity_type",
          input.entityType
        )
      }

      if (input.entityId) {
        query = query.eq(
          "entity_id",
          input.entityId
        )
      }

      if (input.subjectType) {
        query = query.eq(
          "subject_type",
          input.subjectType
        )
      }

      if (input.subjectId) {
        query = query.eq(
          "subject_id",
          input.subjectId
        )
      }

      return query
    },
  }
}
