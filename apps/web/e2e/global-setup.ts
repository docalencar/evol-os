/**
 * Global setup — RUNNER ONLY.
 *
 * Order is deliberate and fails closed:
 *
 *   1. resolve + validate env        (refuses Production/Legacy refs outright)
 *   2. prove the target is Review    (from assets the deployment itself serves)
 *   3. only then create identities   (nothing is mutated before step 2 passes)
 *   4. create the run-owned tenant
 *   5. write the untracked run manifest
 */

import { e2eEnv, isCanonicalReviewRun } from "./helpers/env"
import {
  ensureRunDir,
  newRunId,
  writeManifest,
  type RunManifest,
  type SyntheticRole,
  type SyntheticUser,
} from "./helpers/run-context"
import { assertReviewTarget } from "./helpers/target-identity"
import { createSyntheticUser, deleteSyntheticUsers } from "./fixtures/synthetic-identity"
import { createTenantFixture } from "./fixtures/tenant-fixture"

const ROLES: SyntheticRole[] = ["admin", "manager", "employee"]

export default async function globalSetup(): Promise<void> {
  const env = e2eEnv()

  const identity = await assertReviewTarget()
  const canonical = isCanonicalReviewRun(env)

  // Non-secret, safe to print: it is the run's provenance record.
  console.log(
    [
      "[e2e] target        : " + env.baseUrl,
      "[e2e] supabase ref  : " + env.supabaseRef,
      "[e2e] ref in bundle : " + identity.refFoundInBundle,
      "[e2e] chunks scanned: " + identity.chunksScanned,
      "[e2e] canonical run : " + canonical,
    ].join("\n"),
  )

  if (!canonical) {
    console.warn(
      "[e2e] WARNING: this is NOT the canonical hosted Review target. " +
        "The result is harness debugging output, not Review release evidence.",
    )
  }

  ensureRunDir()
  const runId = newRunId()
  console.log("[e2e] run id        : " + runId)

  const created: SyntheticUser[] = []
  try {
    for (const role of ROLES) {
      created.push(await createSyntheticUser(runId, role))
    }

    const tenant = await createTenantFixture(runId, created)

    const manifest: RunManifest = {
      runId,
      createdAt: new Date().toISOString(),
      baseUrl: env.baseUrl,
      supabaseRef: env.supabaseRef,
      companyId: tenant.companyId,
      companySlug: tenant.companySlug,
      companyName: tenant.companyName,
      users: tenant.users,
    }
    writeManifest(manifest)

    console.log("[e2e] company       : " + tenant.companySlug + " (" + tenant.companyId + ")")
  } catch (cause) {
    // Bootstrap failed part-way. Remove only what this run created, then re-throw
    // so the run aborts loudly rather than testing a half-built fixture.
    if (created.length > 0) {
      const { failed } = await deleteSyntheticUsers(created)
      for (const failure of failed) {
        console.error("[e2e] ORPHANED auth user " + failure.userId + ": " + failure.reason)
      }
    }
    throw cause
  }
}
