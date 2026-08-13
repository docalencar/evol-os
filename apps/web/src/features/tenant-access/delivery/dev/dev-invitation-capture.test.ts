import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only" ? { shortCircuit: true, url: "server-only:test" } : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return url === "server-only:test" ? { format: "module", shortCircuit: true, source: "export {}" } : nextLoad(url, context)
  },
})

const loadStore = () => import("./dev-invitation-capture-store")
const loadDelivery = () => import("./dev-invitation-capture-delivery")

const URL_A = `http://localhost:3000/invite/${"A".repeat(43)}`
const URL_B = `http://localhost:3000/invite/${"B".repeat(43)}`

test("store records and reads the latest capture, and clears it", async () => {
  const s = await loadStore()
  s.clearInvitationCapture()
  assert.equal(s.readInvitationCapture(), null)
  s.recordInvitationCapture(URL_A, "x@example.test")
  const c = s.readInvitationCapture()
  assert.equal(c?.invitationUrl, URL_A)
  assert.equal(c?.destinationEmail, "x@example.test")
  s.clearInvitationCapture()
  assert.equal(s.readInvitationCapture(), null)
})

test("store keeps only the latest capture (no unbounded history)", async () => {
  const s = await loadStore()
  s.clearInvitationCapture()
  s.recordInvitationCapture(URL_A, "a@example.test")
  s.recordInvitationCapture(URL_B, "b@example.test")
  assert.equal(s.readInvitationCapture()?.invitationUrl, URL_B)
  s.clearInvitationCapture()
})

test("store expires captures after the 10-minute TTL", async () => {
  const s = await loadStore()
  s.clearInvitationCapture()
  const realNow = Date.now
  try {
    let now = 1_000_000
    Date.now = () => now
    s.recordInvitationCapture(URL_A, "c@example.test")
    now += 11 * 60 * 1000 // 11 min > 10 min TTL
    assert.equal(s.readInvitationCapture(), null)
  } finally {
    Date.now = realNow
  }
})

test("capture delivery records the URL and reports accepted, without calling a provider", async () => {
  const s = await loadStore()
  s.clearInvitationCapture()
  const { createDevInvitationCaptureDelivery } = await loadDelivery()
  const delivery = createDevInvitationCaptureDelivery()
  const result = await delivery.send({
    destinationEmail: "galileu_ga@hotmail.com",
    invitationUrl: URL_A,
    companyName: "Empresa Teste",
    expiresAt: "2026-08-20T00:00:00.000Z",
    invitationId: "11111111-1111-4111-8111-111111111111",
    generation: 1,
    correlationId: "corr-1",
  })
  assert.deepEqual(result, { outcome: "accepted", providerMessageId: "dev-capture" })
  assert.equal(s.readInvitationCapture()?.invitationUrl, URL_A)
  s.clearInvitationCapture()
})
