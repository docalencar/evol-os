"use server"

import { randomUUID } from "node:crypto"

import { CurrentUserContextError } from "@/features/authorization"
import { loadPreferenceAwareCurrentUserContext } from "@/lib/supabase/supabase/preference-aware-current-user-context"
import { createClient } from "@/lib/supabase/supabase/server"

import {
  revokeCompanyMemberInvitation,
  type RevokeCompanyMemberInvitationInput,
  type RevokeCompanyMemberInvitationResult,
  type RevokeInvitationTenantContextResult,
} from "../orchestration/revoke-company-member-invitation"
import { createServerTenantAccessApplication } from "../server"

async function loadRevokeInvitationTenantContext(): Promise<RevokeInvitationTenantContextResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { status: "session_expired" }

  try {
    const currentUser = await loadPreferenceAwareCurrentUserContext(supabase, user)
    return { status: "resolved", companyId: currentUser.companyId }
  } catch (caught) {
    if (caught instanceof CurrentUserContextError) {
      if (caught.code === "tenant_selection_required") return { status: "tenant_selection_required" }
      if (caught.code === "unauthenticated") return { status: "session_expired" }
      if (caught.code === "membership_not_found") return { status: "no_membership" }
    }
    throw caught
  }
}

export async function revokeCompanyMemberInvitationAction(
  input: RevokeCompanyMemberInvitationInput,
): Promise<RevokeCompanyMemberInvitationResult> {
  return revokeCompanyMemberInvitation({
    loadTenantContext: loadRevokeInvitationTenantContext,
    createApplicationService: createServerTenantAccessApplication,
    generateId: randomUUID,
  }, input)
}

export type {
  RevokeCompanyMemberInvitationInput,
  RevokeCompanyMemberInvitationResult,
}
