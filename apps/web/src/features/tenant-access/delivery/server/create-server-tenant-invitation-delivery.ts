import "server-only"

import { Resend } from "resend"

import type { TenantInvitationDelivery } from "../ports"
import { createDevInvitationCaptureDelivery } from "../dev/dev-invitation-capture-delivery"
import { ResendTenantInvitationDelivery } from "../resend/resend-tenant-invitation-delivery"

export function createServerTenantInvitationDelivery(): TenantInvitationDelivery {
  // TEMPORARY (MVP-PR1 Phase 6 smoke) — dev-only mailcatcher transport, active
  // ONLY under a DOUBLE gate. Any other environment (production, or development
  // without the explicit flag) uses the real Resend transport unchanged.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_INVITATION_CAPTURE_ENABLED === "true"
  ) {
    return createDevInvitationCaptureDelivery()
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey || !from) {
    throw new Error("Tenant invitation delivery environment is not configured.")
  }

  const resend = new Resend(apiKey)
  return new ResendTenantInvitationDelivery(resend.emails, from)
}
