/**
 * Global setup — RUNNER ONLY.
 *
 * Order is deliberate and fails closed:
 *
 *   1. resolve + validate env        (refuses Production/Legacy refs outright)
 *   2. prove the target is Review    (from assets the deployment itself serves)
 *   3. open the ownership journal    (BEFORE the first mutation)
 *   4. create identities             (each journalled the instant it exists)
 *   5. create the run-owned tenant   (likewise)
 *   6. mark setup complete
 *
 * Step 3 sits where it does because of a real failure: the manifest used to be
 * written only after the whole fixture succeeded, so when person creation threw,
 * teardown found no manifest and a synthetic auth user was stranded.
 */

import { e2eEnv, isCanonicalReviewRun } from "./helpers/env"
import { markSetupComplete, openJournal, recordUser } from "./helpers/journal"
import { newRunId, type SyntheticRole, type SyntheticUser } from "./helpers/run-context"
import { assertReviewTarget } from "./helpers/target-identity"
import { createSyntheticUser } from "./fixtures/synthetic-identity"
import { createTenantFixture, destroyRunFixtures } from "./fixtures/tenant-fixture"

const ROLES: SyntheticRole[] = ["admin", "manager", "employee"]

export default async function globalSetup(): Promise<void> {
  const env = e2eEnv()

  const identity = await assertReviewTarget()
  const canonical = isCanonicalReviewRun(env)

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

  const runId = newRunId()
  console.log("[e2e] run id        : " + runId)

  // Opened before anything exists on Review, so a crash at any later point still
  // leaves teardown something to act on.
  const journal = openJournal({
    runId,
    createdAt: new Date().toISOString(),
    baseUrl: env.baseUrl,
    supabaseRef: env.supabaseRef,
    companyId: null,
    companySlug: null,
    companyName: null,
  })

  try {
    const created: SyntheticUser[] = []
    for (const role of ROLES) {
      const user = await createSyntheticUser(runId, role)
      recordUser(journal, user) // journalled immediately, before the next call
      created.push(user)
    }

    const tenant = await createTenantFixture(runId, created, journal)
    markSetupComplete(journal)

    console.log("[e2e] company       : " + tenant.companySlug + " (" + tenant.companyId + ")")
  } catch (cause) {
    console.error(
      "[e2e] setup failed — rolling back everything recorded in the journal for run " + runId,
    )

    // Same teardown the successful path uses, driven by the journal. Crucially it
    // deletes the company first: removing an auth user cascades to
    // company_members, which then collides with the people→company_members
    // ON DELETE RESTRICT foreign key and strands the user. That is exactly how the
    // previous rollback left an orphan behind.
    const report = await destroyRunFixtures(journal)
    console.error(
      "[e2e] rollback: company " + (report.companyDeleted ? "removed" : "n/a") +
        ", " + report.usersDeleted.length + " auth user(s) removed",
    )
    for (const orphan of report.orphaned) {
      console.error(
        "[e2e] ORPHANED " + orphan.kind + " " + orphan.id + " (run " + runId + "): " + orphan.reason,
      )
    }
    if (report.orphaned.length > 0) {
      console.error(
        "[e2e] The journal was kept. Run `npm --workspace apps/web run e2e:cleanup` to retry.",
      )
    }

    throw cause
  }
}
