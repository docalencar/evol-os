import { createHash } from "node:crypto"

export type Value = string | null | undefined

export function normalizeEmptyToNull(value: Value): string | null {
  if (value == null) {
    return null
  }
  const trimmed = value.trim()
  return trimmed === "" ? null : value
}

// Reads an optional client-provided per-submission token (stable per form
// instance) without letting it become authority. It only scopes create
// idempotency; the RPC still authorizes independently via auth.uid()/membership.
export function submissionIdFromInput(
  input: unknown
): string | undefined {
  if (input && typeof input === "object" && "idempotencyKey" in input) {
    const value = (input as { idempotencyKey?: unknown }).idempotencyKey
    return typeof value === "string" && value.length > 0
      ? value
      : undefined
  }
  return undefined
}

// Intent identity for create idempotency. The identity is EXCLUSIVELY the
// client-provided per-submission id (a stable per-form-instance token): the same
// submission (double-click/retry) converges, while a genuinely new submission —
// even with identical business data — gets a new token and creates a new entity.
// There is NO content-derived fallback: business content never defines identity.
// Tenant and operation are always part of the scope.
export function intentKey(
  operation: string,
  companyId: string,
  submissionId: string
): string {
  return createHash("sha256")
    .update(JSON.stringify([operation, companyId, submissionId]))
    .digest("hex")
}
