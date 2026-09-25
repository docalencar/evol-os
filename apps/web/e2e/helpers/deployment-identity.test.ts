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
