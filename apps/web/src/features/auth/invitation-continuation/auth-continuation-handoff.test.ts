import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

const startAction = read("src/features/auth/invitation-continuation/start-invitation-continuation-action.ts")
const callback = read("src/app/auth/callback/route.ts")
const continueRoute = read("src/app/auth/continue/route.ts")
const loginForm = read("src/features/auth/components/login-form.tsx")
const signupForm = read("src/features/auth/components/signup-form.tsx")
const middleware = read("src/middleware.ts")
const invitePage = read("src/app/invite/[token]/page.tsx")

test("start action is server-side, binds the token, sets continuation and redirects to an internal auth page", () => {
  assert.match(startAction, /"use server"/)
  assert.match(startAction, /writeInvitationContinuation\(rawToken\)/)
  assert.match(startAction, /redirect\(destination\)/)
  assert.doesNotMatch(startAction, /\?token=|returnTo|callbackUrl/)
})

test("invite page binds the token into the continuation actions and never into a URL or query", () => {
  assert.match(invitePage, /startInvitationContinuationAction\.bind\(null, token, "\/login"\)/)
  assert.match(invitePage, /startInvitationContinuationAction\.bind\(null, token, "\/signup"\)/)
  assert.doesNotMatch(invitePage, /\?token=|returnTo|callbackUrl/)
})

test("callback exchanges the code server-side and never logs code or tokens", () => {
  assert.match(callback, /exchangeCodeForSession\(code\)/)
  assert.match(callback, /\/auth\/continue/)
  assert.match(callback, /\/login/)
  assert.doesNotMatch(callback, /console\./)
  assert.doesNotMatch(callback, /\/invite\//)
  assert.doesNotMatch(callback, /rawToken/)
  assert.doesNotMatch(callback, /service_role/)
})

test("continue route consumes the cookie, allowlists the target, deletes the cookie and falls back to /app", () => {
  assert.match(continueRoute, /readInvitationContinuation/)
  assert.match(continueRoute, /isAllowedContinuationPath/)
  assert.match(continueRoute, /"\/app"/)
  assert.match(continueRoute, /cookies\.delete\(INVITATION_CONTINUATION_COOKIE\)/)
  assert.doesNotMatch(continueRoute, /returnTo|callbackUrl|\?token=/)
})

test("login form resumes via /auth/continue and carries no invite token", () => {
  assert.match(loginForm, /router\.push\("\/auth\/continue"\)/)
  assert.doesNotMatch(loginForm, /router\.push\("\/app"\)/)
  assert.doesNotMatch(loginForm, /\/invite\/|\?token=|returnTo|callbackUrl/)
})

test("signup form uses a fixed /auth/callback redirect with no token and resumes via /auth/continue", () => {
  assert.match(signupForm, /emailRedirectTo: `\$\{window\.location\.origin\}\/auth\/callback`/)
  assert.match(signupForm, /router\.push\("\/auth\/continue"\)/)
  assert.doesNotMatch(signupForm, /emailRedirectTo[^\n]*token/i)
  assert.doesNotMatch(signupForm, /\/invite\/|\?token=|returnTo|callbackUrl/)
})

test("middleware keeps /app protected and does not special-case /auth routes", () => {
  assert.match(middleware, /pathname\.startsWith\("\/app"\)/)
  assert.doesNotMatch(middleware, /auth\/callback|auth\/continue/)
})

test("handoff never touches acceptance, membership, People or protected tables", () => {
  const combined = [startAction, callback, continueRoute, invitePage].join("\n")
  for (const forbidden of [
    /acceptCompanyMemberInvitationAction/,
    /company_member_invitations/,
    /company_members/,
    /loadCurrentUserContext/,
    /service_role/,
    /\.from\("people"\)/,
  ]) {
    assert.doesNotMatch(combined, forbidden)
  }
})
