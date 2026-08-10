"use server"

import { randomUUID } from "node:crypto"

import { CurrentUserContextError, loadCurrentUserContext } from "@/features/authorization"
import { createClient } from "@/lib/supabase/supabase/server"

import { createServerTenantAccessApplication } from "../server"
import { generateInvitationToken } from "../token"
import { createServerTenantInvitationDelivery } from "../delivery/server"
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
    const currentUser = await loadCurrentUserContext(supabase, user)
    const [{ data: company }, { data: inviter }] = await Promise.all([
      supabase.from("companies").select("id, name").eq("id", currentUser.companyId).maybeSingle(),
      supabase.from("people").select("name").eq("company_id", currentUser.companyId).eq("user_id", user.id).maybeSingle(),
    ])
    if (!company) return { status: "no_membership" }

    return {
      status: "resolved",
      companyId: company.id,
      companyName: company.name,
      inviterName: inviter?.name ?? undefined,
      findPersonEmail: async personId => {
        const { data, error } = await supabase
          .from("people")
          .select("id, email")
          .eq("company_id", currentUser.companyId)
          .eq("id", personId)
          .maybeSingle()

        if (error || !data?.email) return null
        return data.email
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
