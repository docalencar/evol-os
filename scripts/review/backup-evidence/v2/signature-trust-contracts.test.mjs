import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { canonicalBytes, parseCanonical, validateSchema } from "./validate-evidence-dag.mjs"

const root = dirname(fileURLToPath(import.meta.url))
const load = name => JSON.parse(readFileSync(join(root, name), "utf8"))
const signatureSchema = load("detached-signature.schema.json")
const registrySchema = load("trust-registry.schema.json")
const emptyRegistry = load("trust-registry.json")
const timePattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/
const purposes = new Set(["EVIDENCE_INTENT", "RETENTION_ATTESTATION", "RESTORE_ATTESTATION", "HUMAN_RISK_APPROVAL", "EVIDENCE_MANIFEST"])

const signature = () => ({
  document_type: "detached-signature",
  document_version: 1,
  key_id: "manifest-2026",
  key_purpose: "EVIDENCE_MANIFEST",
  payload_sha256: "a".repeat(64),
  signature_base64: `${"A".repeat(86)}==`,
  signature_profile: "ed25519",
})

const key = (overrides = {}) => ({
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

function validateRegistryContract(registry) {
  const structuralSchema = structuredClone(registrySchema)
  structuralSchema.properties.keys.uniqueItems = false
  validateSchema(registry, structuralSchema, "registry")
  const canonicalEntries = registry.keys.map(entry => canonicalBytes(entry).toString("utf8"))
  assert.equal(new Set(canonicalEntries).size, canonicalEntries.length, "duplicate item")
  const ids = new Set()
  const humanFingerprints = new Set()
  const technicalFingerprints = new Set()
  for (const entry of registry.keys) {
    assert.equal(typeof entry.test_only, "boolean", "test_only must be boolean")
    assert.ok(purposes.has(entry.key_purpose), "unknown purpose")
    assert.ok(timePattern.test(entry.not_before) && new Date(entry.not_before).toISOString() === entry.not_before, "invalid not_before")
    assert.ok(timePattern.test(entry.not_after) && new Date(entry.not_after).toISOString() === entry.not_after, "invalid not_after")
    assert.ok(Date.parse(entry.not_before) < Date.parse(entry.not_after), "invalid key validity")
    assert.ok(!ids.has(entry.key_id), "duplicate key_id")
    ids.add(entry.key_id)
    if (entry.status === "REVOKED") {
      assert.ok(Object.hasOwn(entry, "revoked_at"), "revoked_at required")
      assert.ok(timePattern.test(entry.revoked_at) && new Date(entry.revoked_at).toISOString() === entry.revoked_at, "invalid revoked_at")
    } else assert.ok(!Object.hasOwn(entry, "revoked_at"), "revoked_at forbidden")
    const target = entry.key_purpose === "HUMAN_RISK_APPROVAL" ? humanFingerprints : technicalFingerprints
    target.add(entry.public_key_spki_sha256)
  }
  for (const fingerprint of humanFingerprints) assert.ok(!technicalFingerprints.has(fingerprint), "human/technical fingerprint reuse")
  return registry
}

test("valid canonical detached signature", () => {
  const value = signature()
  validateSchema(value, signatureSchema, "signature")
  assert.deepEqual(parseCanonical(canonicalBytes(value), "signature"), value)
})

test("detached signature rejects missing, extra and wrong-typed fields", () => {
  const missing = signature(); delete missing.key_id
  assert.throws(() => validateSchema(missing, signatureSchema, "signature"), /missing key_id/)
  const extra = { ...signature(), extra: true }
  assert.throws(() => validateSchema(extra, signatureSchema, "signature"), /unknown extra/)
  assert.throws(() => validateSchema({ ...signature(), key_id: 1 }, signatureSchema, "signature"), /string required/)
})

test("detached signature rejects malformed hashes and strict Base64 violations", () => {
  for (const payload_sha256 of ["A".repeat(64), "a".repeat(63), `${"a".repeat(64)}=`]) {
    assert.throws(() => validateSchema({ ...signature(), payload_sha256 }, signatureSchema, "signature"), /pattern mismatch/)
  }
  for (const signature_base64 of ["", "AA==", `${"A".repeat(86)}=_`, `${"A".repeat(88)}`]) {
    assert.throws(() => validateSchema({ ...signature(), signature_base64 }, signatureSchema, "signature"), /pattern mismatch/)
  }
  for (const nonCanonicalTail of ["B", "C", "D"]) {
    assert.throws(() => validateSchema({ ...signature(), signature_base64: `${"A".repeat(85)}${nonCanonicalTail}==` }, signatureSchema, "signature"), /pattern mismatch/)
  }
})

test("detached signature restricts profile and purposes", () => {
  assert.throws(() => validateSchema({ ...signature(), signature_profile: "rsa" }, signatureSchema, "signature"), /const mismatch/)
  assert.throws(() => validateSchema({ ...signature(), key_purpose: "OTHER" }, signatureSchema, "signature"), /unknown enum/)
})

test("operational registry is canonical, strict and empty", () => {
  assert.deepEqual(emptyRegistry, { keys: [], registry_version: 1 })
  validateRegistryContract(emptyRegistry)
  assert.equal(readFileSync(join(root, "trust-registry.json"), "utf8"), '{"keys":[],"registry_version":1}\n')
})

test("future active and revoked registry entries satisfy the contract", () => {
  validateRegistryContract({ keys: [key()], registry_version: 1 })
  validateRegistryContract({ keys: [key({ status: "REVOKED", revoked_at: "2026-10-13T13:00:00.000Z" })], registry_version: 1 })
})

test("registry rejects unknown fields, missing fields and invalid types", () => {
  assert.throws(() => validateRegistryContract({ keys: [key({ extra: true })], registry_version: 1 }), /unknown extra/)
  const missing = key(); delete missing.public_key_path
  assert.throws(() => validateRegistryContract({ keys: [missing], registry_version: 1 }), /missing public_key_path/)
  assert.throws(() => validateRegistryContract({ keys: [key({ test_only: "false" })], registry_version: 1 }), /const mismatch|boolean/)
})

test("registry rejects malformed fingerprints, paths, purposes and algorithms", () => {
  assert.throws(() => validateRegistryContract({ keys: [key({ public_key_spki_sha256: "B".repeat(64) })], registry_version: 1 }), /pattern mismatch/)
  for (const public_key_path of ["/tmp/key.pem", "../key.pem", "keys/../key.pem", "keys\\key.pem", "keys/key.der"]) {
    assert.throws(() => validateRegistryContract({ keys: [key({ public_key_path })], registry_version: 1 }), /pattern mismatch/)
  }
  assert.throws(() => validateRegistryContract({ keys: [key({ key_purpose: "OTHER" })], registry_version: 1 }), /unknown enum/)
  assert.throws(() => validateRegistryContract({ keys: [key({ algorithm: "rsa" })], registry_version: 1 }), /const mismatch/)
})

test("registry rejects duplicate records and duplicate key identifiers", () => {
  const entry = key()
  assert.throws(() => validateRegistryContract({ keys: [entry, structuredClone(entry)], registry_version: 1 }), /duplicate item|duplicate key_id/)
  assert.throws(() => validateRegistryContract({ keys: [entry, key({ key_purpose: "RESTORE_ATTESTATION", public_key_spki_sha256: "c".repeat(64) })], registry_version: 1 }), /duplicate key_id/)
})

test("registry rejects inconsistent revocation and timestamps", () => {
  assert.throws(() => validateRegistryContract({ keys: [key({ status: "REVOKED" })], registry_version: 1 }), /revoked_at required/)
  assert.throws(() => validateRegistryContract({ keys: [key({ revoked_at: "2026-10-13T13:00:00.000Z" })], registry_version: 1 }), /revoked_at forbidden/)
  assert.throws(() => validateRegistryContract({ keys: [key({ not_before: "not-a-time" })], registry_version: 1 }), /pattern mismatch|invalid not_before/)
  assert.throws(() => validateRegistryContract({ keys: [key({ not_after: "2026-10-13T11:00:00.000Z" })], registry_version: 1 }), /invalid key validity/)
})

test("registry rejects material reuse between human and technical purposes", () => {
  const fingerprint = "d".repeat(64)
  const technical = key({ public_key_spki_sha256: fingerprint })
  const human = key({ key_id: "human-2026", key_purpose: "HUMAN_RISK_APPROVAL", public_key_path: "keys/human-2026.pem", public_key_spki_sha256: fingerprint })
  assert.throws(() => validateRegistryContract({ keys: [technical, human], registry_version: 1 }), /human\/technical fingerprint reuse/)
})

test("registry permits shared technical fingerprint but keeps distinct purposes explicit", () => {
  const fingerprint = "e".repeat(64)
  validateRegistryContract({ keys: [key({ public_key_spki_sha256: fingerprint }), key({ key_id: "restore-2026", key_purpose: "RESTORE_ATTESTATION", public_key_path: "keys/restore-2026.pem", public_key_spki_sha256: fingerprint })], registry_version: 1 })
})
