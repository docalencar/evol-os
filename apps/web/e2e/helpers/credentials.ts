/**
 * Supabase key format validation — RUNNER ONLY.
 *
 * Classifies a key by *shape*, and where the format carries verifiable identity,
 * checks it. Nothing here ever returns, logs or embeds the key itself.
 *
 * Two formats are in use on this project, and they differ in what can be proven:
 *
 *   legacy JWT      `eyJ….eyJ….sig`   payload carries `role` and `ref`, so both the
 *                                     privilege level and the project are verifiable.
 *   new secret key  `sb_secret_…`     opaque. Only syntax can be checked; project
 *                                     identity stays **operator-attested**.
 *
 * The Review deployment currently uses a legacy JWT anon key and a new-format
 * secret key, so both paths must work.
 */

export type KeyKind =
  | "jwt-anon"
  | "jwt-service-role"
  | "jwt-other"
  | "sb-secret"
  | "sb-publishable"
  | "unknown"

export type KeyInspection = Readonly<{
  kind: KeyKind
  /** Project ref when the format embeds one; null for opaque formats. */
  ref: string | null
  /** True when the format allows project identity to be verified. */
  identityVerifiable: boolean
}>

const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/

/**
 * Character set for the random part of a `sb_…` key.
 *
 * Supabase documents the *prefixes* (`sb_publishable_…`, `sb_secret_…`) but not
 * the encoding of what follows. An earlier revision assumed base64url
 * (`[A-Za-z0-9_-]`) and rejected a real Review key — over-specificity that read as
 * "unrecognised key format".
 *
 * This set covers base64, base64url, hex and dotted variants, and still refuses
 * whitespace, control characters, non-ASCII (a masked "••••" copy) and anything
 * else that cannot be an API key. Broad enough to accept what Supabase issues,
 * narrow enough to stay fail-closed.
 */
const SB_RANDOM_PART = "[A-Za-z0-9_\\-+/=.]{8,256}"
const SB_SECRET_RE = new RegExp(`^sb_secret_${SB_RANDOM_PART}$`)
const SB_PUBLISHABLE_RE = new RegExp(`^sb_publishable_${SB_RANDOM_PART}$`)

/**
 * Trim, and drop one layer of surrounding quotes — a value pasted into a `.env`
 * file is frequently quoted, and that is not a reason to reject it.
 */
export function normaliseKey(raw: string): string {
  let key = raw.trim()
  if (key.length >= 2) {
    const first = key[0]
    const last = key[key.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      key = key.slice(1, -1).trim()
    }
  }
  return key
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  try {
    const padded = parts[1] + "=".repeat((4 - (parts[1].length % 4)) % 4)
    const json = Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    const parsed: unknown = JSON.parse(json)
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function inspectKey(raw: string): KeyInspection {
  const key = normaliseKey(raw)

  if (SB_SECRET_RE.test(key)) {
    return { kind: "sb-secret", ref: null, identityVerifiable: false }
  }
  if (SB_PUBLISHABLE_RE.test(key)) {
    return { kind: "sb-publishable", ref: null, identityVerifiable: false }
  }

  if (JWT_RE.test(key)) {
    const payload = decodeJwtPayload(key)
    const role = typeof payload?.role === "string" ? payload.role : null
    const ref = typeof payload?.ref === "string" ? payload.ref : null
    if (role === "service_role") return { kind: "jwt-service-role", ref, identityVerifiable: true }
    if (role === "anon") return { kind: "jwt-anon", ref, identityVerifiable: true }
    return { kind: "jwt-other", ref, identityVerifiable: ref !== null }
  }

  return { kind: "unknown", ref: null, identityVerifiable: false }
}

export type ValidationResult =
  | Readonly<{ ok: true; note: string }>
  | Readonly<{ ok: false; reason: string }>

/**
 * A service-role credential must be privileged, and must not be some other key
 * pasted by mistake. A broad prefix alone is never sufficient.
 */
export function validateServiceRoleKey(raw: string, expectedRef: string): ValidationResult {
  if (!raw || normaliseKey(raw) === "") return { ok: false, reason: "empty" }
  const info = inspectKey(raw)

  switch (info.kind) {
    case "jwt-service-role":
      if (info.ref && info.ref !== expectedRef) {
        return { ok: false, reason: `JWT belongs to project ${info.ref}, expected ${expectedRef}` }
      }
      return { ok: true, note: "legacy JWT service_role; project identity verified from payload" }

    case "sb-secret":
      // Opaque by design: no ref, no role, nothing to verify beyond syntax.
      return { ok: true, note: "new-format secret key; project identity operator-attested" }

    case "jwt-anon":
      return { ok: false, reason: "this is the anon key, not the service-role key" }

    case "sb-publishable":
      return { ok: false, reason: "this is the publishable key, not the secret key" }

    case "jwt-other":
      return { ok: false, reason: "JWT does not carry role=service_role" }

    default:
      return {
        ok: false,
        reason:
          "unrecognised key format — expected sb_secret_… or a service_role JWT. " +
          "Run `npm --workspace apps/web run e2e:inspect-key` to see what the value " +
          "looks like without revealing it",
      }
  }
}

/** The anon/publishable key: must be the *unprivileged* one, and the right project. */
export function validateAnonKey(raw: string, expectedRef: string): ValidationResult {
  if (!raw || normaliseKey(raw) === "") return { ok: false, reason: "empty" }
  const info = inspectKey(raw)

  switch (info.kind) {
    case "jwt-anon":
      if (info.ref && info.ref !== expectedRef) {
        return { ok: false, reason: `JWT belongs to project ${info.ref}, expected ${expectedRef}` }
      }
      return { ok: true, note: "legacy JWT anon; project identity verified from payload" }

    case "sb-publishable":
      return { ok: true, note: "new-format publishable key; project identity operator-attested" }

    case "jwt-service-role":
    case "sb-secret":
      return {
        ok: false,
        reason: "a privileged key was supplied where the anon/publishable key belongs",
      }

    default:
      return { ok: false, reason: "unrecognised key format" }
  }
}
