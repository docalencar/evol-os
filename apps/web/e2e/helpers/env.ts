/**
 * E2E environment contract — RUNNER ONLY.
 *
 * This module is imported by Playwright config, global setup and specs. It must
 * never be imported by application code under `src/`.
 *
 * Values are read from the process environment. `.env.e2e.local` (untracked) is
 * loaded as a convenience when present; real environments should supply the
 * variables externally instead.
 *
 * No value is ever printed. Errors name the *variable*, never its content.
 */

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { validateAnonKey, validateServiceRoleKey } from "./credentials"
import { resolveWebRoot } from "./paths"

/**
 * Resolved by walking up from the working directory rather than from
 * `import.meta.url`: Playwright transpiles this module to CommonJS (neither
 * package.json sets `"type": "module"`), where `import.meta` is a syntax error.
 */
export const WEB_ROOT = resolveWebRoot()

/** Canonical Review identity. Hard-coded on purpose: it is the fail-closed anchor. */
export const REVIEW_SUPABASE_REF = "rwfvxvbzaosgcyfxdjpt" as const
export const REVIEW_CANONICAL_HOST = "evol-os-review.vercel.app" as const

/** Never a valid target. Guarded explicitly so a mis-set variable cannot slip through. */
const FORBIDDEN_SUPABASE_REFS = {
  gzrrwyiqfbnyprkdeqvm: "PRODUCTION",
  oudngmrdtgengilpqqnz: "LEGACY",
} as const

function loadDotEnvFile(): void {
  const file = resolve(WEB_ROOT, ".env.e2e.local")
  if (!existsSync(file)) return

  for (const rawLine of readFileSync(file, "utf8").split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (process.env[key] !== undefined) continue
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadDotEnvFile()

function required(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === "") {
    throw new Error(
      `E2E_ENV_MISSING: ${name} is not set. Copy apps/web/.env.e2e.example to ` +
        `apps/web/.env.e2e.local and fill it in, or export it in the runner ` +
        `environment. Values are never read from the repository.`,
    )
  }
  return value.trim()
}

function optional(name: string, fallback: string): string {
  const value = process.env[name]
  return value && value.trim() !== "" ? value.trim() : fallback
}

export type E2eEnv = Readonly<{
  baseUrl: string
  baseHost: string
  supabaseUrl: string
  supabaseRef: string
  anonKey: string
  serviceRoleKey: string
  emailDomain: string
  allowNonReviewTarget: boolean
}>

let cached: E2eEnv | null = null

/**
 * Resolve and validate the runner environment. Fails closed: a target that is not
 * provably Review aborts before any fixture is created.
 */
export function e2eEnv(): E2eEnv {
  if (cached) return cached

  const baseUrl = required("E2E_BASE_URL").replace(/\/+$/, "")
  const supabaseUrl = required("E2E_SUPABASE_URL").replace(/\/+$/, "")
  const anonKey = required("E2E_SUPABASE_ANON_KEY")
  const serviceRoleKey = required("E2E_SUPABASE_SERVICE_ROLE_KEY")
  const emailDomain = optional("E2E_EMAIL_DOMAIN", "evol-e2e.invalid")
  const allowNonReviewTarget =
    optional("E2E_ALLOW_NON_REVIEW_TARGET", "false").toLowerCase() === "true"

  let baseHost: string
  try {
    const parsed = new URL(baseUrl)
    baseHost = parsed.host
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      throw new Error(
        `E2E_TARGET_INSECURE: E2E_BASE_URL must be https for any non-localhost target.`,
      )
    }
  } catch (cause) {
    if (cause instanceof Error && cause.message.startsWith("E2E_")) throw cause
    throw new Error(`E2E_ENV_INVALID: E2E_BASE_URL is not a valid absolute URL.`)
  }

  const refMatch = new URL(supabaseUrl).hostname.match(/^([a-z0-9]{20})\.supabase\.co$/)
  const supabaseRef = refMatch ? refMatch[1] : ""
  if (!supabaseRef) {
    throw new Error(
      `E2E_ENV_INVALID: E2E_SUPABASE_URL host does not look like a Supabase project ` +
        `(expected <ref>.supabase.co).`,
    )
  }

  const forbidden = FORBIDDEN_SUPABASE_REFS[supabaseRef as keyof typeof FORBIDDEN_SUPABASE_REFS]
  if (forbidden) {
    throw new Error(
      `E2E_TARGET_FORBIDDEN: E2E_SUPABASE_URL points at the ${forbidden} project. ` +
        `The harness creates and deletes data and must never run there.`,
    )
  }

  if (supabaseRef !== REVIEW_SUPABASE_REF && !allowNonReviewTarget) {
    throw new Error(
      `E2E_TARGET_NOT_REVIEW: expected Supabase ref ${REVIEW_SUPABASE_REF}, got ` +
        `${supabaseRef}. Set E2E_ALLOW_NON_REVIEW_TARGET=true only for a local stack.`,
    )
  }

  if (baseHost !== REVIEW_CANONICAL_HOST && !allowNonReviewTarget) {
    throw new Error(
      `E2E_TARGET_NOT_CANONICAL: expected host ${REVIEW_CANONICAL_HOST}, got ${baseHost}. ` +
        `A localhost run is for harness debugging only and is not Review evidence; ` +
        `set E2E_ALLOW_NON_REVIEW_TARGET=true to acknowledge that.`,
    )
  }

  // Credential shape is validated here as well as in the standalone preflight, so
  // that a run started by any entry point still fails closed rather than
  // discovering the problem mid-bootstrap.
  const anonCheck = validateAnonKey(anonKey, supabaseRef)
  if (!anonCheck.ok) {
    throw new Error(`E2E_ANON_KEY_INVALID: ${anonCheck.reason}.`)
  }

  const serviceCheck = validateServiceRoleKey(serviceRoleKey, supabaseRef)
  if (!serviceCheck.ok) {
    throw new Error(`E2E_SERVICE_ROLE_KEY_INVALID: ${serviceCheck.reason}.`)
  }

  if (anonKey === serviceRoleKey) {
    throw new Error(
      `E2E_KEYS_IDENTICAL: E2E_SUPABASE_ANON_KEY and E2E_SUPABASE_SERVICE_ROLE_KEY ` +
        `hold the same value.`,
    )
  }

  cached = Object.freeze({
    baseUrl,
    baseHost,
    supabaseUrl,
    supabaseRef,
    anonKey,
    serviceRoleKey,
    emailDomain,
    allowNonReviewTarget,
  })
  return cached
}

/** True when this run targets the canonical hosted Review deployment. */
export function isCanonicalReviewRun(env: E2eEnv): boolean {
  return env.baseHost === REVIEW_CANONICAL_HOST && env.supabaseRef === REVIEW_SUPABASE_REF
}

/**
 * Redact any secret-shaped substring before it reaches a log, report or evidence
 * file. Cheap belt-and-braces on top of never logging values in the first place.
 */
export function redact(text: string): string {
  const env = cached
  let out = text
  if (env) {
    for (const secret of [env.serviceRoleKey, env.anonKey]) {
      if (secret && secret.length > 8) out = out.split(secret).join("[REDACTED]")
    }
  }
  return out
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[REDACTED_JWT]")
    .replace(/sb_(secret|publishable)_[A-Za-z0-9_-]+/g, "[REDACTED_SB_KEY]")
    .replace(/\bre_[A-Za-z0-9]{16,}\b/g, "[REDACTED_RESEND_KEY]")
}
