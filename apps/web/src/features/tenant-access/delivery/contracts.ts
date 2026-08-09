import type { TenantMembershipRole } from "../application/contracts"

export type TenantInvitationDeliveryRequest = Readonly<{
  destinationEmail: string
  invitationUrl: string
  companyName: string
  inviterName?: string
  intendedRole?: TenantMembershipRole
  expiresAt: string
  invitationId: string
  generation: number
  correlationId: string
}>

export type TenantInvitationDeliveryFailureCategory =
  | "timeout"
  | "network"
  | "rate_limited"
  | "provider_unavailable"
  | "invalid_recipient"
  | "sender_not_verified"
  | "authentication"
  | "malformed_request"
  | "provider_rejected"
  | "unrecognized_response"

export type TenantInvitationDeliveryResult =
  | Readonly<{
      outcome: "accepted"
      providerMessageId?: string
    }>
  | Readonly<{
      outcome: "transient_failure"
      category: TenantInvitationDeliveryFailureCategory
      retryAfterMs?: number
    }>
  | Readonly<{
      outcome: "permanent_failure"
      category: TenantInvitationDeliveryFailureCategory
    }>
  | Readonly<{
      outcome: "unknown"
      category: TenantInvitationDeliveryFailureCategory
    }>
  | Readonly<{
      outcome: "configuration_failure"
      category: TenantInvitationDeliveryFailureCategory
    }>
