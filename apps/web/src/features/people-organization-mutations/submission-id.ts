// Client-safe helpers (no node:crypto) so both the create forms (client) and the
// create Server Actions (server) can share the submission-id contract.
//
// A submission id is the explicit identity of a create INTENT. It is a selector
// for idempotency only — never authority. The RPC still authorizes via
// auth.uid()/active membership and validates tenant references independently.

export const SUBMISSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidSubmissionId(value: unknown): value is string {
  return typeof value === "string" && SUBMISSION_ID_PATTERN.test(value)
}

// Stable per-form-instance identity generated on the client. Uses the platform
// UUID generator; falls back to a v4-shaped string if unavailable.
export function newSubmissionId(): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) {
    return uuid
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (char) => {
      const random = (Math.random() * 16) | 0
      const value = char === "x" ? random : (random & 0x3) | 0x8
      return value.toString(16)
    }
  )
}
