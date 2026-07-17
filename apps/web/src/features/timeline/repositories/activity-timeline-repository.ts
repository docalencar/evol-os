import "server-only"

import {
  createServerDatabase,
} from "@/lib/database/server-database"

import type {
  ActivityTimelineFilters,
} from "../types/activity-timeline"

export type ActivityTimelineRepositoryInput =
  Omit<ActivityTimelineFilters, "limit"> & {
    limit: number
  }

export async function createActivityTimelineRepository() {
  const supabase = await createServerDatabase()

  return {
    async list(
      input: ActivityTimelineRepositoryInput
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
        .order("id", {
          ascending: false,
        })
        .limit(input.limit)

      if (input.actorType) {
        query = query.eq(
          "actor_type",
          input.actorType
        )
      }

      if (input.actorId) {
        query = query.eq(
          "actor_id",
          input.actorId
        )
      }

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

      if (input.visibility) {
        query = query.eq(
          "visibility",
          input.visibility
        )
      }

      if (input.from) {
        query = query.gte(
          "occurred_at",
          input.from.toISOString()
        )
      }

      if (input.to) {
        query = query.lte(
          "occurred_at",
          input.to.toISOString()
        )
      }

      if (input.cursor) {
        query = query.lt(
          "occurred_at",
          input.cursor
        )
      }

      return query
    },
  }
}
