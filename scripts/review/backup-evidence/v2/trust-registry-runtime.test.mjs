import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash, createPublicKey, generateKeyPairSync, sign } from "node:crypto"
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import { canonicalBytes, sha256 } from "./validate-evidence-dag.mjs"
import {
  EvidenceRejection,
  loadCanonicalTrustRegistry,
  loadOfflineTrustRegistry,
  verifySignedDocumentOffline,
  verifyWithCanonicalTrustRegistry,
} from "./trust-registry-runtime.mjs"

const h = value => createHash("sha256").update(value).digest("hex")
const time = hours => new Date(Date.UTC(2026, 9, 14, 12 + hours)).toISOString()

function documents() {
  const operationIntent = { approved_rpo_seconds: 14400, approved_rto_seconds: 28800, digest_profile: "sha256", document_type: "operation-intent", document_version: 2, encryption_profile: "age-x25519-v1", environment: "review", evidence_id: "11111111-1111-4111-8111-111111111111", execute_not_after: time(9), execute_not_before: time(4), expires_at: time(9), external_exclusions: ["storage_objects"], issued_at: time(0), key_id: "intent", key_purpose: "EVIDENCE_INTENT", ledger_from: "0142", ledger_to: "0146", migration_sha256: { "0143": h("a"), "0144": h("b"), "0145": h("c"), "0146": h("d") }, minimum_post_retention_seconds: 259200, operation_id: "review-0143-0146", postgres_major: 17, project_ref: "rwfvxvbzaosgcyfxdjpt", promotion_max_duration_seconds: 1800, retention_profile: "s3-object-lock-compliance-v1", runner_sha256: h("e"), signature_profile: "ed25519", source_commit: "f".repeat(40) }
  const operationHash = sha256(operationIntent)
  const objectIdentity = copy => ({ bucket_arn: `arn:aws:s3:::review-${copy}`, object_key: "review/bundle.age", provider_account_id: "123456789012", region: "us-east-1", version_id: `version-${copy}` })
  const retention = copy => ({ copy_id: copy, descriptor_sha256: h(`descriptor-${copy}`), document_type: "historical-retention-proof", document_version: 1, evidence_id: operationIntent.evidence_id, expires_at: time(8), issued_at: time(2), key_id: "retention", key_purpose: "RETENTION_ATTESTATION", lock_mode: "COMPLIANCE", object_identity: objectIdentity(copy), observed_at: time(2), operation_id: operationIntent.operation_id, operation_intent_sha256: operationHash, provider_request_id: `request-${copy}`, provider_response_sha256: h(`response-${copy}`), retain_until: time(80), retention_profile: "s3-object-lock-compliance-v1" })
  const retentionA = retention("copy-a"), retentionB = retention("copy-b")
  const restoreProof = { acl_pass: true, ciphertext_descriptor_sha256: [h("descriptor-copy-a"), h("descriptor-copy-b")], data_pass: true, database_dump_sha256: h("dump"), decryption_authenticated: true, document_type: "restore-proof", document_version: 2, evidence_id: operationIntent.evidence_id, expires_at: time(8), fingerprint: h("fingerprint"), issued_at: time(3), key_id: "restore", key_purpose: "RESTORE_ATTESTATION", ledger_max: "0142", operation_id: operationIntent.operation_id, operation_intent_sha256: operationHash, plaintext_bundle_sha256: h("plain"), policy_bodies_pass: true, postgres_major: 17, restore_duration_seconds: 42, restored_at: time(3), restored_copy_id: "copy-a", retention_proof_sha256: [sha256(retentionA), sha256(retentionB)], rls_pass: true, schema_pass: true, teardown_pass: true }
  const humanApproval = { accepted_rpo_seconds: 14400, accepted_rto_seconds: 28800, approver_id: "human-reviewer", decision: "APPROVED", document_type: "human-approval", document_version: 1, environment: "review", evidence_id: operationIntent.evidence_id, execute_not_after: time(9), execute_not_before: time(4), expires_at: time(9), external_exclusions_sha256: sha256(operationIntent.external_exclusions), issued_at: time(4), key_id: "human", key_purpose: "HUMAN_RISK_APPROVAL", operation_id: operationIntent.operation_id, operation_intent_sha256: operationHash, project_ref: operationIntent.project_ref, promotion_max_duration_seconds: 1800, residual_risk_profile: ["logical_backup_exclusions"], restore_proof_sha256: sha256(restoreProof), retention_proof_sha256: [sha256(retentionA), sha256(retentionB)] }
  const manifest = { ciphertext_descriptor_sha256: [h("descriptor-copy-a"), h("descriptor-copy-b")], document_type: "backup-evidence-manifest", document_version: 2, environment: "review", evidence_id: operationIntent.evidence_id, expires_at: time(9), human_approval_sha256: sha256(humanApproval), issued_at: time(4), key_id: "manifest", key_purpose: "EVIDENCE_MANIFEST", operation_id: operationIntent.operation_id, operation_intent_sha256: operationHash, project_ref: operationIntent.project_ref, restore_proof_sha256: sha256(restoreProof), retention_proof_sha256: [sha256(retentionA), sha256(retentionB)] }
  return [operationIntent, retentionA, retentionB, restoreProof, humanApproval, manifest]
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "evol-b1b3-"))
  chmodSync(root, 0o700)
  const keysRoot = join(root, "keys")
  mkdirSync(keysRoot, { mode: 0o700 })
  const privateKeys = new Map(), entries = []
  const purposeById = new Map([["intent", "EVIDENCE_INTENT"], ["retention", "RETENTION_ATTESTATION"], ["restore", "RESTORE_ATTESTATION"], ["human", "HUMAN_RISK_APPROVAL"], ["manifest", "EVIDENCE_MANIFEST"]])
  for (const [keyId, keyPurpose] of purposeById) {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519")
    const der = publicKey.export({ type: "spki", format: "der" })
    const pem = publicKey.export({ type: "spki", format: "pem" })
    const publicKeyPath = `keys/${keyId}.pem`
    writeFileSync(join(root, publicKeyPath), pem, { mode: 0o600 })
    privateKeys.set(keyId, privateKey)
    entries.push({ algorithm: "ed25519", key_id: keyId, key_purpose: keyPurpose, not_after: time(10), not_before: time(-1), public_key_path: publicKeyPath, public_key_spki_sha256: h(der), status: "ACTIVE", test_only: false })
  }
  const registryPath = join(root, "trust-registry.json")
  const writeRegistry = keys => writeFileSync(registryPath, canonicalBytes({ keys, registry_version: 1 }), { mode: 0o600 })
  writeRegistry(entries)
  return { cleanup: () => rmSync(root, { recursive: true, force: true }), documents: documents(), entries, keysRoot, privateKeys, registryPath, root, writeRegistry }
}

function envelope(document, privateKey, overrides = {}, signedBytes = canonicalBytes(document)) {
  const payloadBytes = canonicalBytes(document)
  return { document_type: "detached-signature", document_version: 1, key_id: document.key_id, key_purpose: document.key_purpose, payload_sha256: h(payloadBytes), signature_base64: sign(null, signedBytes, privateKey).toString("base64"), signature_profile: "ed25519", ...overrides }
}

const withFixture = callback => {
  const value = fixture()
  try { return callback(value) } finally { value.cleanup() }
}

const verify = (value, document, changes = {}) => {
  const state = changes.registryState ?? loadOfflineTrustRegistry(value.registryPath)
  const signature = changes.envelope ?? envelope(document, value.privateKeys.get(document.key_id), changes.envelopeOverrides, changes.signedBytes)
  return verifySignedDocumentOffline({ envelopeBytes: changes.envelopeBytes ?? canonicalBytes(signature), payloadBytes: changes.payloadBytes ?? canonicalBytes(document), registryState: state, verificationInstant: changes.verificationInstant ?? time(5) })
}

test("valid Ed25519 signatures cover all five purposes and six documents", () => withFixture(value => {
  for (const document of value.documents) assert.equal(verify(value, document).keyPurpose, document.key_purpose)
}))

test("altered payload, invalid signature and signature over wrong bytes fail closed", () => withFixture(value => {
  const document = value.documents[5], originalEnvelope = envelope(document, value.privateKeys.get("manifest"))
  assert.throws(() => verify(value, { ...document, evidence_id: "22222222-2222-4222-8222-222222222222" }, { envelope: originalEnvelope }), /payload hash/)
  const bytes = Buffer.from(originalEnvelope.signature_base64, "base64"); bytes[0] ^= 1
  assert.throws(() => verify(value, document, { envelope: { ...originalEnvelope, signature_base64: bytes.toString("base64") } }), /invalid Ed25519 signature/)
  assert.throws(() => verify(value, document, { signedBytes: Buffer.concat([canonicalBytes(document), Buffer.from("x")]) }), /invalid Ed25519 signature/)
}))

test("noncanonical payload and incorrect payload hash are rejected", () => withFixture(value => {
  const document = value.documents[5]
  const noncanonical = Buffer.from(canonicalBytes(document).toString("utf8").replace("{", "{ "))
  assert.throws(() => verify(value, document, { payloadBytes: noncanonical }), /non-canonical/)
  assert.throws(() => verify(value, document, { envelopeOverrides: { payload_sha256: "0".repeat(64) } }), /payload hash/)
}))

test("unknown key and empty canonical registry reject verification", () => withFixture(value => {
  const document = value.documents[5]
  const unknown = { ...document, key_id: "unknown" }
  assert.throws(() => verify(value, unknown, { envelope: envelope(unknown, value.privateKeys.get("manifest")) }), /unknown key_id/)
  const canonical = loadCanonicalTrustRegistry()
  assert.equal(canonical.keyCount, 0)
  assert.throws(() => verifyWithCanonicalTrustRegistry({ envelopeBytes: canonicalBytes(envelope(document, value.privateKeys.get("manifest"))), payloadBytes: canonicalBytes(document), verificationInstant: time(5) }), /unknown key_id/)
}))

test("duplicate key identifiers invalidate the entire registry", () => withFixture(value => {
  value.writeRegistry([...value.entries, { ...value.entries[0], key_purpose: "RESTORE_ATTESTATION", public_key_path: value.entries[2].public_key_path, public_key_spki_sha256: value.entries[2].public_key_spki_sha256 }])
  assert.throws(() => loadOfflineTrustRegistry(value.registryPath), /duplicate key_id/)
}))

test("human and technical fingerprints are separate while technical sharing is allowed", () => withFixture(value => {
  const reused = value.entries.map(entry => entry.key_id === "human" ? { ...entry, public_key_path: value.entries[0].public_key_path, public_key_spki_sha256: value.entries[0].public_key_spki_sha256 } : entry)
  value.writeRegistry(reused)
  assert.throws(() => loadOfflineTrustRegistry(value.registryPath), /human.*technical|fingerprint reuse/)
  const shared = value.entries.map(entry => entry.key_id === "restore" ? { ...entry, public_key_path: value.entries[0].public_key_path, public_key_spki_sha256: value.entries[0].public_key_spki_sha256 } : entry)
  value.writeRegistry(shared)
  assert.doesNotThrow(() => loadOfflineTrustRegistry(value.registryPath))
}))

test("SPKI fingerprint mismatch and non-Ed25519 public keys reject the registry", () => withFixture(value => {
  value.writeRegistry(value.entries.map(entry => entry.key_id === "manifest" ? { ...entry, public_key_spki_sha256: "0".repeat(64) } : entry))
  assert.throws(() => loadOfflineTrustRegistry(value.registryPath), /SPKI fingerprint mismatch/)
  const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
  const pem = publicKey.export({ type: "spki", format: "pem" }), der = publicKey.export({ type: "spki", format: "der" })
  writeFileSync(join(value.keysRoot, "manifest.pem"), pem, { mode: 0o600 })
  value.writeRegistry(value.entries.map(entry => entry.key_id === "manifest" ? { ...entry, public_key_spki_sha256: h(der) } : entry))
  assert.throws(() => loadOfflineTrustRegistry(value.registryPath), /Ed25519 key required/)
}))

test("revoked and test-only keys always reject", () => withFixture(value => {
  const document = value.documents[5]
  value.writeRegistry(value.entries.map(entry => entry.key_id === "manifest" ? { ...entry, revoked_at: time(1), status: "REVOKED" } : entry))
  assert.throws(() => verify(value, document), /revoked key/)
  value.writeRegistry(value.entries.map(entry => entry.key_id === "manifest" ? { ...entry, test_only: true } : entry))
  assert.throws(() => verify(value, document), /test-only key/)
}))

test("invalid key windows and payloads outside their key window reject", () => withFixture(value => {
  value.writeRegistry(value.entries.map(entry => entry.key_id === "manifest" ? { ...entry, not_before: time(10), not_after: time(-1) } : entry))
  assert.throws(() => loadOfflineTrustRegistry(value.registryPath), /key validity window/)
  value.writeRegistry(value.entries.map(entry => entry.key_id === "manifest" ? { ...entry, not_before: time(5) } : entry))
  assert.throws(() => verify(value, value.documents[5]), /temporal binding/)
}))

test("expired and not-yet-valid payloads reject; exact boundaries are enforced", () => withFixture(value => {
  const document = value.documents[5]
  assert.throws(() => verify(value, document, { verificationInstant: document.expires_at }), /document validity/)
  assert.throws(() => verify(value, document, { verificationInstant: time(3) }), /document validity/)
  assert.doesNotThrow(() => verify(value, document, { verificationInstant: document.issued_at }))
  const bounded = { ...document, issued_at: time(-1), expires_at: time(10) }
  assert.doesNotThrow(() => verify(value, bounded))
}))

test("a partially invalid registry fails before key resolution", () => withFixture(value => {
  value.writeRegistry(value.entries.map(entry => entry.key_id === "intent" ? { ...entry, public_key_spki_sha256: "0".repeat(64) } : entry))
  assert.throws(() => verify(value, value.documents[5]), /SPKI fingerprint mismatch/)
}))

test("strict Base64 and signature length are enforced", () => withFixture(value => {
  const document = value.documents[5]
  assert.throws(() => verify(value, document, { envelopeOverrides: { signature_base64: "not-base64" } }), /pattern mismatch|Base64/)
  assert.throws(() => verify(value, document, { envelopeOverrides: { signature_base64: Buffer.alloc(63).toString("base64") } }), /pattern mismatch|64-byte/)
}))

test("missing, symlinked, special and escaping key paths fail closed", () => withFixture(value => {
  const manifestEntry = value.entries.find(entry => entry.key_id === "manifest")
  rmSync(join(value.root, manifestEntry.public_key_path))
  assert.throws(() => loadOfflineTrustRegistry(value.registryPath), /ENOENT|missing|unreadable/)
  writeFileSync(join(value.root, manifestEntry.public_key_path), "not used", { mode: 0o600 })
  const target = join(value.keysRoot, "target.pem"); writeFileSync(target, "target", { mode: 0o600 }); rmSync(join(value.root, manifestEntry.public_key_path)); symlinkSync(target, join(value.root, manifestEntry.public_key_path))
  assert.throws(() => loadOfflineTrustRegistry(value.registryPath), /symlink|regular/)
  rmSync(join(value.root, manifestEntry.public_key_path)); execFileSync("mkfifo", [join(value.root, manifestEntry.public_key_path)])
  assert.throws(() => loadOfflineTrustRegistry(value.registryPath), /regular/)
  value.writeRegistry(value.entries.map(entry => entry.key_id === "manifest" ? { ...entry, public_key_path: "../escape.pem" } : entry))
  assert.throws(() => loadOfflineTrustRegistry(value.registryPath), /pattern mismatch|escapes/)
}))

test("writable key files and symlinked path components fail closed", () => withFixture(value => {
  const manifestPath = join(value.keysRoot, "manifest.pem")
  chmodSync(manifestPath, 0o666)
  assert.throws(() => loadOfflineTrustRegistry(value.registryPath), /insecure permissions/)
  chmodSync(manifestPath, 0o600)
  symlinkSync(value.keysRoot, join(value.root, "linked-keys"))
  value.writeRegistry(value.entries.map(entry => entry.key_id === "manifest" ? { ...entry, public_key_path: "linked-keys/manifest.pem" } : entry))
  assert.throws(() => loadOfflineTrustRegistry(value.registryPath), /symlink/)
}))

test("validated descriptor state survives later key-file replacement", () => withFixture(value => {
  const state = loadOfflineTrustRegistry(value.registryPath), document = value.documents[5]
  const { publicKey } = generateKeyPairSync("ed25519")
  writeFileSync(join(value.keysRoot, "manifest.pem"), publicKey.export({ type: "spki", format: "pem" }), { mode: 0o600 })
  assert.doesNotThrow(() => verify(value, document, { registryState: state }))
}))

test("I/O and internal faults are not converted into invalid signature", () => withFixture(value => {
  rmSync(join(value.keysRoot, "manifest.pem"))
  assert.throws(() => loadOfflineTrustRegistry(value.registryPath), error => !(error instanceof EvidenceRejection) && /ENOENT|unreadable/.test(error.message))
  assert.throws(() => verifySignedDocumentOffline({ envelopeBytes: Buffer.alloc(0), payloadBytes: Symbol("fault"), registryState: {}, verificationInstant: time(5) }), TypeError)
}))

test("purpose, identity and cryptographic profile divergence reject", () => withFixture(value => {
  const document = value.documents[5]
  assert.throws(() => verify(value, document, { envelopeOverrides: { key_purpose: "RESTORE_ATTESTATION" } }), /purpose mismatch/)
  assert.throws(() => verify(value, document, { envelopeOverrides: { key_id: "restore" } }), /key_id mismatch/)
  assert.throws(() => verify(value, document, { envelopeOverrides: { signature_profile: "rsa" } }), /const mismatch|profile/)
}))

test("verification instant is mandatory", () => withFixture(value => {
  const state = loadOfflineTrustRegistry(value.registryPath), document = value.documents[5], signature = envelope(document, value.privateKeys.get("manifest"))
  assert.throws(() => verifySignedDocumentOffline({ envelopeBytes: canonicalBytes(signature), payloadBytes: canonicalBytes(document), registryState: state }), /verification instant required/)
}))

test("canonical operational loader has no authority and accepts no override", () => withFixture(value => {
  assert.equal(loadCanonicalTrustRegistry.length, 0)
  assert.equal(loadCanonicalTrustRegistry().keyCount, 0)
  assert.equal(verifyWithCanonicalTrustRegistry.length, 1)
  assert.throws(() => verifyWithCanonicalTrustRegistry({ envelopeBytes: canonicalBytes(envelope(value.documents[5], value.privateKeys.get("manifest"))), payloadBytes: canonicalBytes(value.documents[5]), registryPath: value.registryPath, verificationInstant: time(5) }), /unknown key_id/)
}))
