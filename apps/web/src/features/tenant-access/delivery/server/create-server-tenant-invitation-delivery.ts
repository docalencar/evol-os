import "server-only"

import { Resend } from "resend"

import type { TenantInvitationDelivery } from "../ports"
import { ResendTenantInvitationDelivery } from "../resend/resend-tenant-invitation-delivery"

export function createServerTenantInvitationDelivery(): TenantInvitationDelivery {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey || !from) {
    throw new Error("Tenant invitation delivery environment is not configured.")
  }

  const resend = new Resend(apiKey)
  return new ResendTenantInvitationDelivery(resend.emails, from)
}
