"use server"

import { issueCompanyMemberInvitationAction } from "@/features/tenant-access/actions"

import { findSmokeTargetPerson } from "./find-smoke-target-person"
import {
  describeSmokeIssueResult,
  type SmokeIssueState,
} from "./real-invitation-issue-result"

// TEMPORARY — MVP-PR1 Phase 6 real acceptance smoke ONLY.
// Dev-only, owner-gated trigger that invokes the REAL Issue Action. It creates
// NO authority: the double gate + owner and the target selection are revalidated
// here (never trusting the page), the tenant is server-derived, the target is
// resolved server-side from a fixed smoke email, and the role is the literal
// "employee". The browser supplies nothing but a form submit.
function captureGateOpen(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_INVITATION_CAPTURE_ENABLED === "true"
  )
}

export async function emitRealSmokeInvitationAction(
  _previousState: SmokeIssueState,
  _formData: FormData,
): Promise<SmokeIssueState> {
  void _previousState
  void _formData

  if (!captureGateOpen()) {
    return { status: "error", message: "Trigger indisponível." }
  }

  const target = await findSmokeTargetPerson()
  if (target.status === "unauthorized") {
    return { status: "error", message: "Sem permissão para emitir o convite." }
  }
  if (target.status === "not_prepared") {
    return { status: "error", message: "People de smoke ainda não preparada." }
  }
  if (target.status === "ambiguous") {
    return { status: "error", message: "Estado ambíguo: mais de uma People candidata." }
  }

  const result = await issueCompanyMemberInvitationAction({
    personId: target.personId,
    intendedRole: "employee",
  })

  return describeSmokeIssueResult(result)
}
