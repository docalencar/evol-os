/**
 * Fail-closed target identity check — RUNNER ONLY.
 *
 * Proves, from evidence the deployment itself serves, that the target is the
 * canonical Review environment. Runs *before* any fixture is created, so a
 * mis-pointed run aborts without mutating anything.
 *
 * The Supabase ref is observable without credentials because
 * `NEXT_PUBLIC_SUPABASE_URL` is inlined into the client bundle at build time —
 * which is exactly what makes this provable rather than asserted.
 */

import { e2eEnv, REVIEW_SUPABASE_REF } from "./env"

export type TargetIdentity = Readonly<{
  baseUrl: string
  host: string
  loginStatus: number
  refFoundInBundle: boolean
  supabaseHostsInBundle: readonly string[]
  serviceRoleShapedStringsInBundle: number
  chunksScanned: number
}>

const SUPABASE_HOST_RE = /https:\/\/([a-z0-9]{20})\.supabase\.co/g
const SERVICE_ROLE_SHAPED_RE = /SUPABASE_SERVICE_ROLE_KEY|sb_secret_[A-Za-z0-9]|"service_role"/g

async function fetchText(url: string): Promise<{ status: number; body: string }> {
  const response = await fetch(url, { redirect: "follow" })
  return { status: response.status, body: await response.text() }
}

/**
 * Scan the login page and every same-origin script it references.
 *
 * `/login` is used because it is the auth entrypoint and it pulls in the Supabase
 * browser client, which is where the public project URL is inlined.
 */
export async function inspectTarget(): Promise<TargetIdentity> {
  const env = e2eEnv()
  const loginUrl = `${env.baseUrl}/login`
  const login = await fetchText(loginUrl)

  const scriptSrcs = new Set<string>()
  for (const match of login.body.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    const src = match[1]
    const absolute = src.startsWith("http") ? src : `${env.baseUrl}${src}`
    if (absolute.startsWith(env.baseUrl)) scriptSrcs.add(absolute)
  }

  const hosts = new Set<string>()
  let refFound = false
  let serviceRoleShaped = 0
  let scanned = 0

  const documents = [login.body]
  for (const src of scriptSrcs) {
    try {
      const chunk = await fetchText(src)
      documents.push(chunk.body)
      scanned += 1
    } catch {
      // A chunk that cannot be fetched is not evidence either way; the assertions
      // below still require positive proof from what *was* readable.
    }
  }

  for (const body of documents) {
    if (body.includes(REVIEW_SUPABASE_REF)) refFound = true
    for (const m of body.matchAll(SUPABASE_HOST_RE)) hosts.add(m[1])
    serviceRoleShaped += [...body.matchAll(SERVICE_ROLE_SHAPED_RE)].length
  }

  return Object.freeze({
    baseUrl: env.baseUrl,
    host: env.baseHost,
    loginStatus: login.status,
    refFoundInBundle: refFound,
    supabaseHostsInBundle: Object.freeze([...hosts]),
    serviceRoleShapedStringsInBundle: serviceRoleShaped,
    chunksScanned: scanned,
  })
}

/**
 * Throw unless the target is provably Review. Called by global setup before any
 * user or tenant is created.
 */
export async function assertReviewTarget(): Promise<TargetIdentity> {
  const env = e2eEnv()
  const identity = await inspectTarget()

  if (identity.loginStatus !== 200) {
    throw new Error(
      `E2E_TARGET_UNREACHABLE: GET ${env.baseUrl}/login returned ${identity.loginStatus}.`,
    )
  }

  if (env.allowNonReviewTarget) return identity

  if (!identity.refFoundInBundle) {
    throw new Error(
      `E2E_TARGET_BINDING_UNPROVEN: could not find Supabase ref ${REVIEW_SUPABASE_REF} ` +
        `in the client assets served by ${env.baseUrl} ` +
        `(${identity.chunksScanned} script chunks scanned). Refusing to create fixtures.`,
    )
  }

  const foreign = identity.supabaseHostsInBundle.filter((ref) => ref !== REVIEW_SUPABASE_REF)
  if (foreign.length > 0) {
    throw new Error(
      `E2E_TARGET_MIXED_BINDING: the deployment references non-Review Supabase ` +
        `projects (${foreign.join(", ")}). Refusing to create fixtures.`,
    )
  }

  if (identity.serviceRoleShapedStringsInBundle > 0) {
    throw new Error(
      `E2E_SERVICE_ROLE_IN_BUNDLE: found ${identity.serviceRoleShapedStringsInBundle} ` +
        `service-role-shaped string(s) in browser-delivered assets. This is a security ` +
        `defect; refusing to run.`,
    )
  }

  return identity
}
