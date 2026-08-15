import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(
  new URL("./invitation-issue-dialog.tsx", import.meta.url),
  "utf8",
)

test("dialog identifies the Person, exposes a read-only email, and renders authorized role options", () => {
  assert.match(source, /personName/)
  assert.match(source, /\{email\}/)
  assert.doesNotMatch(source, /type=["']email["']/)
  assert.match(source, /roleOptions\.map/)
  assert.match(source, /Papel de acesso/)
})

test("client submits only personId and intendedRole through the existing Action", () => {
  assert.match(
    source,
    /issueCompanyMemberInvitationAction\(\{\s*personId,\s*intendedRole,\s*\}\)/,
  )
  assert.doesNotMatch(source, /companyId\s*[,}:]/)
})

test("pending and a synchronous guard prevent double submit", () => {
  assert.match(source, /submissionInFlight = useRef\(false\)/)
  assert.match(source, /if \(\s*submissionInFlight\.current/)
  assert.match(source, /submissionInFlight\.current = true/)
  assert.match(source, /disabled=\{isPending/)
  assert.match(source, /Enviando convite\.\.\./)
  assert.match(source, /isPending \|\| invitationCreated/)
})

test("success, safe errors, and session/tenant navigation are accessible", () => {
  assert.match(source, /Convite enviado para \$\{email\}\./)
  assert.match(source, /role=\{feedback\.tone === "error" \? "alert" : "status"\}/)
  assert.match(source, /feedbackRef\.current\?\.focus\(\)/)
  assert.match(source, /router\.replace\("\/login"\)/)
  assert.match(source, /router\.replace\("\/select-company"\)/)
  assert.match(source, /router\.refresh\(\)/)
})

test("client boundary contains no database, secret, or browser authority path", () => {
  assert.doesNotMatch(
    source,
    /createClient|Supabase|\.rpc\(|company_members|company_member_invitations|service_role|localStorage|auth\.jwt|request\.jwt|digest|idempotencyKey|correlationId|actorUserId|rawToken|targetEmail/,
  )
})
