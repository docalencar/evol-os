import { NextResponse, type NextRequest } from "next/server"

import {
  INVITATION_CONTINUATION_COOKIE,
  isAllowedContinuationPath,
  readInvitationContinuation,
} from "@/features/auth/invitation-continuation/invitation-continuation"

// Post-authentication resume point. Reads the one-time continuation cookie and,
// only if it is an allowlisted internal invite path, redirects there; otherwise
// falls back to /app. The cookie is always deleted (single use). No query
// params are appended and no external destination is ever accepted.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const stored = await readInvitationContinuation()
  const target = stored && isAllowedContinuationPath(stored) ? stored : "/app"

  const response = NextResponse.redirect(new URL(target, request.url))
  response.cookies.delete(INVITATION_CONTINUATION_COOKIE)
  return response
}
