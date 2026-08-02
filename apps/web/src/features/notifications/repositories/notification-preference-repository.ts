import "server-only"

import type { NotificationPreferenceSnapshot } from "../domain/delivery-policy"
import { createNotificationTrustedDatabase } from "../server/notification-trusted-database"

type NotificationPreferenceRow = {
  user_id: string
  in_app_enabled: boolean
}

export async function createNotificationPreferenceRepository() {
  const supabase = createNotificationTrustedDatabase()

  return {
    async findByUsers(
      companyId: string,
      userIds: readonly string[]
    ): Promise<ReadonlyMap<string, NotificationPreferenceSnapshot>> {
      if (userIds.length === 0) {
        return new Map()
      }

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("user_id, in_app_enabled")
        .eq("company_id", companyId)
        .in("user_id", [...userIds])

      if (error) {
        throw new Error(
          `Não foi possível carregar preferências de notificação: ${error.message}`
        )
      }

      return new Map(
        ((data ?? []) as NotificationPreferenceRow[]).map((row) => [
          row.user_id,
          {
            userId: row.user_id,
            inAppEnabled: row.in_app_enabled,
          },
        ])
      )
    },
  }
}
