import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8")

const factory = read("src/features/tenant-access/delivery/server/create-server-tenant-invitation-delivery.ts")
const captureDelivery = read("src/features/tenant-access/delivery/dev/dev-invitation-capture-delivery.ts")
const store = read("src/features/tenant-access/delivery/dev/dev-invitation-capture-store.ts")
const page = read("src/app/(dashboard)/app/dev/invitation-capture/page.tsx")
const action = read("src/app/(dashboard)/app/dev/invitation-capture/actions.ts")

test("factory activates capture ONLY under the double gate, keeping the real Resend path", () => {
  assert.match(factory, /process\.env\.NODE_ENV === "development"/)
  assert.match(factory, /process\.env\.DEV_INVITATION_CAPTURE_ENABLED === "true"/)
  assert.match(factory, /createDevInvitationCaptureDelivery\(\)/)
  // Real transport preserved.
  assert.match(factory, /new Resend\(apiKey\)/)
  assert.match(factory, /new ResendTenantInvitationDelivery\(/)
  // The gate short-circuits before Resend construction.
  assert.ok(
    factory.indexOf("createDevInvitationCaptureDelivery()") < factory.indexOf("new Resend(apiKey)"),
    "capture branch must precede Resend construction",
  )
})

test("capture delivery never calls a provider and never persists/logs", () => {
  assert.match(captureDelivery, /import "server-only"/)
  assert.match(captureDelivery, /outcome: "accepted"/)
  assert.match(captureDelivery, /recordInvitationCapture\(/)
  assert.doesNotMatch(captureDelivery, /resend/i)
  assert.doesNotMatch(captureDelivery, /console\.|createClient|supabase|service_role|node:fs|localStorage/)
})

test("store is server-only, in-memory (globalThis), TTL-bounded, no persistence", () => {
  assert.match(store, /import "server-only"/)
  assert.match(store, /globalThis/)
  assert.match(store, /CAPTURE_TTL_MS = 10 \* 60 \* 1000/)
  assert.doesNotMatch(store, /console\.|createClient|supabase|service_role|node:fs|localStorage|sessionStorage|document\.cookie/)
})

test("reveal page is dev+flag gated, owner-gated and hidden otherwise", () => {
  assert.match(page, /NODE_ENV === "development"/)
  assert.match(page, /DEV_INVITATION_CAPTURE_ENABLED === "true"/)
  assert.match(page, /notFound\(\)/)
  assert.match(page, /currentUser\.role !== "owner" && currentUser\.role !== "admin"/)
  assert.doesNotMatch(page, /service_role/)
})

test("reveal action re-checks the double gate and owner, and does not log", () => {
  assert.match(action, /"use server"/)
  assert.match(action, /NODE_ENV === "development"/)
  assert.match(action, /DEV_INVITATION_CAPTURE_ENABLED === "true"/)
  assert.match(action, /currentUser\.role !== "owner" && currentUser\.role !== "admin"/)
  assert.match(action, /readInvitationCapture\(\)/)
  assert.doesNotMatch(action, /console\.|service_role/)
})
