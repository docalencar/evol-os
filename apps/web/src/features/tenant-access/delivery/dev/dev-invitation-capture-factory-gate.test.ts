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

const loadFactory = () => import("../server/create-server-tenant-invitation-delivery")

function withEnv(
  env: Readonly<Record<string, string | undefined>>,
  run: () => void | Promise<void>,
) {
  const keys = ["NODE_ENV", "DEV_INVITATION_CAPTURE_ENABLED", "RESEND_API_KEY", "EMAIL_FROM"] as const
  // process.env.NODE_ENV is typed read-only; use a mutable string map view.
  const store = process.env as Record<string, string | undefined>
  const previous: Record<string, string | undefined> = {}
  for (const k of keys) previous[k] = store[k]
  try {
    for (const k of keys) {
      if (env[k] === undefined) delete store[k]
      else store[k] = env[k]
    }
    return run()
  } finally {
    for (const k of keys) {
      if (previous[k] === undefined) delete store[k]
      else store[k] = previous[k]
    }
  }
}

test("development + flag true → capture transport, needing no Resend credentials", async () => {
  const { createServerTenantInvitationDelivery } = await loadFactory()
  await withEnv(
    { NODE_ENV: "development", DEV_INVITATION_CAPTURE_ENABLED: "true", RESEND_API_KEY: undefined, EMAIL_FROM: undefined },
    async () => {
      const delivery = createServerTenantInvitationDelivery()
      const result = await delivery.send({
        destinationEmail: "galileu_ga@hotmail.com",
        invitationUrl: `http://localhost:3000/invite/${"A".repeat(43)}`,
        companyName: "Empresa",
        expiresAt: "2026-08-20T00:00:00.000Z",
        invitationId: "11111111-1111-4111-8111-111111111111",
        generation: 1,
        correlationId: "corr-1",
      })
      assert.deepEqual(result, { outcome: "accepted", providerMessageId: "dev-capture" })
    },
  )
})

test("development + flag false → real transport (no capture)", async () => {
  const { createServerTenantInvitationDelivery } = await loadFactory()
  withEnv(
    { NODE_ENV: "development", DEV_INVITATION_CAPTURE_ENABLED: "false", RESEND_API_KEY: undefined, EMAIL_FROM: undefined },
    () => {
      // Real path requires credentials; without them it throws — proving the
      // capture branch was NOT taken.
      assert.throws(() => createServerTenantInvitationDelivery(), /not configured/)
    },
  )
})

test("development + flag missing → real transport (no capture)", async () => {
  const { createServerTenantInvitationDelivery } = await loadFactory()
  withEnv(
    { NODE_ENV: "development", DEV_INVITATION_CAPTURE_ENABLED: undefined, RESEND_API_KEY: undefined, EMAIL_FROM: undefined },
    () => assert.throws(() => createServerTenantInvitationDelivery(), /not configured/),
  )
})

test("production + flag true → real transport (flag ignored outside development)", async () => {
  const { createServerTenantInvitationDelivery } = await loadFactory()
  withEnv(
    { NODE_ENV: "production", DEV_INVITATION_CAPTURE_ENABLED: "true", RESEND_API_KEY: undefined, EMAIL_FROM: undefined },
    () => assert.throws(() => createServerTenantInvitationDelivery(), /not configured/),
  )
})
