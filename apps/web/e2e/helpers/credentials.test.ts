/**
 * Focused tests for credential format validation.
 *
 * Run with the repository's existing runner: `tsx --test`.
 * Every key here is a locally constructed fake. No real credential appears.
 */

import assert from "node:assert/strict"
import test from "node:test"

import { inspectKey, validateAnonKey, validateServiceRoleKey } from "./credentials"

const REF = "rwfvxvbzaosgcyfxdjpt"
const OTHER_REF = "gzrrwyiqfbnyprkdeqvm"

/** Build a syntactically real JWT with a chosen payload. Signature is a dummy. */
function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url").replace(/=+$/, "")
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.ZmFrZXNpZ25hdHVyZQ`
}

test("legacy JWT service_role for the expected project is accepted", () => {
  const key = fakeJwt({ role: "service_role", ref: REF })
  const result = validateServiceRoleKey(key, REF)
  assert.equal(result.ok, true)
  assert.equal(inspectKey(key).kind, "jwt-service-role")
  assert.equal(inspectKey(key).identityVerifiable, true)
})

test("new-format secret key is accepted, with identity only operator-attested", () => {
  const key = "sb_secret_" + "A".repeat(24)
  const result = validateServiceRoleKey(key, REF)
  assert.equal(result.ok, true)
  assert.match(result.ok ? result.note : "", /operator-attested/)
  assert.equal(inspectKey(key).identityVerifiable, false)
})

test("a service-role JWT from another project is rejected", () => {
  const result = validateServiceRoleKey(fakeJwt({ role: "service_role", ref: OTHER_REF }), REF)
  assert.equal(result.ok, false)
  assert.match(result.ok ? "" : result.reason, new RegExp(OTHER_REF))
})

test("the anon key pasted into the service-role slot is rejected", () => {
  const result = validateServiceRoleKey(fakeJwt({ role: "anon", ref: REF }), REF)
  assert.equal(result.ok, false)
  assert.match(result.ok ? "" : result.reason, /anon key/)
})

test("the publishable key pasted into the service-role slot is rejected", () => {
  const result = validateServiceRoleKey("sb_publishable_" + "B".repeat(24), REF)
  assert.equal(result.ok, false)
  assert.match(result.ok ? "" : result.reason, /publishable/)
})

test("a broad prefix alone is not enough", () => {
  for (const candidate of ["sb_secret_", "sb_secret_abc", "sb_", "eyJ", "not-a-key", ""]) {
    assert.equal(
      validateServiceRoleKey(candidate, REF).ok,
      false,
      `expected ${JSON.stringify(candidate)} to be rejected`,
    )
  }
})

test("secret keys are accepted across every plausible encoding of the random part", () => {
  // Supabase documents the prefix but not the encoding. An earlier revision
  // assumed base64url and rejected a real Review key.
  const randoms = [
    "abcdefghijklmnopqrstuvwxyz",              // lowercase
    "ABCdef123456789012345678",                // mixed alphanumeric
    "abc-def_ghi-jkl_mno-pqr12",               // base64url
    "abc+def/ghi+jkl/mno=pqr12",               // standard base64 with padding
    "0123456789abcdef0123456789abcdef",        // hex
    "part.one.two.three.four.five",            // dotted
    "A".repeat(31),                            // the observed Review key length
  ]
  for (const random of randoms) {
    const result = validateServiceRoleKey(`sb_secret_${random}`, REF)
    assert.equal(result.ok, true, `expected sb_secret_ + ${random.length} chars to be accepted`)
  }
})

test("surrounding quotes and whitespace do not cause a false rejection", () => {
  const key = "sb_secret_" + "A".repeat(24)
  for (const wrapped of [` ${key} `, `"${key}"`, `'${key}'`, `\n${key}\n`, ` "${key}" `]) {
    assert.equal(validateServiceRoleKey(wrapped, REF).ok, true, `failed for ${JSON.stringify(wrapped)}`)
  }
})

test("a masked copy of the field is rejected, not mistaken for a key", () => {
  // Copying a hidden dashboard field yields bullets, not the value.
  assert.equal(validateServiceRoleKey("sb_secret_" + "•".repeat(24), REF).ok, false)
  assert.equal(validateServiceRoleKey("•".repeat(40), REF).ok, false)
})

test("a value with an embedded line break is rejected", () => {
  const key = "sb_secret_" + "A".repeat(12) + "\n" + "B".repeat(12)
  assert.equal(validateServiceRoleKey(key, REF).ok, false)
})

test("a JWT without role=service_role is rejected", () => {
  const result = validateServiceRoleKey(fakeJwt({ role: "authenticated", ref: REF }), REF)
  assert.equal(result.ok, false)
})

test("anon slot accepts the anon JWT and the publishable key", () => {
  assert.equal(validateAnonKey(fakeJwt({ role: "anon", ref: REF }), REF).ok, true)
  assert.equal(validateAnonKey("sb_publishable_" + "C".repeat(24), REF).ok, true)
})

test("anon slot rejects privileged keys", () => {
  assert.equal(validateAnonKey(fakeJwt({ role: "service_role", ref: REF }), REF).ok, false)
  assert.equal(validateAnonKey("sb_secret_" + "D".repeat(24), REF).ok, false)
})

test("validation never echoes the key", () => {
  const secret = "sb_secret_" + "S3CR3T".repeat(4)
  const results = [
    JSON.stringify(validateServiceRoleKey(secret, REF)),
    JSON.stringify(validateAnonKey(secret, REF)),
    JSON.stringify(inspectKey(secret)),
  ]
  for (const serialised of results) {
    assert.equal(serialised.includes("S3CR3T"), false)
    assert.equal(serialised.includes(secret), false)
  }
})
