import "server-only"

import {
  createServerDatabase,
} from "@/lib/database/server-database"

type NotificationCommandScope = {
  companyId: string
  recipientId: string
}

type NotificationCommandTarget =
  NotificationCommandScope & {
    notificationId: string
  }

export async function createNotificationCommandRepository() {
  const supabase =
    await createServerDatabase()

  return {
    async markAsRead({
      companyId,
      recipientId,
      notificationId,
    }: NotificationCommandTarget) {
      const readAt =
        new Date().toISOString()

      return supabase
        .from("notifications")
        .update({
          status: "read",
          read_at: readAt,
        })
        .eq("id", notificationId)
        .eq("company_id", companyId)
        .eq("recipient_id", recipientId)
        .neq("status", "archived")
        .is("archived_at", null)
        .select("id")
        .maybeSingle()
    },

    async markAllAsRead({
      companyId,
      recipientId,
    }: NotificationCommandScope) {
      const readAt =
        new Date().toISOString()

      return supabase
        .from("notifications")
        .update({
          status: "read",
          read_at: readAt,
        })
        .eq("company_id", companyId)
        .eq("recipient_id", recipientId)
        .eq("status", "unread")
        .is("read_at", null)
        .is("archived_at", null)
        .select("id")
    },

    async archive({
      companyId,
      recipientId,
      notificationId,
    }: NotificationCommandTarget) {
      const archivedAt =
        new Date().toISOString()

      return supabase
        .from("notifications")
        .update({
          status: "archived",
          archived_at: archivedAt,
        })
        .eq("id", notificationId)
        .eq("company_id", companyId)
        .eq("recipient_id", recipientId)
        .neq("status", "archived")
        .is("archived_at", null)
        .select("id")
        .maybeSingle()
    },

    async delete({
      companyId,
      recipientId,
      notificationId,
    }: NotificationCommandTarget) {
      return supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("company_id", companyId)
        .eq("recipient_id", recipientId)
        .select("id")
        .maybeSingle()
    },
  }
}
