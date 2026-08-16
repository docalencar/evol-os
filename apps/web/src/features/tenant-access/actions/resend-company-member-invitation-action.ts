"use server"

import { randomUUID } from "node:crypto"

import { CurrentUserContextError } from "@/features/authorization"
import { loadPreferenceAwareCurrentUserContext } from "@/lib/supabase/supabase/preference-aware-current-user-context"
import { createClient } from "@/lib/supabase/supabase/server"

import { createServerTenantInvitationDelivery } from "../delivery/server"
import {
  resendCompanyMemberInvitation,
  type ResendCompanyMemberInvitationInput,
  type ResendCompanyMemberInvitationResult,
  type ResendInvitationTenantContextResult,
} from "../orchestration/resend-company-member-invitation"
import { createServerTenantAccessApplication } from "../server"
import { generateInvitationToken } from "../token"

async function loadResendInvitationTenantContext(): Promise<ResendInvitationTenantContextResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { status: "session_expired" }

  try {
    const currentUser = await loadPreferenceAwareCurrentUserContext(supabase, user)

    return {
      status: "resolved",
      companyId: currentUser.companyId,
      companyName: currentUser.companyName,
    }
  } catch (caught) {
    if (caught instanceof CurrentUserContextError) {
      if (caught.code === "tenant_selection_required") return { status: "tenant_selection_required" }
      if (caught.code === "unauthenticated") return { status: "session_expired" }
      if (caught.code === "membership_not_found") return { status: "no_membership" }
    }
    throw caught
  }
}

export async function resendCompanyMemberInvitationAction(
  input: ResendCompanyMemberInvitationInput,
): Promise<ResendCompanyMemberInvitationResult> {
  return resendCompanyMemberInvitation({
    loadTenantContext: loadResendInvitationTenantContext,
    createApplicationService: createServerTenantAccessApplication,
    createDelivery: createServerTenantInvitationDelivery,
    generateToken: generateInvitationToken,
    generateId: randomUUID,
    appBaseUrl: process.env.APP_BASE_URL,
  }, input)
}

export type {
  ResendCompanyMemberInvitationInput,
  ResendCompanyMemberInvitationResult,
}
