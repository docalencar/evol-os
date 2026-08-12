import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

const panel = read("src/features/tenant-access/components/invitation-accept-panel.tsx")
const adapter = read("src/features/tenant-access/actions/accept-invitation-form-action.ts")
const card = read("src/features/tenant-access/components/invitation-entry-card.tsx")
const page = read("src/app/invite/[token]/page.tsx")

test("accept panel is a client component that only receives a bound action reference", () => {
  assert.match(panel, /"use client"/)
  assert.match(panel, /useActionState/)
  assert.match(panel, /acceptAction/)
  // No token, digest or tenant authority reaches the client panel. (ARIA
  // role="status" is accessibility markup, not authority, so it is not matched.)
  assert.doesNotMatch(panel, /rawToken|tokenDigest|\bdigest\b|companyId|personId|targetEmail|intendedRole/i)
})

test("accept panel requires a human submit, guards double-submit and never auto-runs", () => {
  assert.match(panel, /<form action=\{formAction\}/)
  assert.match(panel, /disabled=\{pending\}/)
  // No effect-driven acceptance or navigation on render.
  assert.doesNotMatch(panel, /useEffect/)
})

test("accept panel does not call the RPC, service_role or protected tables directly", () => {
  assert.doesNotMatch(panel, /\.rpc\(/)
  assert.doesNotMatch(panel, /service_role/)
  assert.doesNotMatch(panel, /company_member_invitations/)
  assert.doesNotMatch(panel, /loadCurrentUserContext/)
  // The panel invokes the injected action, never the underlying Action name.
  assert.doesNotMatch(panel, /acceptCompanyMemberInvitationAction/)
})

test("form adapter delegates to the existing Action with only the bound token", () => {
  assert.match(adapter, /"use server"/)
  assert.match(adapter, /acceptCompanyMemberInvitationAction\(\{ rawToken \}\)/)
  assert.doesNotMatch(adapter, /companyId|personId|targetEmail|intendedRole|actorUserId|generation|tokenDigest/)
  assert.doesNotMatch(adapter, /\.rpc\(|service_role|company_member_invitations/)
})

test("page binds the token server-side and passes only the action reference", () => {
  assert.match(page, /acceptInvitationFormAction\.bind\(null, token\)/)
  assert.match(page, /acceptAction=\{acceptAction\}/)
  assert.doesNotMatch(page, /\?token=/)
})

test("card renders the functional panel only in the authenticated-ready branch", () => {
  assert.match(card, /<InvitationAcceptPanel acceptAction=\{acceptAction\} \/>/)
  const occurrences = card.match(/InvitationAcceptPanel/g) ?? []
  // One import + one usage.
  assert.equal(occurrences.length, 2)
  // invalid and authentication_required branches are preserved.
  assert.match(card, /Este convite não é válido\./)
  assert.match(card, /action=\{loginAction\}/)
  assert.match(card, /action=\{signupAction\}/)
})
