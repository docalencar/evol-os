import "server-only"

import type {
  TenantInvitationDeliveryRequest,
  TenantInvitationDeliveryResult,
} from "../contracts"
import type { TenantInvitationDelivery } from "../ports"
import { recordInvitationCapture } from "./dev-invitation-capture-store"

// TEMPORARY — MVP-PR1 Phase 6 real acceptance smoke ONLY.
// Dev-only "mailcatcher" transport: records the invitation URL in memory and
// reports an accepted delivery WITHOUT calling any email provider. It never
// persists the URL, never logs it, and introduces no new authority path — the
// real Issue orchestration/RPC and the real acceptance flow are unchanged.
// Remove after the smoke (see ./README.md).
class DevInvitationCaptureDelivery implements TenantInvitationDelivery {
  async send(
    request: TenantInvitationDeliveryRequest,
  ): Promise<TenantInvitationDeliveryResult> {
    recordInvitationCapture(request.invitationUrl, request.destinationEmail)
    return { outcome: "accepted", providerMessageId: "dev-capture" }
  }
}

export function createDevInvitationCaptureDelivery(): TenantInvitationDelivery {
  return new DevInvitationCaptureDelivery()
}
