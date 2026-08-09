import "server-only"

import type {
  TenantInvitationDeliveryRequest,
  TenantInvitationDeliveryResult,
} from "../contracts"
import type { TenantInvitationDelivery } from "../ports"

export class FakeTenantInvitationDelivery implements TenantInvitationDelivery {
  private readonly capturedRequests: TenantInvitationDeliveryRequest[] = []

  constructor(
    private result: TenantInvitationDeliveryResult = { outcome: "accepted" },
  ) {}

  get requests(): readonly TenantInvitationDeliveryRequest[] {
    return this.capturedRequests
  }

  setResult(result: TenantInvitationDeliveryResult): void {
    this.result = result
  }

  async send(
    request: TenantInvitationDeliveryRequest,
  ): Promise<TenantInvitationDeliveryResult> {
    this.capturedRequests.push(request)
    return this.result
  }
}
