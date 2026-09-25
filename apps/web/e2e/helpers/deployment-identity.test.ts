/**
 * E2E-EVIDENCE1 — a hosted run must record WHICH BUILD it exercised.
 *
 * Reconstructing run 260925133926-18822f showed the journal could name the
 * environment (baseUrl, supabaseRef) but not the build, so a green run could
 * never prove which Review deployment it proved. These tests pin the rules that
 * close that, including the ones that must fail closed.
 *
 * The derivation is pure, so every branch is provable here without a network, a
 * deployment, or a hosted run.
 */

import assert from "node:assert/strict"
import test from "node:test"

import {
  assertDeploymentIdentity,
  deriveDeploymentIdentity,
  extractBuildId,
  servedCommitShas,
  servedStaticAssets,
  assetFingerprintOf,
  normalizeAssetUrl,
  type DeploymentProbe,
} from "./deployment-identity"
import { redactJournalForArchive } from "../lifecycle/terminal-state"

const SHA = "ad2bfb4a9e5ee36eea2448661fa7f217809da023"
const OTHER_SHA = "9ea15ab7894803539dd025b54c35156c9553f7ae"

function probe(over: Partial<DeploymentProbe> = {}): DeploymentProbe {
  return Object.freeze({
    status: 200,
    body: '<html><script src="/_next/static/BUILD_ABC/_buildManifest.js"></script></html>',
    headers: { "x-vercel-id": "gru1::abc123-1727270000000-deadbeef", "x-vercel-cache": "MISS" },
    scriptSrcs: ["/_next/static/BUILD_ABC/_buildManifest.js"],
    ...over,
  })
}

const governed = { required: true, declaredCommitSha: null, expectedBuildId: null }

/* 1 — the SHA is persisted, and its verification status is never inflated. */

test("a SHA the deployment serves is persisted as verified", () => {
  const identity = assertDeploymentIdentity(
    probe({ body: `<html>build ${SHA}</html>`, scriptSrcs: [], headers: {} }),
    { required: false, declaredCommitSha: SHA, expectedBuildId: null },
  )
  assert.equal(identity.declaredCommitSha, SHA)
  assert.equal(identity.commitShaVerification, "SERVED_BY_DEPLOYMENT")
})

test("a SHA the deployment does not serve is persisted, but never as proof", () => {
  // This app inlines no build metadata, so today this is the real-world path.
  // The SHA is still recorded — losing it would be worse — but it is labelled.
  const identity = assertDeploymentIdentity(probe(), { ...governed, declaredCommitSha: SHA })
  assert.equal(identity.declaredCommitSha, SHA)
  assert.equal(identity.commitShaVerification, "UNVERIFIABLE_FROM_DEPLOYMENT")
  assert.notEqual(identity.commitShaVerification, "SERVED_BY_DEPLOYMENT")
})

test("no declared SHA is recorded as ABSENT rather than as an empty claim", () => {
  assert.equal(assertDeploymentIdentity(probe(), governed).commitShaVerification, "ABSENT")
})

test("a malformed SHA is refused rather than persisted", () => {
  for (const bad of ["not-a-sha", SHA.slice(0, 39), `${SHA}f`, "ADSBFB4A9E5EE36EEA2448661FA7F217809DA023"]) {
    assert.throws(
      () => assertDeploymentIdentity(probe(), { ...governed, declaredCommitSha: bad }),
      /E2E_DEPLOYED_SHA_MALFORMED/,
      `expected ${bad} to be refused`,
    )
  }
})

/* 2 — provider / deployment identity when the deployment offers it. */

test("provider identity is persisted when the deployment exposes it", () => {
  const identity = assertDeploymentIdentity(probe(), governed)
  assert.equal(identity.buildId, "BUILD_ABC")
  assert.equal(identity.provider, "vercel")
  assert.equal(identity.providerRequestId, "gru1::abc123-1727270000000-deadbeef")
  assert.match(identity.observedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test("an unknown provider is recorded as unknown, not guessed", () => {
  const identity = assertDeploymentIdentity(probe({ headers: {} }), governed)
  assert.equal(identity.provider, null)
  assert.equal(identity.providerRequestId, null)
  assert.equal(identity.buildId, "BUILD_ABC", "the build id is independent of the provider")
})

test("the build id is read from an inline buildId when no asset path carries it", () => {
  assert.equal(
    extractBuildId(probe({ scriptSrcs: [], body: '<script>{"buildId":"INLINE_XYZ"}</script>' })),
    "INLINE_XYZ",
  )
})

/* 3 — a mismatch stops the run before any fixture exists. */

test("a build id that is not the expected one refuses to create fixtures", () => {
  assert.throws(
    () => assertDeploymentIdentity(probe(), { ...governed, expectedBuildId: "BUILD_EXPECTED" }),
    /E2E_DEPLOYMENT_BUILD_MISMATCH[\s\S]*BUILD_EXPECTED[\s\S]*BUILD_ABC/,
  )
})

test("a declared SHA contradicted by one the deployment serves refuses to create fixtures", () => {
  assert.throws(
    () => assertDeploymentIdentity(
      probe({ body: `<html>built from ${OTHER_SHA}</html>` }),
      { ...governed, declaredCommitSha: SHA },
    ),
    /E2E_DEPLOYED_SHA_MISMATCH/,
  )
  assert.deepEqual(servedCommitShas(probe({ body: `x ${OTHER_SHA} y` })), [OTHER_SHA])
})

/* 4 — a governed run that cannot establish identity creates nothing. */

test("a governed run with no provable build id fails closed", () => {
  assert.throws(
    () => assertDeploymentIdentity(probe({ scriptSrcs: [], body: "<html></html>" }), governed),
    /E2E_DEPLOYMENT_IDENTITY_UNPROVEN/,
  )
})

test("an explicitly acknowledged non-Review target may proceed without one", () => {
  const identity = assertDeploymentIdentity(
    probe({ scriptSrcs: [], body: "<html></html>" }),
    { required: false, declaredCommitSha: null, expectedBuildId: null },
  )
  assert.equal(identity.buildId, null)
})

/* 5 — the identity survives into the archived evidence. */

test("the retired journal preserves deployment identity while redacting secrets", () => {
  const identity = deriveDeploymentIdentity(probe(), SHA)
  const journal = {
    runId: "260925133926-18822f",
    baseUrl: "https://evol-os-review.vercel.app",
    supabaseRef: "rwfvxvbzaosgcyfxdjpt",
    deployment: identity,
    users: [{ email: "e2e@evol-e2e.invalid", password: "super-secret" }],
  }

  const archived = redactJournalForArchive(journal) as typeof journal

  assert.deepEqual(archived.deployment, identity, "the build binding must survive retirement")
  assert.equal(archived.users[0]?.password, "<redacted>")
  // The pre-existing environment evidence is preserved, not replaced.
  assert.equal(archived.baseUrl, journal.baseUrl)
  assert.equal(archived.supabaseRef, journal.supabaseRef)
})

/* ---------------------------------------------------------------------------
 * E2E-EVIDENCE2 — the binding must not assume a router convention.
 *
 * The first version matched `/_next/static/<buildId>/_buildManifest.js` and an
 * inline `"buildId"`. Both are PAGES ROUTER artefacts. This app is App Router
 * only (src/app, no pages/, Next 15.5.20), which serves content-hashed chunks
 * under /_next/static/chunks/ and emits no __NEXT_DATA__ - so nothing matched
 * and a governed run against canonical Review failed closed with
 * E2E_DEPLOYMENT_IDENTITY_UNPROVEN.
 *
 * The tests did not catch it because their fixture encoded the same wrong
 * assumption: a Pages-Router-shaped probe. A fixture that asserts the author's
 * belief cannot falsify it. These cases use the shape a real App Router
 * deployment serves.
 * ------------------------------------------------------------------------- */

const APP_ROUTER_HTML = [
  '<!DOCTYPE html><html><head>',
  '<link rel="preload" as="script" href="/_next/static/chunks/webpack-8f3a1c.js"/>',
  '<link rel="stylesheet" href="/_next/static/css/a1b2c3.css"/>',
  '</head><body>',
  '<script src="/_next/static/chunks/main-app-77d0be.js" async=""></script>',
  '<script src="/_next/static/chunks/app/login/page-4e91aa.js" async=""></script>',
  '</body></html>',
].join("")

function appRouterProbe(over: Partial<DeploymentProbe> = {}): DeploymentProbe {
  return Object.freeze({
    status: 200,
    body: APP_ROUTER_HTML,
    headers: { "x-vercel-id": "gru1::iad1::abc-1727270000000-deadbeef" },
    scriptSrcs: [
      "/_next/static/chunks/main-app-77d0be.js",
      "/_next/static/chunks/app/login/page-4e91aa.js",
    ],
    ...over,
  })
}

test("an App Router deployment yields a build binding although it serves no build id", () => {
  const identity = assertDeploymentIdentity(appRouterProbe(), governed)
  assert.equal(identity.buildId, null, "App Router exposes no Next build id")
  assert.match(identity.assetFingerprint ?? "", /^assets:[0-9a-f]{16}$/)
  assert.ok(identity.assetCount >= 4, "stylesheet and preload links count too, not only scripts")
})

test("the fingerprint is deterministic for a build and changes when the build changes", () => {
  const a = deriveDeploymentIdentity(appRouterProbe(), null).assetFingerprint
  const b = deriveDeploymentIdentity(appRouterProbe(), null).assetFingerprint
  assert.equal(a, b, "same served assets must produce the same binding")

  const rebuilt = appRouterProbe({
    body: APP_ROUTER_HTML.replace("webpack-8f3a1c", "webpack-99ff00"),
  })
  assert.notEqual(deriveDeploymentIdentity(rebuilt, null).assetFingerprint, a)
})

test("assets are collected from anywhere in the document, not only from script tags", () => {
  const linksOnly = appRouterProbe({
    body: '<link rel="stylesheet" href="/_next/static/css/only.css"/>',
    scriptSrcs: [],
  })
  assert.deepEqual(servedStaticAssets(linksOnly), ["/_next/static/css/only.css"])
  assert.notEqual(assetFingerprintOf(servedStaticAssets(linksOnly)), null)
})

test("a deployment serving no static asset at all still fails closed, and says what it saw", () => {
  let message = ""
  try {
    assertDeploymentIdentity(
      appRouterProbe({ body: "<html>maintenance</html>", scriptSrcs: [], headers: { server: "x" } }),
      governed,
    )
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }
  assert.match(message, /E2E_DEPLOYMENT_IDENTITY_UNPROVEN/)
  // Self-diagnosing: the next failure must carry the evidence needed to explain it.
  assert.match(message, /Observed 0 script src\(s\)/)
  assert.match(message, /headers \[server\]/)
})

test("x-vercel-id is recorded as a request correlator, never as the build binding", () => {
  const identity = deriveDeploymentIdentity(appRouterProbe(), null)
  assert.equal(identity.providerRequestId, "gru1::iad1::abc-1727270000000-deadbeef")
  assert.notEqual(identity.assetFingerprint, identity.providerRequestId)

  // Two requests to the SAME deployment carry different x-vercel-id values; the
  // build binding must not move with them.
  const second = deriveDeploymentIdentity(
    appRouterProbe({ headers: { "x-vercel-id": "gru1::iad1::zzz-1727270999999-cafe" } }),
    null,
  )
  assert.notEqual(second.providerRequestId, identity.providerRequestId)
  assert.equal(second.assetFingerprint, identity.assetFingerprint)
})

/* ---------------------------------------------------------------------------
 * E2E-EVIDENCE2 (final) — the real Review response.
 *
 * A read-only probe of canonical Review returned these exact assets. They are
 * used verbatim: the previous fixture was invented, encoded the author's wrong
 * belief about the router, and therefore passed while the real deployment could
 * never match.
 *
 * Note `(auth)` — an App Router route group. The first extraction used an
 * allow-list character class and truncated that path at `app/`.
 * ------------------------------------------------------------------------- */

const REVIEW_ASSETS = [
  "/_next/static/chunks/18-7475744f812bdff0.js",
  "/_next/static/chunks/app/(auth)/login/page-bb781eb03e161f27.js",
  "/_next/static/chunks/app/layout-bd47a71b5a976190.js",
  "/_next/static/chunks/main-app-57aa1716f0d0f500.js",
  "/_next/static/css/a2de97577a924c43.css",
  "/_next/static/media/bb3ef058b751a6ad-s.p.woff2",
] as const

function reviewProbe(body: string, scriptSrcs: readonly string[] = []): DeploymentProbe {
  return Object.freeze({
    status: 200,
    body,
    headers: { "x-vercel-id": "gru1::iad1::abc-1727270000000-deadbeef" },
    scriptSrcs: [...scriptSrcs],
  })
}

const REVIEW_HTML = REVIEW_ASSETS.map((a) =>
  a.endsWith(".css")
    ? `<link rel="stylesheet" href="${a}"/>`
    : a.endsWith(".woff2")
      ? `<link rel="preload" as="font" href="${a}"/>`
      : `<script src="${a}" async=""></script>`,
).join("")

test("the real Review response yields a build binding, route group and all", () => {
  const identity = assertDeploymentIdentity(reviewProbe(REVIEW_HTML), governed)
  assert.equal(identity.buildId, null, "App Router serves no Next build id")
  assert.match(identity.assetFingerprint ?? "", /^assets:[0-9a-f]{16}$/)
  assert.equal(identity.assetCount, REVIEW_ASSETS.length)

  // The route-group path must survive intact, not be truncated at `app/`.
  assert.deepEqual(
    [...servedStaticAssets(reviewProbe(REVIEW_HTML))],
    [...REVIEW_ASSETS].sort(),
  )
})

test("order does not change the fingerprint", () => {
  const forward = REVIEW_HTML
  const reversed = [...REVIEW_ASSETS].reverse().map((a) => `<script src="${a}"></script>`).join("")
  assert.equal(
    deriveDeploymentIdentity(reviewProbe(reversed), null).assetFingerprint,
    deriveDeploymentIdentity(reviewProbe(forward), null).assetFingerprint,
  )
})

test("duplicates do not change the fingerprint", () => {
  const once = deriveDeploymentIdentity(reviewProbe(REVIEW_HTML), null)
  const thrice = deriveDeploymentIdentity(
    reviewProbe(REVIEW_HTML + REVIEW_HTML + REVIEW_HTML, REVIEW_ASSETS),
    null,
  )
  assert.equal(thrice.assetFingerprint, once.assetFingerprint)
  assert.equal(thrice.assetCount, once.assetCount)
})

test("escaping artifacts do not change the fingerprint", () => {
  // The same six assets, spelled three ways a real document spells them:
  // percent-encoded route group, JSON-escaped slashes, HTML numeric slashes.
  const percent = REVIEW_HTML.replace("(auth)", "%28auth%29")
  const jsonEscaped = REVIEW_HTML.split("/").join("\\/")
  const htmlEntity = REVIEW_HTML.split("/").join("&#x2F;")

  const base = deriveDeploymentIdentity(reviewProbe(REVIEW_HTML), null).assetFingerprint
  for (const [label, variant] of [
    ["percent-encoded", percent],
    ["JSON-escaped", jsonEscaped],
    ["HTML entity", htmlEntity],
  ] as const) {
    assert.equal(
      deriveDeploymentIdentity(reviewProbe(variant), null).assetFingerprint,
      base,
      `${label} spelling must produce the same binding`,
    )
  }
})

test("trailing syntax from the surrounding document is trimmed, real parens are not", () => {
  assert.equal(
    normalizeAssetUrl("/_next/static/media/bb3ef058b751a6ad-s.p.woff2)"),
    "/_next/static/media/bb3ef058b751a6ad-s.p.woff2",
    "an unbalanced close paren comes from url(...)",
  )
  assert.equal(
    normalizeAssetUrl("/_next/static/chunks/app/(auth)/login/page-bb781eb03e161f27.js"),
    "/_next/static/chunks/app/(auth)/login/page-bb781eb03e161f27.js",
    "a balanced route group is part of the path",
  )
  assert.equal(normalizeAssetUrl("/_next/static/css/a2de97577a924c43.css,"), "/_next/static/css/a2de97577a924c43.css")

  // A CSS url(...) reference and a plain href are the same asset.
  const viaCss = deriveDeploymentIdentity(
    reviewProbe(REVIEW_ASSETS.map((a) => `url(${a})`).join(" ")), null,
  )
  assert.equal(viaCss.assetFingerprint, deriveDeploymentIdentity(reviewProbe(REVIEW_HTML), null).assetFingerprint)
})

test("a rebuilt deployment produces a different binding", () => {
  const rebuilt = REVIEW_HTML.replace("main-app-57aa1716f0d0f500", "main-app-0000000000000000")
  assert.notEqual(
    deriveDeploymentIdentity(reviewProbe(rebuilt), null).assetFingerprint,
    deriveDeploymentIdentity(reviewProbe(REVIEW_HTML), null).assetFingerprint,
  )
})

test("the declared SHA stays unverifiable against the real Review response", () => {
  const identity = assertDeploymentIdentity(reviewProbe(REVIEW_HTML), {
    ...governed,
    declaredCommitSha: "5a369abf12ba3e8e3224bd6a9e24ede7516d144d",
  })
  assert.equal(identity.declaredCommitSha, "5a369abf12ba3e8e3224bd6a9e24ede7516d144d")
  assert.equal(identity.commitShaVerification, "UNVERIFIABLE_FROM_DEPLOYMENT")
})
