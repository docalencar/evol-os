"use server"

import type { AcceptCompanyMemberInvitationResult } from "../orchestration/accept-company-member-invitation"
import { acceptCompanyMemberInvitationAction } from "./accept-company-member-invitation-action"

// Thin `useActionState` adapter for the acceptance button. The raw token is
// bound server-side by the invite Server Component (Next encrypts bound action
// arguments), so it never reaches the client as plaintext. The client-supplied
// previous state and FormData carry NO authority and are ignored — the only
// material input is the server-bound token. Delegates to the existing Action;
// no new RPC, Application Service, or authority surface is introduced.
export async function acceptInvitationFormAction(
  rawToken: string,
  _previousState: unknown,
  _formData: FormData,
): Promise<AcceptCompanyMemberInvitationResult> {
  void _previousState
  void _formData
  return acceptCompanyMemberInvitationAction({ rawToken })
}
