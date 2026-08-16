"use server"

import { randomUUID } from "node:crypto"

import { CurrentUserContextError } from "@/features/authorization"
import { loadPreferenceAwareCurrentUserContext } from "@/lib/supabase/supabase/preference-aware-current-user-context"
import { createClient } from "@/lib/supabase/supabase/server"

import { createServerTenantAccessApplication } from "../server"
import { generateInvitationToken } from "../token"
import { createServerTenantInvitationDelivery } from "../delivery/server"
import { loadTenantPersonInvitationContact } from "../queries/load-tenant-person-invitation-contact"
import {
  issueCompanyMemberInvitation,
  type IssueCompanyMemberInvitationInput,
  type IssueCompanyMemberInvitationResult,
  type IssueInvitationTenantContextResult,
} from "../orchestration/issue-company-member-invitation"

async function loadIssueInvitationTenantContext(): Promise<IssueInvitationTenantContextResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { status: "session_expired" }

  try {
    const currentUser = await loadPreferenceAwareCurrentUserContext(supabase, user)

    return {
      status: "resolved",
      companyId: currentUser.companyId,
      companyName: currentUser.companyName,
      findPersonEmail: async personId => {
        const contact = await loadTenantPersonInvitationContact(
          supabase,
          currentUser.companyId,
          personId,
        )
        return contact?.email ?? null
      },
    }
  } catch (caught) {
    if (caught instanceof CurrentUserContextError) {
      if (caught.code === "tenant_selection_required") {
        return { status: "tenant_selection_required" }
      }
      if (caught.code === "unauthenticated") return { status: "session_expired" }
      if (caught.code === "membership_not_found") return { status: "no_membership" }
    }
    throw caught
  }
}

export async function issueCompanyMemberInvitationAction(
  input: IssueCompanyMemberInvitationInput,
): Promise<IssueCompanyMemberInvitationResult> {
  return issueCompanyMemberInvitation(
    {
      loadTenantContext: loadIssueInvitationTenantContext,
      createApplicationService: createServerTenantAccessApplication,
      createDelivery: createServerTenantInvitationDelivery,
      generateToken: generateInvitationToken,
      generateId: randomUUID,
      appBaseUrl: process.env.APP_BASE_URL,
    },
    input,
  )
}

export type {
  IssueCompanyMemberInvitationInput,
  IssueCompanyMemberInvitationResult,
}
