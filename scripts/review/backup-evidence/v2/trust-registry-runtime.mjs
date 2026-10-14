import { createHash, createPublicKey, verify as verifySignature } from "node:crypto"
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, realpathSync, statSync } from "node:fs"
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { parseCanonical, SchemaRejection, validateSchema } from "./validate-evidence-dag.mjs"

const moduleRoot = dirname(fileURLToPath(import.meta.url))
const canonicalRegistryPath = join(moduleRoot, "trust-registry.json")
const registrySchema = JSON.parse(readFileSync(join(moduleRoot, "trust-registry.schema.json"), "utf8"))
const signatureSchema = JSON.parse(readFileSync(join(moduleRoot, "detached-signature.schema.json"), "utf8"))
const documentContracts = new Map([
  ["operation-intent", { purpose: "EVIDENCE_INTENT", schema: "operation-intent.schema.json" }],
  ["historical-retention-proof", { purpose: "RETENTION_ATTESTATION", schema: "retention-proof.schema.json" }],
  ["restore-proof", { purpose: "RESTORE_ATTESTATION", schema: "restore-proof.schema.json" }],
  ["human-approval", { purpose: "HUMAN_RISK_APPROVAL", schema: "human-approval.schema.json" }],
  ["backup-evidence-manifest", { purpose: "EVIDENCE_MANIFEST", schema: "manifest.schema.json" }],
].map(([type, contract]) => [type, { ...contract, schema: JSON.parse(readFileSync(join(moduleRoot, contract.schema), "utf8")) }]))

const validatedStates = new WeakMap()
const technicalPurposes = new Set(["EVIDENCE_INTENT", "RETENTION_ATTESTATION", "RESTORE_ATTESTATION", "EVIDENCE_MANIFEST"])
const timePattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/

export class EvidenceRejection extends Error {}

const reject = message => { throw new EvidenceRejection(message) }
const digest = bytes => createHash("sha256").update(bytes).digest("hex")

function timestamp(value, label) {
  if (typeof value !== "string" || !timePattern.test(value)) reject(`${label}: invalid timestamp`)
  const milliseconds = Date.parse(value)
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) reject(`${label}: invalid timestamp`)
  return milliseconds
}

function trustedRoot(registryPath) {
  const registryStat = lstatSync(registryPath)
  if (registryStat.isSymbolicLink() || !registryStat.isFile()) throw new Error("trust registry: regular non-symlink file required")
  const root = realpathSync(dirname(registryPath))
  const rootStat = statSync(root)
  if (!rootStat.isDirectory() || (rootStat.mode & 0o022) !== 0) throw new Error("trust registry directory: insecure permissions")
  if (typeof process.getuid === "function" && rootStat.uid !== process.getuid()) throw new Error("trust registry directory: wrong owner")
  return root
}

function descriptorRead(filePath, label) {
  const before = lstatSync(filePath)
  if (before.isSymbolicLink() || !before.isFile()) throw new Error(`${label}: regular non-symlink file required`)
  if ((before.mode & 0o022) !== 0) throw new Error(`${label}: insecure permissions`)
  let descriptor
  try {
    descriptor = openSync(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW || 0))
    const opened = fstatSync(descriptor)
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) throw new Error(`${label}: file identity changed`)
    const bytes = readFileSync(descriptor)
    const after = fstatSync(descriptor)
    if (after.dev !== opened.dev || after.ino !== opened.ino || after.size !== bytes.length) throw new Error(`${label}: file identity changed`)
    return bytes
  } finally {
    if (descriptor !== undefined) closeSync(descriptor)
  }
}

function resolvePublicKey(root, publicKeyPath) {
  if (isAbsolute(publicKeyPath)) reject("public key escapes trust registry")
  const components = publicKeyPath.split("/")
  if (components.some(component => !component || component === "." || component === "..")) reject("public key escapes trust registry")
  let current = root
  for (const component of components) {
    current = join(current, component)
    const componentStat = lstatSync(current)
    if (componentStat.isSymbolicLink()) throw new Error("public key path: symlink forbidden")
  }
  const resolved = resolve(root, publicKeyPath)
  const lexicalRelative = relative(root, resolved)
  if (!lexicalRelative || lexicalRelative.startsWith(`..${sep}`) || lexicalRelative === ".." || isAbsolute(lexicalRelative)) reject("public key escapes trust registry")
  const real = realpathSync(resolved)
  const realRelative = relative(root, real)
  if (!realRelative || realRelative.startsWith(`..${sep}`) || realRelative === ".." || isAbsolute(realRelative)) reject("public key escapes trust registry")
  return real
}

function loadPublicKey(root, entry) {
  const keyPath = resolvePublicKey(root, entry.public_key_path)
  const keyBytes = descriptorRead(keyPath, `public key ${entry.key_id}`)
  const publicKey = createPublicKey(keyBytes)
  if (publicKey.asymmetricKeyType !== "ed25519") reject(`public key ${entry.key_id}: Ed25519 key required`)
  const spki = publicKey.export({ type: "spki", format: "der" })
  const fingerprint = digest(spki)
  if (fingerprint !== entry.public_key_spki_sha256) reject(`public key ${entry.key_id}: SPKI fingerprint mismatch`)
  return { fingerprint, publicKey }
}

function validateRegistrySemantics(value, root) {
  const entries = new Map(), humanFingerprints = new Set(), technicalFingerprints = new Set()
  for (const entry of value.keys) {
    if (entries.has(entry.key_id)) reject(`trust registry: duplicate key_id ${entry.key_id}`)
    const notBefore = timestamp(entry.not_before, `key ${entry.key_id}.not_before`)
    const notAfter = timestamp(entry.not_after, `key ${entry.key_id}.not_after`)
    if (notBefore >= notAfter) reject(`key ${entry.key_id}: invalid key validity window`)
    const loaded = loadPublicKey(root, entry)
    const record = Object.freeze({ ...entry, ...loaded, notAfter, notBefore })
    entries.set(entry.key_id, record)
    if (entry.key_purpose === "HUMAN_RISK_APPROVAL") humanFingerprints.add(loaded.fingerprint)
    else if (technicalPurposes.has(entry.key_purpose)) technicalFingerprints.add(loaded.fingerprint)
    else reject(`key ${entry.key_id}: unsupported purpose`)
  }
  for (const fingerprint of humanFingerprints) if (technicalFingerprints.has(fingerprint)) reject("trust registry: human/technical fingerprint reuse")
  return entries
}

export function loadOfflineTrustRegistry(registryPath) {
  if (typeof registryPath !== "string" || !registryPath) throw new TypeError("registry path required")
  const root = trustedRoot(registryPath)
  const raw = descriptorRead(realpathSync(registryPath), "trust registry")
  const value = parseCanonical(raw, "trust registry")
  validateSchema(value, registrySchema, "trust registry")
  const entries = validateRegistrySemantics(value, root)
  const state = Object.freeze({ keyCount: entries.size, source: realpathSync(registryPath) })
  validatedStates.set(state, { entries })
  return state
}

export function loadCanonicalTrustRegistry() {
  return loadOfflineTrustRegistry(canonicalRegistryPath)
}

function strictSignatureBytes(value) {
  const bytes = Buffer.from(value, "base64")
  if (bytes.length !== 64 || bytes.toString("base64") !== value) reject("signature: strict 64-byte Base64 required")
  return bytes
}

export function verifySignedDocumentOffline({ envelopeBytes, payloadBytes, registryState, verificationInstant } = {}) {
  if (verificationInstant === undefined) reject("verification instant required")
  const state = validatedStates.get(registryState)
  if (!state) throw new TypeError("validated registry state required")
  const verificationTime = timestamp(verificationInstant, "verification instant")
  const payload = parseCanonical(payloadBytes, "payload")
  const envelope = parseCanonical(envelopeBytes, "signature envelope")
  validateSchema(envelope, signatureSchema, "signature envelope")
  const contract = documentContracts.get(payload?.document_type)
  if (!contract) reject("payload: unsupported document type")
  validateSchema(payload, contract.schema, "payload")
  if (payload.key_purpose !== contract.purpose || envelope.key_purpose !== contract.purpose) reject("signature purpose mismatch")
  if (envelope.key_id !== payload.key_id) reject("signature key_id mismatch")
  if (envelope.signature_profile !== "ed25519" || payload.signature_profile && payload.signature_profile !== "ed25519") reject("signature profile mismatch")
  if (envelope.payload_sha256 !== digest(payloadBytes)) reject("signature payload hash mismatch")
  const entry = state.entries.get(payload.key_id)
  if (!entry) reject(`signature: unknown key_id ${payload.key_id}`)
  if (entry.key_purpose !== contract.purpose) reject("trust registry purpose mismatch")
  if (entry.algorithm !== "ed25519") reject("trust registry algorithm mismatch")
  if (entry.status === "REVOKED") reject("signature: revoked key refused")
  if (entry.status !== "ACTIVE") reject("signature: inactive key refused")
  if (entry.test_only === true) reject("signature: test-only key refused")
  const issuedAt = timestamp(payload.issued_at, "payload.issued_at")
  const expiresAt = timestamp(payload.expires_at, "payload.expires_at")
  if (!(entry.notBefore <= issuedAt && issuedAt < expiresAt && expiresAt <= entry.notAfter)) reject("signature temporal binding failed")
  if (!(issuedAt <= verificationTime && verificationTime < expiresAt)) reject("document validity failed")
  const signature = strictSignatureBytes(envelope.signature_base64)
  if (!verifySignature(null, payloadBytes, entry.publicKey, signature)) reject("signature: invalid Ed25519 signature")
  return Object.freeze({ documentType: payload.document_type, keyId: payload.key_id, keyPurpose: contract.purpose, payloadSha256: envelope.payload_sha256 })
}

export function verifyWithCanonicalTrustRegistry(options) {
  return verifySignedDocumentOffline({ ...options, registryState: loadCanonicalTrustRegistry() })
}

export { SchemaRejection }
