import "server-only"

// Structural format of a raw invitation token: 32 random bytes encoded as
// unpadded base64url (43 chars). This is a presentation-level, server-side gate
// for the public invite route. The acceptance orchestration re-validates the
// same format and remains the final authority at accept time.
export const RAW_INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function isRawInvitationTokenFormatValid(rawToken: string): boolean {
  return RAW_INVITATION_TOKEN_PATTERN.test(rawToken)
}
