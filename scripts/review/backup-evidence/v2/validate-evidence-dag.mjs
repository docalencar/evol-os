import { createHash } from "node:crypto"

export function canonical(value, ancestors = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value)
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new Error("canonical JSON: invalid number")
    return JSON.stringify(value)
  }
  if (typeof value !== "object") throw new Error("canonical JSON: unsupported value")
  if (ancestors.has(value)) throw new Error("canonical JSON: cyclic value")
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new Error("canonical JSON: plain object required")
  }
  if (!Array.isArray(value) && Reflect.ownKeys(value).length !== Object.keys(value).length) throw new Error("canonical JSON: non-JSON property")
  ancestors.add(value)
  try {
    if (Array.isArray(value)) {
      const ownKeys = Reflect.ownKeys(value)
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length")
      if (!lengthDescriptor || lengthDescriptor.value !== value.length || lengthDescriptor.enumerable || lengthDescriptor.configurable || !lengthDescriptor.writable || Object.hasOwn(lengthDescriptor, "get") || Object.hasOwn(lengthDescriptor, "set")) throw new Error("canonical JSON: anomalous array length")
      if (ownKeys.length !== value.length + 1 || ownKeys.some(key => typeof key !== "string" || (key !== "length" && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length)))) throw new Error("canonical JSON: sparse or decorated array")
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
        if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable || !descriptor.configurable || !descriptor.writable || Object.hasOwn(descriptor, "get") || Object.hasOwn(descriptor, "set")) throw new Error("canonical JSON: anomalous array index")
      }
      return `[${value.map(item => canonical(item, ancestors)).join(",")}]`
    }
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key], ancestors)}`).join(",")}}`
  } finally {
    ancestors.delete(value)
  }
}

export const canonicalBytes = value => Buffer.from(`${canonical(value)}\n`, "utf8")
export const sha256 = value => createHash("sha256").update(Buffer.isBuffer(value) ? value : canonicalBytes(value)).digest("hex")

export function parseCanonical(raw, label = "document") {
  if (!Buffer.isBuffer(raw)) raw = Buffer.from(raw, "utf8")
  const text = raw.toString("utf8")
  let value
  try { value = JSON.parse(text) } catch { throw new Error(`${label}: invalid JSON`) }
  if (!raw.equals(canonicalBytes(value))) throw new Error(`${label}: non-canonical or ambiguous JSON`)
  return value
}

const timePattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function resolveRef(root, ref) {
  if (!ref.startsWith("#/$defs/")) throw new Error(`unsupported schema reference: ${ref}`)
  const value = root.$defs?.[ref.slice(8)]
  if (!value) throw new Error(`missing schema reference: ${ref}`)
  return value
}

/**
 * A rejection of the document, as opposed to a fault in the validator itself.
 *
 * `if` needs to know whether a subschema matched, which means catching. A bare
 * `catch` would also swallow a programming fault — a TypeError, a bad $ref —
 * and silently read it as "if = false", turning a broken validator into a
 * permissive one. Only this class is treated as "did not match"; anything else
 * propagates.
 */
export class SchemaRejection extends Error {}

const reject = message => { throw new SchemaRejection(message) }

/** Did `value` match `schema`? Validation rejections answer no; faults propagate. */
function matches(value, schema, label, root) {
  try {
    validateSchema(value, schema, label, root)
    return true
  } catch (error) {
    if (error instanceof SchemaRejection) return false
    throw error
  }
}

const isPlainObject = value => Boolean(value) && typeof value === "object" && !Array.isArray(value)

/** `required`, `additionalProperties` and `properties`, for an object instance. */
function applyObjectKeywords(value, schema, label, root) {
  for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) reject(`${label}: missing ${key}`)
  if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!Object.hasOwn(schema.properties ?? {}, key)) reject(`${label}: unknown ${key}`)
  for (const [key, child] of Object.entries(schema.properties ?? {})) if (Object.hasOwn(value, key)) validateSchema(value[key], child, `${label}.${key}`, root)
}

export function validateSchema(value, schema, label = "document", root = schema) {
  if (schema.$ref) return validateSchema(value, resolveRef(root, schema.$ref), label, root)
  if (Object.hasOwn(schema, "const") && value !== schema.const) reject(`${label}: const mismatch`)
  if (schema.enum && !schema.enum.includes(value)) reject(`${label}: unknown enum value`)
  for (const subschema of schema.allOf ?? []) validateSchema(value, subschema, label, root)
  if (schema.not && matches(value, schema.not, label, root)) reject(`${label}: must not match the forbidden subschema`)
  if (schema.if) {
    const branch = matches(value, schema.if, label, root) ? schema.then : schema.else
    if (branch) validateSchema(value, branch, label, root)
  }
  // Object applicators are independent of `type`, which is what the published
  // registry schema relies on: its `if`, `then` and `else` subschemas are
  // `{ required: [...] }` and `{ not: { required: [...] } }` with no `type`, so
  // gating them behind `type === "object"` left every conditional clause inert.
  if (schema.type === undefined && isPlainObject(value)) applyObjectKeywords(value, schema, label, root)

  if (schema.type === "boolean") {
    if (typeof value !== "boolean") reject(`${label}: boolean required`)
  } else if (schema.type === "object") {
    if (!isPlainObject(value)) reject(`${label}: object required`)
    applyObjectKeywords(value, schema, label, root)
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) reject(`${label}: array required`)
    if (schema.minItems !== undefined && value.length < schema.minItems) reject(`${label}: too few items`)
    if (schema.maxItems !== undefined && value.length > schema.maxItems) reject(`${label}: too many items`)
    if (schema.uniqueItems && new Set(value.map(item => canonical(item))).size !== value.length) reject(`${label}: duplicate item`)
    value.forEach((item, index) => validateSchema(item, schema.items, `${label}[${index}]`, root))
  } else if (schema.type === "string") {
    if (typeof value !== "string") reject(`${label}: string required`)
    if (schema.minLength !== undefined && value.length < schema.minLength) reject(`${label}: empty string`)
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) reject(`${label}: pattern mismatch`)
    if (schema.format === "uuid" && !uuidPattern.test(value)) reject(`${label}: invalid UUID`)
    if (schema.format === "date-time" && (!timePattern.test(value) || new Date(Date.parse(value)).toISOString() !== value)) reject(`${label}: invalid timestamp`)
  } else if (schema.type === "integer") {
    if (!Number.isInteger(value)) reject(`${label}: integer required`)
    if (schema.minimum !== undefined && value < schema.minimum) reject(`${label}: below minimum`)
    if (schema.maximum !== undefined && value > schema.maximum) reject(`${label}: above maximum`)
  }
  return value
}

function sameIdentity(left, right) { return canonical(left) === canonical(right) }
function exactArray(actual, expected, label) {
  if (canonical(actual) !== canonical(expected)) throw new Error(`${label}: hash binding mismatch`)
}

export function validateEvidenceDag(bundle, schemas) {
  const required = ["operationIntent", "descriptors", "retentionProofs", "restoreProof", "humanApproval", "manifest"]
  for (const key of required) if (!Object.hasOwn(bundle, key)) throw new Error(`DAG: missing ${key}`)
  if (Object.keys(bundle).some(key => !required.includes(key))) throw new Error("DAG: unknown document")
  if (!Array.isArray(bundle.descriptors) || bundle.descriptors.length !== 2) throw new Error("DAG: exactly two descriptors required")
  if (!Array.isArray(bundle.retentionProofs) || bundle.retentionProofs.length !== 2) throw new Error("DAG: exactly two retention proofs required")

  validateSchema(bundle.operationIntent, schemas.operationIntent, "operationIntent")
  bundle.descriptors.forEach((value, i) => validateSchema(value, schemas.ciphertextDescriptor, `descriptor[${i}]`))
  bundle.retentionProofs.forEach((value, i) => validateSchema(value, schemas.retentionProof, `retentionProof[${i}]`))
  validateSchema(bundle.restoreProof, schemas.restoreProof, "restoreProof")
  validateSchema(bundle.humanApproval, schemas.humanApproval, "humanApproval")
  validateSchema(bundle.manifest, schemas.manifest, "manifest")

  const signedDocuments = [bundle.operationIntent, ...bundle.retentionProofs, bundle.restoreProof, bundle.humanApproval, bundle.manifest]
  const purposeByKeyId = new Map()
  for (const document of signedDocuments) {
    const priorPurpose = purposeByKeyId.get(document.key_id)
    if (priorPurpose && priorPurpose !== document.key_purpose) throw new Error("DAG: key_id reused across incompatible purposes")
    purposeByKeyId.set(document.key_id, document.key_purpose)
  }

  const operationHash = sha256(bundle.operationIntent)
  const descriptorByCopy = new Map(bundle.descriptors.map(value => [value.copy_id, value]))
  const retentionByCopy = new Map(bundle.retentionProofs.map(value => [value.copy_id, value]))
  if (descriptorByCopy.size !== 2 || !descriptorByCopy.has("copy-a") || !descriptorByCopy.has("copy-b")) throw new Error("DAG: duplicate descriptor")
  if (retentionByCopy.size !== 2 || !retentionByCopy.has("copy-a") || !retentionByCopy.has("copy-b")) throw new Error("DAG: duplicate retention proof")
  const descriptors = [descriptorByCopy.get("copy-a"), descriptorByCopy.get("copy-b")]
  const retentionProofs = [retentionByCopy.get("copy-a"), retentionByCopy.get("copy-b")]
  if (sameIdentity(descriptors[0].object_identity, descriptors[1].object_identity)) throw new Error("DAG: storage object reused")
  if (descriptors[0].failure_domain_id === descriptors[1].failure_domain_id) throw new Error("DAG: failure domain reused")
  if (descriptors[0].ciphertext_sha256 !== descriptors[1].ciphertext_sha256 || descriptors[0].plaintext_bundle_sha256 !== descriptors[1].plaintext_bundle_sha256) throw new Error("DAG: copies diverge")

  const identity = bundle.operationIntent
  const assertIdentity = (value, label) => {
    if (value.operation_id !== identity.operation_id || value.evidence_id !== identity.evidence_id) throw new Error(`${label}: operation identity mismatch`)
    if (value.operation_intent_sha256 !== operationHash) throw new Error(`${label}: operation hash mismatch`)
  }
  descriptors.forEach((value, i) => assertIdentity(value, `descriptor[${i}]`))
  retentionProofs.forEach((value, i) => {
    assertIdentity(value, `retentionProof[${i}]`)
    const descriptor = descriptorByCopy.get(value.copy_id)
    if (value.descriptor_sha256 !== sha256(descriptor) || !sameIdentity(value.object_identity, descriptor.object_identity)) throw new Error(`retentionProof[${i}]: descriptor binding mismatch`)
  })

  const descriptorHashes = descriptors.map(sha256)
  const retentionHashes = retentionProofs.map(sha256)
  assertIdentity(bundle.restoreProof, "restoreProof")
  exactArray(bundle.restoreProof.ciphertext_descriptor_sha256, descriptorHashes, "restoreProof descriptors")
  exactArray(bundle.restoreProof.retention_proof_sha256, retentionHashes, "restoreProof retention")
  if (bundle.restoreProof.plaintext_bundle_sha256 !== descriptors[0].plaintext_bundle_sha256) throw new Error("restoreProof: plaintext mismatch")

  assertIdentity(bundle.humanApproval, "humanApproval")
  if (bundle.humanApproval.restore_proof_sha256 !== sha256(bundle.restoreProof)) throw new Error("humanApproval: restore binding mismatch")
  exactArray(bundle.humanApproval.retention_proof_sha256, retentionHashes, "humanApproval retention")
  if (bundle.humanApproval.accepted_rpo_seconds !== identity.approved_rpo_seconds || bundle.humanApproval.accepted_rto_seconds !== identity.approved_rto_seconds) throw new Error("humanApproval: RPO/RTO mismatch")
  if (bundle.humanApproval.external_exclusions_sha256 !== sha256(identity.external_exclusions)) throw new Error("humanApproval: exclusions mismatch")
  if (bundle.humanApproval.execute_not_before !== identity.execute_not_before || bundle.humanApproval.execute_not_after !== identity.execute_not_after) throw new Error("humanApproval: execution window mismatch")

  const manifest = bundle.manifest
  if (manifest.operation_id !== identity.operation_id || manifest.evidence_id !== identity.evidence_id || manifest.operation_intent_sha256 !== operationHash) throw new Error("manifest: operation mismatch")
  exactArray(manifest.ciphertext_descriptor_sha256, descriptorHashes, "manifest descriptors")
  exactArray(manifest.retention_proof_sha256, retentionHashes, "manifest retention")
  if (manifest.restore_proof_sha256 !== sha256(bundle.restoreProof) || manifest.human_approval_sha256 !== sha256(bundle.humanApproval)) throw new Error("manifest: proof binding mismatch")

  const nodeHashes = new Set([operationHash, ...descriptorHashes, ...retentionHashes, sha256(bundle.restoreProof), sha256(bundle.humanApproval), sha256(manifest)])
  if (nodeHashes.size !== 8) throw new Error("DAG: duplicate document hash")
  return { evidenceGraphSha256: sha256(manifest), nodeCount: nodeHashes.size }
}
