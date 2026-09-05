/**
 * The diagnostic must be genuinely useful and genuinely safe: it has to explain a
 * rejection precisely, while never emitting the value or any stable derivative of
 * it.
 */

import assert from "node:assert/strict"
import test from "node:test"

import { describeKey } from "./inspect-key"

const REF = "rwfvxvbzaosgcyfxdjpt"

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url").replace(/=+$/, "")
  return `${b64({ alg: "HS256" })}.${b64(payload)}.ZmFrZQ`
}

test("reports metadata for a valid secret key and never the value", () => {
  const random = "Qx7-Zp2_Lm9WvT4bR6yH1sK0"
  const key = `sb_secret_${random}`
  const report = describeKey(key).join("\n")

  assert.match(report, /prefix class\s+: sb_secret_/)
  assert.match(report, new RegExp(`after prefix\\s+: ${random.length} chars`))
  assert.match(report, /VERDICT\s+: ACCEPTED/)

  assert.equal(report.includes(random), false)
  assert.equal(report.includes(key), false)
  // No 6-char window of the random part may survive into the output.
  for (let i = 0; i + 6 <= random.length; i += 1) {
    assert.equal(report.includes(random.slice(i, i + 6)), false)
  }
})

test("names non-ASCII codepoints, which is how a masked copy is spotted", () => {
  const report = describeKey("sb_secret_" + "•".repeat(20)).join("\n")
  assert.match(report, /NON-ASCII\s+: U\+2022/)
  assert.match(report, /masked/)
  assert.match(report, /VERDICT\s+: REJECTED/)
})

test("flags an embedded line break", () => {
  const report = describeKey("sb_secret_" + "A".repeat(10) + "\n" + "B".repeat(10)).join("\n")
  assert.match(report, /WHITESPACE INSIDE: yes/)
})

test("reports role and ref for a JWT, both non-secret claims", () => {
  const report = describeKey(fakeJwt({ role: "anon", ref: REF })).join("\n")
  assert.match(report, /classified as\s+: jwt-anon/)
  assert.match(report, new RegExp(`JWT project ref\\s+: ${REF}`))
  assert.match(report, /VERDICT\s+: REJECTED — this is the anon key/)
})

test("accepts a legacy service_role JWT", () => {
  const report = describeKey(fakeJwt({ role: "service_role", ref: REF })).join("\n")
  assert.match(report, /VERDICT\s+: ACCEPTED/)
})

test("handles an empty value without throwing", () => {
  assert.match(describeKey("").join("\n"), /EMPTY/)
  assert.match(describeKey("   ").join("\n"), /EMPTY/)
})

test("emits no hash of the key", () => {
  // A hash would be a stable identifier for the secret; it must never appear.
  const report = describeKey("sb_secret_" + "A".repeat(24)).join("\n")
  assert.equal(/\b[0-9a-f]{32,}\b/.test(report), false)
})
