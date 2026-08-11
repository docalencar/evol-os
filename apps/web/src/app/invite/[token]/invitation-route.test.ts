import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const routeSource = readFileSync(
  resolve(process.cwd(), "src/app/invite/[token]/page.tsx"),
  "utf8",
)
const cardSource = readFileSync(
  resolve(process.cwd(), "src/features/tenant-access/components/invitation-entry-card.tsx"),
  "utf8",
)
const middlewareSource = readFileSync(
  resolve(process.cwd(), "src/middleware.ts"),
  "utf8",
)

test("route is a server component that reads the token from the path and derives session", () => {
  assert.doesNotMatch(routeSource, /"use client"/)
  assert.match(routeSource, /params: Promise<\{ token: string \}>/)
  assert.match(routeSource, /const \{ token \} = await params/)
  assert.match(routeSource, /auth\.getUser\(\)/)
})

test("route never reads the protected invitations table nor invokes acceptance", () => {
  assert.doesNotMatch(routeSource, /company_member_invitations/)
  assert.doesNotMatch(routeSource, /acceptCompanyMemberInvitationAction/)
  assert.doesNotMatch(routeSource, /\.rpc\(/)
  assert.doesNotMatch(routeSource, /issueCompanyMember|resendCompanyMember|revokeCompanyMember/)
})

test("route does not use tenant membership resolution or privileged access", () => {
  assert.doesNotMatch(routeSource, /loadCurrentUserContext/)
  assert.doesNotMatch(routeSource, /service_role/)
})

test("route renders the card with coarse state and bound continuation actions — never a token prop", () => {
  assert.match(routeSource, /<InvitationEntryCard/)
  assert.match(routeSource, /state=\{state\}/)
  assert.match(routeSource, /loginAction=\{loginAction\}/)
  assert.match(routeSource, /signupAction=\{signupAction\}/)
  assert.doesNotMatch(routeSource, /token=\{/)
})

test("route never forwards the token to query params, storage, cookies or logs", () => {
  assert.doesNotMatch(routeSource, /\?token=/)
  assert.doesNotMatch(routeSource, /searchParams/)
  assert.doesNotMatch(routeSource, /returnTo|callbackUrl|[?&]next=/)
  assert.doesNotMatch(routeSource, /localStorage|sessionStorage|document\.cookie/)
  assert.doesNotMatch(routeSource, /console\.(?:log|error|info|warn|debug)/)
})

test("card exposes no token, tenant, email, role or invitation identity", () => {
  assert.doesNotMatch(cardSource, /token/i)
  assert.doesNotMatch(cardSource, /companyId|personId|invitationId|tenant|email|\brole\b/i)
  assert.doesNotMatch(cardSource, /acceptCompanyMemberInvitationAction/)
})

test("card auth handoff uses bound server-action forms, not token-bearing links", () => {
  assert.match(cardSource, /action=\{loginAction\}/)
  assert.match(cardSource, /action=\{signupAction\}/)
  assert.doesNotMatch(cardSource, /href="\/login"/)
  assert.doesNotMatch(cardSource, /href="\/signup"/)
  assert.doesNotMatch(cardSource, /returnTo|callbackUrl|[?&]next=|\?token=/)
})

test("middleware keeps /app protected and does not special-case or block /invite", () => {
  // Unauthenticated redirect is scoped to /app only, so /invite is public.
  assert.match(middlewareSource, /pathname\.startsWith\("\/app"\)/)
  assert.doesNotMatch(middlewareSource, /invite/)
})
