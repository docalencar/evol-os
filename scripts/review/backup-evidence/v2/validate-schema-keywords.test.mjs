/**
 * Keyword coverage of the v2 JSON Schema validator.
 *
 * WHY THIS FILE EXISTS
 *
 * The published trust-registry schema uses `allOf`, `if`/`then`/`else`, `not`
 * and `type: "boolean"`. The validator implemented none of them, so those
 * clauses were inert: an ACTIVE entry carrying `revoked_at`, a REVOKED entry
 * without it, and a non-boolean `test_only` all passed schema validation. And
 * `uniqueItems` threw `TypeError: ancestors.has is not a function` for any
 * non-empty array of objects, because `value.map(canonical)` hands the array
 * INDEX to canonical's `ancestors` parameter.
 *
 * None of that was visible from the suites: the operational registry ships with
 * `keys: []`, so `[].map` never calls canonical, and the B1b-1 suite reached
 * green by setting `uniqueItems = false` on a clone of the real schema and
 * re-implementing the invariants inside the test file.
 *
 * So these tests assert keyword behaviour against the REAL published schema,
 * and the negatives matter more than the positives: each one asserts that a
 * clause the schema already declares actually bites.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import { canonical, validateSchema } from "./validate-evidence-dag.mjs"

const root = dirname(fileURLToPath(import.meta.url))
const registrySchema = JSON.parse(readFileSync(join(root, "trust-registry.schema.json"), "utf8"))

/** A registry entry that satisfies the published schema. */
const entry = (overrides = {}) => ({
  algorithm: "ed25519",
  key_id: "manifest-2026",
  key_purpose: "EVIDENCE_MANIFEST",
  not_after: "2026-10-14T12:00:00.000Z",
  not_before: "2026-10-13T12:00:00.000Z",
  public_key_path: "keys/manifest-2026.pem",
  public_key_spki_sha256: "b".repeat(64),
  status: "ACTIVE",
  test_only: false,
  ...overrides,
})

/** Validate against the REAL schema — never a relaxed clone. */
const registry = keys => validateSchema({ keys, registry_version: 1 }, registrySchema, "registry")

/**
 * A validation rejection is an Error whose message carries the label. A
 * TypeError (or any other programming fault) is NOT a rejection, and treating
 * one as the other is how the uniqueItems defect stayed hidden.
 */
function expectRejection(fn, pattern, message) {
  let thrown
  try { fn() } catch (error) { thrown = error }
  assert.ok(thrown, `${message}: expected a rejection, nothing was thrown`)
  assert.ok(!(thrown instanceof TypeError) && !(thrown instanceof RangeError) && !(thrown instanceof ReferenceError),
    `${message}: internal validator fault leaked instead of a validation error — ${thrown.name}: ${thrown.message}`)
  assert.match(thrown.message, pattern, message)
}

// ---------------------------------------------------------------------------
// uniqueItems
// ---------------------------------------------------------------------------

test("1. uniqueItems accepts two distinct objects without an internal fault", () => {
  const schema = { type: "array", uniqueItems: true, items: { type: "object", additionalProperties: false, properties: { a: { type: "integer" } } } }
  // The defect surfaced exactly here: `value.map(canonical)` passed the index
  // as `ancestors`, so the second element blew up before any comparison.
  assert.doesNotThrow(() => validateSchema([{ a: 1 }, { a: 2 }], schema, "arr"))
})

test("2. uniqueItems rejects byte-equivalent duplicates with a specific message", () => {
  const schema = { type: "array", uniqueItems: true, items: { type: "object", additionalProperties: false, properties: { a: { type: "integer" } } } }
  expectRejection(() => validateSchema([{ a: 1 }, { a: 1 }], schema, "arr"), /arr: duplicate item/, "duplicate objects")
  // Key order must not defeat it: canonicalisation sorts keys.
  const two = { type: "array", uniqueItems: true, items: { type: "object", additionalProperties: false, properties: { a: { type: "integer" }, b: { type: "integer" } } } }
  expectRejection(() => validateSchema([{ a: 1, b: 2 }, { b: 2, a: 1 }], two, "arr"), /arr: duplicate item/, "reordered keys are the same item")
})

test("10. a non-empty registry validates without an internal fault", () => {
  assert.doesNotThrow(() => registry([entry()]))
  assert.doesNotThrow(() => registry([entry(), entry({ key_id: "restore-2026", key_purpose: "RESTORE_ATTESTATION" })]))
})

// ---------------------------------------------------------------------------
// allOf / if / then / else / not
// ---------------------------------------------------------------------------

test("3. allOf runs every subschema", () => {
  const schema = { allOf: [{ type: "object", required: ["a"] }, { type: "object", required: ["b"] }] }
  assert.doesNotThrow(() => validateSchema({ a: 1, b: 2 }, schema, "doc"))
  expectRejection(() => validateSchema({ a: 1 }, schema, "doc"), /missing b/, "second subschema must run")
  expectRejection(() => validateSchema({ b: 2 }, schema, "doc"), /missing a/, "first subschema must run")
})

test("4. if/then/else selects the matching branch", () => {
  const schema = {
    type: "object",
    properties: { kind: { type: "string" }, then_only: { type: "integer" }, else_only: { type: "integer" } },
    allOf: [{ if: { properties: { kind: { const: "X" } }, required: ["kind"] }, then: { required: ["then_only"] }, else: { required: ["else_only"] } }],
  }
  assert.doesNotThrow(() => validateSchema({ kind: "X", then_only: 1 }, schema, "doc"))
  assert.doesNotThrow(() => validateSchema({ kind: "Y", else_only: 1 }, schema, "doc"))
  expectRejection(() => validateSchema({ kind: "X", else_only: 1 }, schema, "doc"), /missing then_only/, "then branch")
  expectRejection(() => validateSchema({ kind: "Y", then_only: 1 }, schema, "doc"), /missing else_only/, "else branch")
  // A failing `if` is a branch selector, never a validation error of its own.
  assert.doesNotThrow(() => validateSchema({ else_only: 1 }, schema, "doc"))
})

test("5. not rejects a value its subschema accepts", () => {
  const schema = { type: "object", properties: { a: { type: "integer" } }, not: { required: ["a"] } }
  assert.doesNotThrow(() => validateSchema({}, schema, "doc"))
  expectRejection(() => validateSchema({ a: 1 }, schema, "doc"), /doc: must not match/, "not")
})

// ---------------------------------------------------------------------------
// type: boolean
// ---------------------------------------------------------------------------

test("6. type boolean accepts true and false and rejects everything else", () => {
  const schema = { type: "boolean" }
  for (const value of [true, false]) assert.doesNotThrow(() => validateSchema(value, schema, "flag"))
  for (const value of ["false", "true", "", 0, 1, {}, [], null]) {
    expectRejection(() => validateSchema(value, schema, "flag"), /flag: boolean required/, `rejects ${canonical(value)}`)
  }
})

// ---------------------------------------------------------------------------
// The published registry schema's own conditional clauses
// ---------------------------------------------------------------------------

test("7. ACTIVE carrying revoked_at is rejected by the schema", () => {
  expectRejection(() => registry([entry({ revoked_at: "2026-10-13T13:00:00.000Z" })]),
    /must not match|revoked_at/, "ACTIVE must not carry revoked_at")
})

test("8. REVOKED without revoked_at is rejected by the schema", () => {
  expectRejection(() => registry([entry({ status: "REVOKED" })]), /missing revoked_at/, "REVOKED requires revoked_at")
})

test("8b. REVOKED with revoked_at remains valid", () => {
  assert.doesNotThrow(() => registry([entry({ status: "REVOKED", revoked_at: "2026-10-13T13:00:00.000Z" })]))
})

test("9. non-boolean test_only is rejected by the schema", () => {
  for (const value of ["false", 0, 1, {}, []]) {
    expectRejection(() => registry([entry({ test_only: value })]), /boolean required/, `test_only ${canonical(value)}`)
  }
})

test("the empty operational registry stays valid", () => {
  const shipped = JSON.parse(readFileSync(join(root, "trust-registry.json"), "utf8"))
  assert.deepEqual(shipped, { keys: [], registry_version: 1 })
  assert.doesNotThrow(() => validateSchema(shipped, registrySchema, "registry"))
})

test("no test may relax a published schema to reach green", () => {
  // Judged on the comment-stripped source. The first version of this guard
  // matched the prose that explains the forbidden shortcut — including its own
  // comment — so it failed while every suite was clean. A guard that reads
  // documentation as code measures nothing.
  const code = source => source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map(line => line.replace(/\/\/.*$/, ""))
    .join("\n")
  for (const name of ["signature-trust-contracts.test.mjs", "validate-schema-keywords.test.mjs", "review-backup-evidence-v2.test.mjs"]) {
    const source = code(readFileSync(join(root, name), "utf8"))
    assert.doesNotMatch(source, /uniqueItems\s*=\s*(false|true)/, `${name} mutates uniqueItems`)
    assert.doesNotMatch(source, /\.properties\.[A-Za-z_]+\.(uniqueItems|required|additionalProperties)\s*=/, `${name} mutates a published schema`)
    assert.doesNotMatch(source, /structuredClone\((registry|signature)Schema\)/, `${name} clones a published schema to alter it`)
  }
})
