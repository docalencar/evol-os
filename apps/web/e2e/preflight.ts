/**
 * Local environment preflight — step A of the run order.
 *
 * Runs *before* Playwright and before any browser download. Purely local: it makes
 * no network call, so a bad credential costs nothing and touches nothing.
 *
 * This exists because a safety property that lives in an operator's shell snippet
 * is not a safety property — it is a hope. The guarantee belongs to the
 * repository, so every entry point inherits it.
 *
 * Prints variable NAMES and STATUS only. Never a value, never a fragment of one.
 * Exits non-zero on any failure so `&&` chains and CI both stop here.
 */

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { validateAnonKey, validateServiceRoleKey } from "./helpers/credentials"
import { resolveWebRoot } from "./helpers/paths"

const REVIEW_SUPABASE_REF = "rwfvxvbzaosgcyfxdjpt"
const REVIEW_CANONICAL_HOST = "evol-os-review.vercel.app"
const FORBIDDEN_REFS: Record<string, string> = {
  gzrrwyiqfbnyprkdeqvm: "PRODUCTION",
  oudngmrdtgengilpqqnz: "LEGACY",
}

type Status = "OK" | "MISSING" | "INVALID"

type Check = { name: string; status: Status; detail: string }

function loadEnvFile(webRoot: string): void {
  const file = resolve(webRoot, ".env.e2e.local")
  if (!existsSync(file)) return
  for (const rawLine of readFileSync(file, "utf8").split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (process.env[key] !== undefined) continue
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

function read(name: string): string {
  return (process.env[name] ?? "").trim()
}

export function runPreflight(): { ok: boolean; checks: Check[] } {
  const webRoot = resolveWebRoot()
  loadEnvFile(webRoot)

  const checks: Check[] = []
  const allowNonReview = read("E2E_ALLOW_NON_REVIEW_TARGET").toLowerCase() === "true"

  // --- E2E_BASE_URL -------------------------------------------------------
  const baseUrl = read("E2E_BASE_URL")
  if (!baseUrl) {
    checks.push({ name: "E2E_BASE_URL", status: "MISSING", detail: "not set" })
  } else {
    try {
      const url = new URL(baseUrl)
      if (url.host !== REVIEW_CANONICAL_HOST && !allowNonReview) {
        checks.push({
          name: "E2E_BASE_URL",
          status: "INVALID",
          detail: `host is ${url.host}, expected ${REVIEW_CANONICAL_HOST}`,
        })
      } else {
        checks.push({ name: "E2E_BASE_URL", status: "OK", detail: url.host })
      }
    } catch {
      checks.push({ name: "E2E_BASE_URL", status: "INVALID", detail: "not an absolute URL" })
    }
  }

  // --- E2E_SUPABASE_URL ---------------------------------------------------
  const supabaseUrl = read("E2E_SUPABASE_URL")
  let ref = ""
  if (!supabaseUrl) {
    checks.push({ name: "E2E_SUPABASE_URL", status: "MISSING", detail: "not set" })
  } else {
    const match = supabaseUrl.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/)
    ref = match ? match[1] : ""
    if (!ref) {
      checks.push({ name: "E2E_SUPABASE_URL", status: "INVALID", detail: "not a <ref>.supabase.co URL" })
    } else if (FORBIDDEN_REFS[ref]) {
      checks.push({
        name: "E2E_SUPABASE_URL",
        status: "INVALID",
        detail: `points at ${FORBIDDEN_REFS[ref]} — never a valid E2E target`,
      })
      ref = ""
    } else if (ref !== REVIEW_SUPABASE_REF && !allowNonReview) {
      checks.push({ name: "E2E_SUPABASE_URL", status: "INVALID", detail: `ref ${ref} is not Review` })
      ref = ""
    } else {
      checks.push({ name: "E2E_SUPABASE_URL", status: "OK", detail: ref })
    }
  }

  const expectedRef = ref || REVIEW_SUPABASE_REF

  // --- keys ---------------------------------------------------------------
  const anon = read("E2E_SUPABASE_ANON_KEY")
  if (!anon) {
    checks.push({ name: "E2E_SUPABASE_ANON_KEY", status: "MISSING", detail: "not set" })
  } else {
    const result = validateAnonKey(anon, expectedRef)
    checks.push(
      result.ok
        ? { name: "E2E_SUPABASE_ANON_KEY", status: "OK", detail: result.note }
        : { name: "E2E_SUPABASE_ANON_KEY", status: "INVALID", detail: result.reason },
    )
  }

  const service = read("E2E_SUPABASE_SERVICE_ROLE_KEY")
  if (!service) {
    checks.push({ name: "E2E_SUPABASE_SERVICE_ROLE_KEY", status: "MISSING", detail: "not set" })
  } else {
    const result = validateServiceRoleKey(service, expectedRef)
    checks.push(
      result.ok
        ? { name: "E2E_SUPABASE_SERVICE_ROLE_KEY", status: "OK", detail: result.note }
        : { name: "E2E_SUPABASE_SERVICE_ROLE_KEY", status: "INVALID", detail: result.reason },
    )
  }

  if (anon && service && anon === service) {
    checks.push({
      name: "E2E_KEY_DISTINCTNESS",
      status: "INVALID",
      detail: "anon and service-role hold the same value",
    })
  }

  return { ok: checks.every((check) => check.status === "OK"), checks }
}

function main(): void {
  let result: { ok: boolean; checks: Check[] }
  try {
    result = runPreflight()
  } catch (cause) {
    console.error("[e2e] preflight failed: " + (cause instanceof Error ? cause.message : String(cause)))
    process.exitCode = 1
    return
  }

  console.log("[e2e] local environment preflight")
  for (const check of result.checks) {
    console.log(`  ${check.name}=${check.status}  (${check.detail})`)
  }

  if (result.ok) {
    console.log("[e2e] preflight OK — proceeding to browser readiness and hosted identity check.")
    return
  }

  console.error(
    "\n[e2e] BLOCKED: required E2E credentials are missing or invalid.\n" +
      "      Nothing was installed, no spec was loaded, no fixture was created,\n" +
      "      and Review was not contacted.\n" +
      "      Fix apps/web/.env.e2e.local (untracked) or the runner environment,\n" +
      "      then re-run. Values are never read from the repository.",
  )
  process.exitCode = 1
}

// Only self-execute when invoked directly, so tests can import `runPreflight`.
if (process.argv[1] && /preflight\.(ts|js|mjs|cjs)$/.test(process.argv[1])) {
  main()
}
