import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(new URL("./people-access-actions.tsx", import.meta.url), "utf8")

test("resend and revoke submit only invitation identity and expected generation", () => {
  assert.match(source, /const input = \{ invitationId, expectedGeneration \}/)
  assert.match(source, /resendCompanyMemberInvitationAction\(input\)/)
  assert.match(source, /revokeCompanyMemberInvitationAction\(input\)/)
  assert.doesNotMatch(source, /companyId|personId|actorUserId/)
})

test("pending guard, confirmation and accessible feedback protect actions", () => {
  assert.match(source, /submissionInFlight\.current/)
  assert.match(source, /disabled=\{isPending\}/)
  assert.match(source, /<AlertDialogTitle>Revogar convite\?<\/AlertDialogTitle>/)
  assert.match(source, /role=\{feedback\.tone === "error" \? "alert" : "status"\}/)
  assert.match(source, /feedbackRef\.current\?\.focus\(\)/)
})

test("success, stale state, delivery outcome and redirects are explicit", () => {
  assert.match(source, /router\.refresh\(\)/)
  assert.match(source, /O convite foi alterado por outra operação/)
  assert.match(source, /O convite foi atualizado, mas o envio do e-mail não pôde ser confirmado/)
  assert.match(source, /router\.replace\("\/login"\)/)
  assert.match(source, /router\.replace\("\/select-company"\)/)
  assert.match(source, /router\.replace\("\/onboarding"\)/)
})

test("client source contains no database or secret boundary", () => {
  assert.doesNotMatch(source, /createClient|Supabase|\.rpc\(|\.from\(|company_member_invitations|company_members|service_role|localStorage|auth\.jwt|request\.jwt|token|digest|correlationId|idempotencyKey/)
})
