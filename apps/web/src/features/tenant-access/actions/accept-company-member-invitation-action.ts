"use server"

import { randomUUID } from "node:crypto"

import { createClient } from "@/lib/supabase/supabase/server"

import {
  acceptCompanyMemberInvitation,
  type AcceptCompanyMemberInvitationInput,
  type AcceptCompanyMemberInvitationResult,
  type AcceptInvitationAcceptorContextResult,
} from "../orchestration/accept-company-member-invitation"
import { createServerTenantAccessApplication } from "../server"
import { digestInvitationToken } from "../token"

// Acceptance only requires an authenticated session. The acceptor typically has
// no membership yet, so tenant/role/person/email are NOT derived here — the RPC
// resolves them from the invitation row itself.
async function loadAcceptorContext(): Promise<AcceptInvitationAcceptorContextResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return { status: "session_expired" }
  return { status: "authenticated" }
}

export async function acceptCompanyMemberInvitationAction(
  input: AcceptCompanyMemberInvitationInput,
): Promise<AcceptCompanyMemberInvitationResult> {
  return acceptCompanyMemberInvitation(
    {
      loadAcceptorContext,
      createApplicationService: createServerTenantAccessApplication,
      digestToken: digestInvitationToken,
      generateId: randomUUID,
    },
    input,
  )
}

export type {
  AcceptCompanyMemberInvitationInput,
  AcceptCompanyMemberInvitationResult,
}
