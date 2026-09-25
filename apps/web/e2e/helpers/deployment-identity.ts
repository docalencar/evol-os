/**
 * Deployment identity — RUNNER ONLY.
 *
 * A green hosted run used to prove which *environment* it exercised (base URL and
 * Supabase ref) but not which *build*. Two runs against Review, days and several
 * merges apart, produced indistinguishable evidence. This binds the run to the
 * deployment before any fixture exists.
 *
 * WHAT CAN AND CANNOT BE PROVEN TODAY
 *
 * The Next.js build id is served by the deployment itself, in the `/_next/static/
 * <buildId>/…` asset paths, so it is observable evidence in exactly the sense
 * `target-identity.ts` already relies on: the deployment tells us, we do not
 * assert it.
 *
 * The deployed commit SHA is NOT observable. This app inlines no build metadata —
 * `next.config.ts` is empty and nothing reads `VERCEL_GIT_COMMIT_SHA` — so no
 * asset carries it. A caller-supplied SHA is therefore a CLAIM, and it is
 * recorded as one, with its verification status, rather than being promoted to a
 * proven fact. Silently persisting an unverified SHA would be worse than
 * persisting none: it would read as proof in the evidence file.
 *
 * The residual is recorded as follow-up, not worked around here: serving the
 * build SHA from the app would make it provable, and that is a product change.
 */

export type CommitShaVerification =
  /** The deployment itself serves this SHA. Proof. */
  | "SERVED_BY_DEPLOYMENT"
  /** Declared by the caller; nothing the deployment serves can confirm it. */
  | "UNVERIFIABLE_FROM_DEPLOYMENT"
  /** No SHA was declared. */
  | "ABSENT"

export type DeploymentIdentity = Readonly<{
  /** Observable build fingerprint. Null when the deployment served none. */
  buildId: string | null
  /** "vercel" when provider headers are present; null when unknown. */
  provider: string | null
  /** Provider request/deployment correlator, e.g. `x-vercel-id`. */
  providerRequestId: string | null
  declaredCommitSha: string | null
  commitShaVerification: CommitShaVerification
  observedAt: string
}>

export type DeploymentProbe = Readonly<{
  status: number
  body: string
  headers: Readonly<Record<string, string>>
  scriptSrcs: readonly string[]
}>

const SHA_RE = /^[0-9a-f]{40}$/
const BUILD_ID_FROM_ASSET = /\/_next\/static\/([^/"']+)\/_(?:buildManifest|ssgManifest)\.js/
const BUILD_ID_INLINE = /"buildId"\s*:\s*"([^"]+)"/

/** Extract the Next build id from anything the deployment served. */
export function extractBuildId(probe: DeploymentProbe): string | null {
  for (const src of probe.scriptSrcs) {
    const fromAsset = BUILD_ID_FROM_ASSET.exec(src)
    if (fromAsset) return fromAsset[1]
  }
  const inline = BUILD_ID_INLINE.exec(probe.body)
  return inline ? inline[1] : null
}

function providerOf(headers: Readonly<Record<string, string>>): {
  provider: string | null
  providerRequestId: string | null
} {
  const vercelId = headers["x-vercel-id"] ?? null
  if (vercelId !== null || headers["x-vercel-cache"] !== undefined) {
    return { provider: "vercel", providerRequestId: vercelId }
  }
  return { provider: null, providerRequestId: null }
}

/**
 * Build the identity from a probe. Pure, so every branch is testable without a
 * network or a deployment.
 */
export function deriveDeploymentIdentity(
  probe: DeploymentProbe,
  declaredCommitSha: string | null,
): DeploymentIdentity {
  const buildId = extractBuildId(probe)
  const { provider, providerRequestId } = providerOf(probe.headers)

  let verification: CommitShaVerification = "ABSENT"
  if (declaredCommitSha !== null) {
    verification = probe.body.includes(declaredCommitSha)
      ? "SERVED_BY_DEPLOYMENT"
      : "UNVERIFIABLE_FROM_DEPLOYMENT"
  }

  return Object.freeze({
    buildId,
    provider,
    providerRequestId,
    declaredCommitSha,
    commitShaVerification: verification,
    observedAt: new Date().toISOString(),
  })
}

/** Any 40-hex SHA the deployment serves, used to detect a contradiction. */
export function servedCommitShas(probe: DeploymentProbe): readonly string[] {
  return Object.freeze([...new Set(probe.body.match(/\b[0-9a-f]{40}\b/g) ?? [])])
}

export type IdentityRequirement = Readonly<{
  /** A governed Review run requires a provable build fingerprint. */
  required: boolean
  declaredCommitSha: string | null
  /** When set, the observed build id must equal this exactly. */
  expectedBuildId: string | null
}>

/**
 * Fail closed. Called before the journal is opened and before the first Review
 * mutation, so a run that cannot prove what it is about to exercise creates
 * nothing at all.
 */
export function assertDeploymentIdentity(
  probe: DeploymentProbe,
  requirement: IdentityRequirement,
): DeploymentIdentity {
  const { required, declaredCommitSha, expectedBuildId } = requirement

  if (declaredCommitSha !== null && !SHA_RE.test(declaredCommitSha)) {
    throw new Error(
      `E2E_DEPLOYED_SHA_MALFORMED: ${JSON.stringify(declaredCommitSha)} is not a 40-hex commit SHA.`,
    )
  }

  const identity = deriveDeploymentIdentity(probe, declaredCommitSha)

  if (required && identity.buildId === null) {
    throw new Error(
      "E2E_DEPLOYMENT_IDENTITY_UNPROVEN: the deployment served no Next build id, so this run " +
        "cannot record which build it exercised. Refusing to create fixtures.",
    )
  }

  if (expectedBuildId !== null && identity.buildId !== expectedBuildId) {
    throw new Error(
      `E2E_DEPLOYMENT_BUILD_MISMATCH: expected build ${expectedBuildId}, deployment serves ` +
        `${identity.buildId ?? "<none>"}. Refusing to create fixtures.`,
    )
  }

  // A declared SHA contradicted by one the deployment actually serves is a
  // mis-pointed run, not a documentation error.
  if (declaredCommitSha !== null && identity.commitShaVerification !== "SERVED_BY_DEPLOYMENT") {
    const served = servedCommitShas(probe)
    if (served.length > 0) {
      throw new Error(
        `E2E_DEPLOYED_SHA_MISMATCH: declared ${declaredCommitSha}, deployment serves ` +
          `${served.join(", ")}. Refusing to create fixtures.`,
      )
    }
  }

  return identity
}

/**
 * One request to the deployment's auth entrypoint, returning everything the
 * identity derivation needs. Separate from the derivation so the rules above stay
 * pure and testable without a network.
 */
export async function probeDeployment(baseUrl: string): Promise<DeploymentProbe> {
  const response = await fetch(`${baseUrl}/login`, { redirect: "follow" })
  const body = await response.text()
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })
  const scriptSrcs = [...body.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1])
  return Object.freeze({ status: response.status, body, headers, scriptSrcs: Object.freeze(scriptSrcs) })
}
