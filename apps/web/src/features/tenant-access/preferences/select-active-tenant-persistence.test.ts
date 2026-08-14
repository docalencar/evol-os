import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

import type { TenantSelectRpcClient } from "./select-active-tenant-persistence"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only" ? { shortCircuit: true, url: "server-only:test" } : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return url === "server-only:test" ? { format: "module", shortCircuit: true, source: "export {}" } : nextLoad(url, context)
  },
})

const load = () => import("./select-active-tenant-persistence")

function client(response: { data: unknown; error: unknown }, capture?: (name: string, params: unknown) => void): TenantSelectRpcClient {
  return {
    rpc: (name, params) => {
      capture?.(name, params)
      return Promise.resolve(response)
    },
  }
}

const intent = { companyId: "company-a", idempotencyKey: "idem-1", correlationId: "corr-1" }

test("maps a succeeded envelope to the selected company and forwards only intent + generated ids", async () => {
  const { selectActiveTenant } = await load()
  let capturedName: string | undefined
  let capturedParams: Record<string, unknown> | undefined
  const result = await selectActiveTenant(
    client(
      { data: { status: "succeeded", operationId: "op-1", result: { preferredCompanyId: "company-a", status: "selected" } }, error: null },
      (name, params) => {
        capturedName = name
        capturedParams = params as Record<string, unknown>
      },
    ),
    intent,
  )
  assert.deepEqual(result, { status: "succeeded", companyId: "company-a" })
  assert.equal(capturedName, "select_active_tenant_v1")
  assert.deepEqual(capturedParams, {
    p_company_id: "company-a",
    p_idempotency_key: "idem-1",
    p_correlation_id: "corr-1",
  })
})

test("maps idempotent_retry to succeeded", async () => {
  const { selectActiveTenant } = await load()
  const result = await selectActiveTenant(
    client({ data: { status: "idempotent_retry", operationId: "op-1", result: { preferredCompanyId: "company-a" } }, error: null }),
    intent,
  )
  assert.deepEqual(result, { status: "succeeded", companyId: "company-a" })
})

test("maps a denied envelope to denied", async () => {
  const { selectActiveTenant } = await load()
  const result = await selectActiveTenant(
    client({ data: { status: "denied", code: "TENANT_MEMBERSHIP_NOT_FOUND" }, error: null }),
    intent,
  )
  assert.deepEqual(result, { status: "denied" })
})

test("maps a PostgREST/DB error to an unexpected failure (no raw error escapes)", async () => {
  const { selectActiveTenant } = await load()
  const result = await selectActiveTenant(
    client({ data: null, error: { message: "permission denied", code: "42501" } }),
    intent,
  )
  assert.deepEqual(result, { status: "unexpected_persistence_failure" })
})

test("maps a malformed envelope to an unexpected failure", async () => {
  const { selectActiveTenant } = await load()
  const result = await selectActiveTenant(client({ data: { status: "succeeded" }, error: null }), intent)
  assert.deepEqual(result, { status: "unexpected_persistence_failure" })
})
