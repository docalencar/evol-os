/**
 * The preflight must fail closed.
 *
 * The regression this guards: an invalid service-role credential was reported and
 * the run continued anyway, because the guarantee lived in an operator's shell
 * snippet rather than in the repository. It now lives here.
 */

import assert from "node:assert/strict"
import test from "node:test"

import { runPreflight } from "./preflight"

const REF = "rwfvxvbzaosgcyfxdjpt"

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url").replace(/=+$/, "")
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.ZmFrZXNpZ25hdHVyZQ`
}

const VARS = [
  "E2E_BASE_URL",
  "E2E_SUPABASE_URL",
  "E2E_SUPABASE_ANON_KEY",
  "E2E_SUPABASE_SERVICE_ROLE_KEY",
  "E2E_ALLOW_NON_REVIEW_TARGET",
  "E2E_EMAIL_DOMAIN",
] as const

/**
 * Runs the preflight against an explicit environment.
 *
 * File loading is disabled: otherwise a developer's untracked `.env.e2e.local`
 * leaks into the assertions, and "missing" quietly becomes "invalid".
 */
function withEnv(overrides: Partial<Record<(typeof VARS)[number], string>>) {
  const saved = new Map<string, string | undefined>()
  for (const name of VARS) {
    saved.set(name, process.env[name])
    const value = overrides[name]
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
  try {
    return runPreflight({ loadEnvFile: false })
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
}

const VALID = {
  E2E_BASE_URL: "https://evol-os-review.vercel.app",
  E2E_SUPABASE_URL: `https://${REF}.supabase.co`,
  E2E_SUPABASE_ANON_KEY: fakeJwt({ role: "anon", ref: REF }),
  E2E_SUPABASE_SERVICE_ROLE_KEY: "sb_secret_" + "A".repeat(24),
} as const

function statusOf(result: ReturnType<typeof runPreflight>, name: string) {
  return result.checks.find((check) => check.name === name)?.status
}

test("a fully valid environment passes", () => {
  const result = withEnv({ ...VALID })
  assert.equal(result.ok, true, JSON.stringify(result.checks))
})

test("a missing service-role key blocks the run", () => {
  const result = withEnv({ ...VALID, E2E_SUPABASE_SERVICE_ROLE_KEY: undefined })
  assert.equal(result.ok, false)
  assert.equal(statusOf(result, "E2E_SUPABASE_SERVICE_ROLE_KEY"), "MISSING")
})

test("an invalid service-role key blocks the run", () => {
  const result = withEnv({ ...VALID, E2E_SUPABASE_SERVICE_ROLE_KEY: "sb_secret_" })
  assert.equal(result.ok, false)
  assert.equal(statusOf(result, "E2E_SUPABASE_SERVICE_ROLE_KEY"), "INVALID")
})

test("the anon key in the service-role slot blocks the run", () => {
  const result = withEnv({
    ...VALID,
    E2E_SUPABASE_SERVICE_ROLE_KEY: fakeJwt({ role: "anon", ref: REF }),
  })
  assert.equal(result.ok, false)
  assert.equal(statusOf(result, "E2E_SUPABASE_SERVICE_ROLE_KEY"), "INVALID")
})

test("a legacy JWT service-role key is accepted", () => {
  const result = withEnv({
    ...VALID,
    E2E_SUPABASE_SERVICE_ROLE_KEY: fakeJwt({ role: "service_role", ref: REF }),
  })
  assert.equal(result.ok, true, JSON.stringify(result.checks))
})

test("the Production project is refused outright", () => {
  const result = withEnv({ ...VALID, E2E_SUPABASE_URL: "https://gzrrwyiqfbnyprkdeqvm.supabase.co" })
  assert.equal(result.ok, false)
  const detail = result.checks.find((c) => c.name === "E2E_SUPABASE_URL")?.detail ?? ""
  assert.match(detail, /PRODUCTION/)
})

test("the Legacy project is refused outright", () => {
  const result = withEnv({ ...VALID, E2E_SUPABASE_URL: "https://oudngmrdtgengilpqqnz.supabase.co" })
  assert.equal(result.ok, false)
  const detail = result.checks.find((c) => c.name === "E2E_SUPABASE_URL")?.detail ?? ""
  assert.match(detail, /LEGACY/)
})

test("a non-canonical base URL is refused unless explicitly acknowledged", () => {
  const blocked = withEnv({ ...VALID, E2E_BASE_URL: "https://example.com" })
  assert.equal(blocked.ok, false)
  assert.equal(statusOf(blocked, "E2E_BASE_URL"), "INVALID")

  const acknowledged = withEnv({
    ...VALID,
    E2E_BASE_URL: "http://localhost:3000",
    E2E_ALLOW_NON_REVIEW_TARGET: "true",
  })
  assert.equal(statusOf(acknowledged, "E2E_BASE_URL"), "OK")
})

test("the same value in both key slots is refused", () => {
  const shared = "sb_secret_" + "Z".repeat(24)
  const result = withEnv({
    ...VALID,
    E2E_SUPABASE_ANON_KEY: shared,
    E2E_SUPABASE_SERVICE_ROLE_KEY: shared,
  })
  assert.equal(result.ok, false)
})

test("no check ever carries a key value", () => {
  const secret = "sb_secret_" + "L3AK".repeat(6)
  const result = withEnv({ ...VALID, E2E_SUPABASE_SERVICE_ROLE_KEY: secret })
  const serialised = JSON.stringify(result.checks)
  assert.equal(serialised.includes(secret), false)
  assert.equal(serialised.includes("L3AK"), false)
})
