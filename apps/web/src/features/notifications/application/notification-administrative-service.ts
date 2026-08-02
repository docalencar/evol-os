import type { CurrentUserContext } from "@/features/authorization"

import { requireNotificationAdministrativeAccess } from "./notification-authorization"

const REASON_CODE_PATTERN = /^[a-z][a-z0-9_]{2,79}$/

export type NotificationDeliveryMetadata = Readonly<{
  delivery_id: string
  event_id: string
  producer_key: string
  event_key: string
  status: string
  channel: string
  attempt_count: number
  last_error_code: string | null
  created_at: string
  updated_at: string
  delivered_at: string | null
  cancelled_at: string | null
}>

export interface NotificationAdministrativeGateway {
  inspect(companyId: string, deliveryId: string, reasonCode: string):
    Promise<NotificationDeliveryMetadata>
  cancel(companyId: string, deliveryId: string, reasonCode: string):
    Promise<boolean>
  reprocess(companyId: string, deliveryId: string, reasonCode: string):
    Promise<boolean>
  resend(companyId: string, deliveryId: string, reasonCode: string):
    Promise<boolean>
}

export class NotificationAdministrativeService {
  constructor(
    private readonly actor: CurrentUserContext,
    private readonly gateway: NotificationAdministrativeGateway
  ) {}

  private authorize(companyId: string, reasonCode: string): void {
    requireNotificationAdministrativeAccess(this.actor, companyId)
    if (!REASON_CODE_PATTERN.test(reasonCode)) {
      throw new Error("O motivo administrativo da operação é inválido.")
    }
  }

  inspect(
    companyId: string,
    deliveryId: string,
    reasonCode: string
  ): Promise<NotificationDeliveryMetadata> {
    this.authorize(companyId, reasonCode)
    return this.gateway.inspect(companyId, deliveryId, reasonCode)
  }

  cancel(companyId: string, deliveryId: string, reasonCode: string):
  Promise<boolean> {
    this.authorize(companyId, reasonCode)
    return this.gateway.cancel(companyId, deliveryId, reasonCode)
  }

  reprocess(companyId: string, deliveryId: string, reasonCode: string):
  Promise<boolean> {
    this.authorize(companyId, reasonCode)
    return this.gateway.reprocess(companyId, deliveryId, reasonCode)
  }

  resend(companyId: string, deliveryId: string, reasonCode: string):
  Promise<boolean> {
    this.authorize(companyId, reasonCode)
    return this.gateway.resend(companyId, deliveryId, reasonCode)
  }
}
