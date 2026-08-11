import "server-only"

import { cookies } from "next/headers"

import { isRawInvitationTokenFormatValid } from "@/features/tenant-access/invitation-token-format"

// Short-lived, HttpOnly continuation state for the same-browser invitation auth
// handoff. It carries ONLY the internal invite path — never company, person,
// email, role, user id, digest, tenant or any authority — and is consumed once.
export const INVITATION_CONTINUATION_COOKIE = "evol_invitation_continuation"
export const INVITATION_CONTINUATION_TTL_SECONDS = 15 * 60

// Fail-closed allowlist: only an exact internal invite path with a canonical
// 43-char base64url token is accepted. This rejects absolute URLs, protocol
// relative (`//`), backslashes, query strings, fragments and any other path.
export const INVITATION_CONTINUATION_PATH_PATTERN = /^\/invite\/[A-Za-z0-9_-]{43}$/

export function isAllowedContinuationPath(path: string): boolean {
  return INVITATION_CONTINUATION_PATH_PATTERN.test(path)
}

export function buildInvitationContinuationPath(rawToken: string): string | null {
  if (!isRawInvitationTokenFormatValid(rawToken)) return null
  const path = `/invite/${rawToken}`
  return isAllowedContinuationPath(path) ? path : null
}

function continuationCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV !== "development",
    path: "/",
    maxAge: INVITATION_CONTINUATION_TTL_SECONDS,
  }
}

// Persists the continuation cookie for a valid invite token. Returns false and
// writes nothing when the token format is invalid (fail closed).
export async function writeInvitationContinuation(rawToken: string): Promise<boolean> {
  const path = buildInvitationContinuationPath(rawToken)
  if (!path) return false

  const store = await cookies()
  store.set(INVITATION_CONTINUATION_COOKIE, path, continuationCookieOptions())
  return true
}

// Reads the continuation cookie value (raw) if present. Validation and deletion
// are performed by the /auth/continue route handler on the outgoing response.
export async function readInvitationContinuation(): Promise<string | null> {
  const store = await cookies()
  return store.get(INVITATION_CONTINUATION_COOKIE)?.value ?? null
}
