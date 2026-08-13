"use server"

import { readInvitationCapture } from "@/features/tenant-access/delivery/dev/dev-invitation-capture-store"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

// TEMPORARY — MVP-PR1 Phase 6 smoke ONLY. Owner-gated, dev-only reveal of the
// captured invitation link. Enforces the same double gate as the transport plus
// an owner/admin session check. Returns the link only on explicit human submit.
export type RevealCaptureState = Readonly<{
  status: "idle" | "empty" | "revealed"
  invitationUrl: string | null
}>

function captureGateOpen(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_INVITATION_CAPTURE_ENABLED === "true"
  )
}

export async function revealCapturedInvitationAction(
  _previousState: RevealCaptureState,
  _formData: FormData,
): Promise<RevealCaptureState> {
  void _previousState
  void _formData

  if (!captureGateOpen()) return { status: "empty", invitationUrl: null }

  const { currentUser } = await getCurrentCompanyContext()
  if (currentUser.role !== "owner" && currentUser.role !== "admin") {
    return { status: "empty", invitationUrl: null }
  }

  const capture = readInvitationCapture()
  if (!capture) return { status: "empty", invitationUrl: null }

  return { status: "revealed", invitationUrl: capture.invitationUrl }
}
