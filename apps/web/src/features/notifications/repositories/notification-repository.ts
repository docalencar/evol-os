import { createServerDatabase } from "@/lib/database/server-database"

import type {
  Notification,
  NotificationMetadata,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from "../types/notification"
import type {
  ValidatedCreateNotificationInput,
} from "../schemas/notification-schema"

type NotificationRow = {
  id: string
  company_id: string
  recipient_id: string
  activity_event_id: string | null
  type: NotificationType
  priority: NotificationPriority
  status: NotificationStatus
  title: string
  message: string
  entity_type: string | null
  entity_id: string | null
  metadata: NotificationMetadata | null
  read_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type FindNotificationsByRecipientInput = {
  companyId: string
  recipientId: string
  status?: NotificationStatus
  limit?: number
  offset?: number
}

function mapNotificationRow(
  row: NotificationRow
): Notification {
  return {
    id: row.id,
    companyId: row.company_id,
    recipientId: row.recipient_id,
    activityEventId:
      row.activity_event_id,
    type: row.type,
    priority: row.priority,
    status: row.status,
    title: row.title,
    message: row.message,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    readAt: row.read_at
      ? new Date(row.read_at)
      : null,
    archivedAt: row.archived_at
      ? new Date(row.archived_at)
      : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function createNotificationRepository() {
  const supabase =
    await createServerDatabase()

  return {
    async create(
      input: ValidatedCreateNotificationInput
    ) {
      const result = await supabase
        .from("notifications")
        .insert({
          company_id: input.companyId,
          recipient_id: input.recipientId,
          activity_event_id:
            input.activityEventId ?? null,
          type: input.type,
          priority: input.priority,
          status: "unread",
          title: input.title,
          message: input.message,
          entity_type:
            input.entityType ?? null,
          entity_id:
            input.entityId ?? null,
          metadata: input.metadata,
        })
        .select("*")
        .single()

      return {
        data: result.data
          ? mapNotificationRow(
              result.data as NotificationRow
            )
          : null,
        error: result.error,
      }
    },

    async findAllByRecipient(
      input: FindNotificationsByRecipientInput
    ) {
      const limit = Math.min(
        Math.max(input.limit ?? 20, 1),
        100
      )

      const offset = Math.max(
        input.offset ?? 0,
        0
      )

      let query = supabase
        .from("notifications")
        .select("*")
        .eq("company_id", input.companyId)
        .eq("recipient_id", input.recipientId)
        .order("created_at", {
          ascending: false,
        })
        .range(
          offset,
          offset + limit - 1
        )

      if (input.status) {
        query = query.eq(
          "status",
          input.status
        )
      }

      const result = await query

      return {
        data: result.data
          ? (
              result.data as NotificationRow[]
            ).map(mapNotificationRow)
          : [],
        error: result.error,
      }
    },

    async countUnread(
      companyId: string,
      recipientId: string
    ) {
      const result = await supabase
        .from("notifications")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("company_id", companyId)
        .eq("recipient_id", recipientId)
        .eq("status", "unread")

      return {
        count: result.count ?? 0,
        error: result.error,
      }
    },
  }
}
