import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const factory = readFileSync(
  resolve(process.cwd(), "src/features/tenant-access/delivery/server/create-server-tenant-invitation-delivery.ts"),
  "utf8",
)

// Locks the production behaviour after the Phase 6 smoke scaffolding was removed:
// the server invitation delivery must always use the real Resend transport and
// carry no dev-only capture gate.
test("server invitation delivery uses the real Resend transport only", () => {
  assert.match(factory, /new Resend\(apiKey\)/)
  assert.match(factory, /new ResendTenantInvitationDelivery\(/)
})

test("no dev capture gate, flag or dev-delivery import remains", () => {
  assert.doesNotMatch(factory, /DEV_INVITATION_CAPTURE_ENABLED/)
  assert.doesNotMatch(factory, /delivery\/dev|createDevInvitationCaptureDelivery/)
})
