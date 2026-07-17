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
      return supabase
        .from("notifications")
        .update({
          read_at: new Date().toISOString(),
        })
        .eq("id", notificationId)
        .eq("company_id", companyId)
        .eq("recipient_id", recipientId)
        .is("archived_at", null)
        .select("id")
        .maybeSingle()
    },

    async markAllAsRead({
      companyId,
      recipientId,
    }: NotificationCommandScope) {
      return supabase
        .from("notifications")
        .update({
          read_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("recipient_id", recipientId)
        .is("read_at", null)
        .is("archived_at", null)
        .select("id")
    },

    async archive({
      companyId,
      recipientId,
      notificationId,
    }: NotificationCommandTarget) {
      return supabase
        .from("notifications")
        .update({
          archived_at: new Date().toISOString(),
        })
        .eq("id", notificationId)
        .eq("company_id", companyId)
        .eq("recipient_id", recipientId)
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
