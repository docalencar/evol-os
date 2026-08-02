import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import type {
  NotificationAdministrativeGateway,
  NotificationDeliveryMetadata,
} from "../application/notification-administrative-service"

export async function createNotificationAdministrativeRepository():
Promise<NotificationAdministrativeGateway> {
  const supabase = await createServerDatabase()

  return {
    async inspect(companyId, deliveryId, reasonCode) {
      const { data, error } = await supabase.rpc(
        "read_notification_delivery_metadata",
        {
          p_company_id: companyId,
          p_delivery_id: deliveryId,
          p_reason_code: reasonCode,
        }
      )
      if (error) {
        throw new Error(error.message)
      }
      return data as NotificationDeliveryMetadata
    },
    async cancel(companyId, deliveryId, reasonCode) {
      const { data, error } = await supabase.rpc(
        "cancel_notification_delivery",
        {
          p_company_id: companyId,
          p_delivery_id: deliveryId,
          p_reason_code: reasonCode,
        }
      )
      if (error) {
        throw new Error(error.message)
      }
      return data === true
    },
    async reprocess(companyId, deliveryId, reasonCode) {
      const { data, error } = await supabase.rpc(
        "reprocess_notification_delivery",
        {
          p_company_id: companyId,
          p_delivery_id: deliveryId,
          p_reason_code: reasonCode,
        }
      )
      if (error) {
        throw new Error(error.message)
      }
      return data === true
    },
    async resend(companyId, deliveryId, reasonCode) {
      const { data, error } = await supabase.rpc(
        "resend_notification_delivery",
        {
          p_company_id: companyId,
          p_delivery_id: deliveryId,
          p_reason_code: reasonCode,
        }
      )
      if (error) {
        throw new Error(error.message)
      }
      return data === true
    },
  }
}
