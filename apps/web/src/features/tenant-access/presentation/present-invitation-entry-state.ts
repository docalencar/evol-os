// Safe pre-auth state for the public invitation route. It carries no invitation
// data whatsoever — no company, person, invitation id, role, email, digest or
// raw token — only the coarse UI state derived from token format and session.
export type InvitationEntryState =
  | "invalid"
  | "authentication_required"
  | "authenticated_ready"

export function presentInvitationEntryState(input: {
  tokenFormatValid: boolean
  isAuthenticated: boolean
}): InvitationEntryState {
  if (!input.tokenFormatValid) return "invalid"
  return input.isAuthenticated ? "authenticated_ready" : "authentication_required"
}
