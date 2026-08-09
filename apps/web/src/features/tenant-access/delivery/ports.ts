import type {
  TenantInvitationDeliveryRequest,
  TenantInvitationDeliveryResult,
} from "./contracts"

export interface TenantInvitationDelivery {
  send(
    request: TenantInvitationDeliveryRequest,
  ): Promise<TenantInvitationDeliveryResult>
}
