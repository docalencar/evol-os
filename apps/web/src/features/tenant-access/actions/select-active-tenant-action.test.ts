import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const action = readFileSync(
  resolve(process.cwd(), "src/features/tenant-access/actions/select-active-tenant-action.ts"),
  "utf8",
)

test("action is server-side and validates a strict uuid company id", () => {
  assert.match(action, /"use server"/)
  assert.match(action, /z\.object\(\{ companyId: z\.string\(\)\.uuid\(\) \}\)\.strict\(\)/)
  assert.match(action, /return \{ status: "invalid_input"/)
})

test("actor context is server-derived; no session yields session_expired", () => {
  assert.match(action, /supabase\.auth\.getUser\(\)/)
  assert.match(action, /return \{ status: "session_expired" \}/)
})

test("idempotency key and correlation id are generated server-side, never from the browser", () => {
  const randomUuidCalls = action.match(/randomUUID\(\)/g) ?? []
  assert.equal(randomUuidCalls.length, 2)
  assert.match(action, /idempotencyKey: randomUUID\(\)/)
  assert.match(action, /correlationId: randomUUID\(\)/)
})

test("the browser cannot supply actor/role/authority fields", () => {
  assert.doesNotMatch(action, /actorUserId|userId|intendedRole|\brole\b|tokenDigest|generation/)
})

test("the action delegates to the persistence adapter and never calls the RPC or service_role directly", () => {
  assert.match(action, /selectActiveTenant\(supabase, \{/)
  assert.doesNotMatch(action, /\.rpc\(/)
  assert.doesNotMatch(action, /service_role/)
})

test("results map to a safe union without leaking internals", () => {
  assert.match(action, /status: "selected"/)
  assert.match(action, /status: "denied"/)
  assert.match(action, /status: "failed"/)
  assert.doesNotMatch(action, /SQLSTATE|PGRST|42501/)
})
