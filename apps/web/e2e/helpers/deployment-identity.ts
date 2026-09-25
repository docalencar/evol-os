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

import { createHash } from "node:crypto"

export type CommitShaVerification =
  /** The deployment itself serves this SHA. Proof. */
  | "SERVED_BY_DEPLOYMENT"
  /** Declared by the caller; nothing the deployment serves can confirm it. */
  | "UNVERIFIABLE_FROM_DEPLOYMENT"
  /** No SHA was declared. */
  | "ABSENT"

export type DeploymentIdentity = Readonly<{
  /**
   * A true Next build id, when the deployment exposes one. Pages Router serves it
   * in `/_next/static/<buildId>/…`; App Router does not, so this is normally null
   * here and `assetFingerprint` carries the binding instead.
   */
  buildId: string | null
  /**
   * Deterministic digest of every `/_next/static/…` asset URL the deployment
   * serves on its auth entrypoint. Content-hashed by the bundler, so it is stable
   * for a build and changes when the built output changes - which is what makes
   * it usable as a build binding without assuming any router convention.
   */
  assetFingerprint: string | null
  /** How many distinct static asset URLs the fingerprint was derived from. */
  assetCount: number
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
/**
 * Any same-origin Next static asset, whatever references it.
 *
 * The character class is defined by what TERMINATES a URL in a served document -
 * a quote, whitespace, an angle bracket or a backslash - not by what a path is
 * "expected" to contain. An earlier allow-list of `[A-Za-z0-9._~-/]` truncated
 * the real Review asset
 * `/_next/static/chunks/app/(auth)/login/page-bb781eb03e161f27.js` at `app/`,
 * because App Router route groups put parentheses in the path.
 */
const STATIC_ASSET_RE = /\/_next\/static\/[^"'\s<>\\]+/g
const BUILD_ID_FROM_ASSET = /\/_next\/static\/([^/"']+)\/_(?:buildManifest|ssgManifest)\.js/
const BUILD_ID_INLINE = /"buildId"\s*:\s*"([^"]+)"/

/**
 * Every distinct `/_next/static/…` URL the deployment served, from anywhere in
 * the document - script src, stylesheet href, preload link or inline reference.
 * Deliberately not tied to `<script src>` or to a filename convention: the first
 * version of this module matched only Pages Router artefacts and therefore found
 * nothing on an App Router deployment.
 */
export function servedStaticAssets(probe: DeploymentProbe): readonly string[] {
  const body = unescapeDocument(probe.body)
  const fromBody = body.match(STATIC_ASSET_RE) ?? []
  const fromSrcs = probe.scriptSrcs.flatMap(
    (src) => unescapeDocument(src).match(STATIC_ASSET_RE) ?? [],
  )
  const normalized = [...fromBody, ...fromSrcs].map(normalizeAssetUrl)
  // Deduplicated and sorted, so the binding depends on the SET of assets a build
  // serves and not on the order or the number of places each is referenced.
  return Object.freeze([...new Set(normalized)].sort())
}

/**
 * Undo representation artifacts before matching, so the same asset written three
 * ways in one document is one asset. JSON-escaped slashes appear in inline
 * scripts, HTML numeric entities in attributes.
 */
function unescapeDocument(text: string): string {
  return text
    .replace(/\\\//g, "/")
    .replace(/&#x2[Ff];/g, "/")
    .replace(/&#47;/g, "/")
    .replace(/&amp;/g, "&")
}

/**
 * One canonical spelling per asset. Percent-encoding is decoded (App Router route
 * groups are often emitted as `%28auth%29`), and trailing punctuation that came
 * from the surrounding syntax - a CSS `url(...)` close paren, a list comma - is
 * removed. The close paren is only stripped when it is unbalanced, so a genuine
 * `(auth)` segment survives.
 */
export function normalizeAssetUrl(raw: string): string {
  let url = raw
  try {
    url = decodeURIComponent(url)
  } catch {
    // A malformed escape is not a reason to discard the observation.
  }
  url = url.replace(/[,;:'"]+$/, "")
  while (url.endsWith(")") && count(url, ")") > count(url, "(")) url = url.slice(0, -1)
  return url
}

function count(text: string, character: string): number {
  return text.split(character).length - 1
}

/** Stable digest of the served asset set. Same build in, same value out. */
export function assetFingerprintOf(assets: readonly string[]): string | null {
  if (assets.length === 0) return null
  return `assets:${createHash("sha256").update(assets.join("\n")).digest("hex").slice(0, 16)}`
}

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
  const assets = servedStaticAssets(probe)
  const { provider, providerRequestId } = providerOf(probe.headers)

  let verification: CommitShaVerification = "ABSENT"
  if (declaredCommitSha !== null) {
    verification = probe.body.includes(declaredCommitSha)
      ? "SERVED_BY_DEPLOYMENT"
      : "UNVERIFIABLE_FROM_DEPLOYMENT"
  }

  return Object.freeze({
    buildId,
    assetFingerprint: assetFingerprintOf(assets),
    assetCount: assets.length,
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

  // Either form binds the run to a build. App Router deployments serve no build
  // id, so the asset fingerprint is the normal path here.
  if (required && identity.buildId === null && identity.assetFingerprint === null) {
    throw new Error(
      "E2E_DEPLOYMENT_IDENTITY_UNPROVEN: the deployment served neither a Next build id nor any " +
        "/_next/static/ asset, so this run cannot record which build it exercised. " +
        `Observed ${probe.scriptSrcs.length} script src(s), ${probe.body.length} bytes of HTML, ` +
        `headers [${Object.keys(probe.headers).sort().join(", ")}]. ` +
        "Refusing to create fixtures.",
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
