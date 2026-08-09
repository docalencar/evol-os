import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { registerHooks } from "node:module"
import test from "node:test"

import type {
  TenantInvitationDeliveryRequest,
  TenantInvitationDeliveryResult,
} from "./contracts"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return {
        shortCircuit: true,
        url: "server-only:test",
      }
    }

    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === "server-only:test") {
      return {
        format: "module",
        shortCircuit: true,
        source: "export {}",
      }
    }

    return nextLoad(url, context)
  },
})

const request: TenantInvitationDeliveryRequest = {
  destinationEmail: "invitee@example.com",
  invitationUrl: "https://app.example.com/invite/secret-value",
  companyName: "Example Company",
  inviterName: "Inviter",
  intendedRole: "employee",
  expiresAt: "2026-08-16T12:00:00.000Z",
  invitationId: "invitation-1",
  generation: 2,
  correlationId: "correlation-1",
}

const loadFake = () => import("./fakes/fake-tenant-invitation-delivery")

test("the request contract contains only prepared delivery data", () => {
  assert.deepEqual(Object.keys(request).sort(), [
    "companyName",
    "correlationId",
    "destinationEmail",
    "expiresAt",
    "generation",
    "intendedRole",
    "invitationId",
    "invitationUrl",
    "inviterName",
  ])
  assert.equal("providerIdempotencyKey" in request, false)
})

test("the fake implements the port and preserves the request", async () => {
  const { FakeTenantInvitationDelivery } = await loadFake()
  const delivery = new FakeTenantInvitationDelivery({
    outcome: "accepted",
    providerMessageId: "message-1",
  })

  const result = await delivery.send(request)

  assert.deepEqual(result, {
    outcome: "accepted",
    providerMessageId: "message-1",
  })
  assert.deepEqual(delivery.requests, [request])
  assert.equal(delivery.requests[0]?.invitationId, "invitation-1")
  assert.equal(delivery.requests[0]?.generation, 2)
  assert.equal(delivery.requests[0]?.correlationId, "correlation-1")
  assert.equal(delivery.requests[0]?.invitationUrl, request.invitationUrl)
})

test("the fake returns every stable outcome without transformation", async () => {
  const { FakeTenantInvitationDelivery } = await loadFake()
  const results: readonly TenantInvitationDeliveryResult[] = [
    { outcome: "accepted" },
    { outcome: "transient_failure", category: "rate_limited", retryAfterMs: 500 },
    { outcome: "permanent_failure", category: "invalid_recipient" },
    { outcome: "unknown", category: "unrecognized_response" },
    { outcome: "configuration_failure", category: "authentication" },
  ]
  const delivery = new FakeTenantInvitationDelivery()

  for (const expected of results) {
    delivery.setResult(expected)
    assert.deepEqual(await delivery.send(request), expected)
  }
})

test("result variants do not expose request data or token secrets", () => {
  const results: readonly TenantInvitationDeliveryResult[] = [
    { outcome: "accepted", providerMessageId: "message-1" },
    { outcome: "transient_failure", category: "network" },
    { outcome: "permanent_failure", category: "provider_rejected" },
    { outcome: "unknown", category: "unrecognized_response" },
    { outcome: "configuration_failure", category: "sender_not_verified" },
  ]
  const forbiddenKeys = [
    "destinationEmail",
    "invitationUrl",
    "rawToken",
    "digestHex",
    "apiKey",
  ]

  for (const result of results) {
    for (const key of forbiddenKeys) {
      assert.equal(key in result, false)
    }
  }
})

test("runtime code is server-only, provider-neutral, and does not log", async () => {
  const sourceFiles = await Promise.all([
    readFile(new URL("./contracts.ts", import.meta.url), "utf8"),
    readFile(new URL("./ports.ts", import.meta.url), "utf8"),
    readFile(
      new URL("./fakes/fake-tenant-invitation-delivery.ts", import.meta.url),
      "utf8",
    ),
  ])
  const productionSource = sourceFiles.join("\n").toLowerCase()

  assert.match(sourceFiles[2] ?? "", /^import "server-only"/)
  assert.doesNotMatch(productionSource, /resend|postmark|service_role|supabase/)
  assert.doesNotMatch(productionSource, /auth\.uid|actoruserid|digesthex|rawtoken/)
  assert.doesNotMatch(productionSource, /console\.(?:log|error|warn|info)/)
})
