/**
 * The person profile must settle tenant identity BEFORE any audited read runs.
 *
 * This is a structural regression test over the route source, because the
 * property it protects is an *ordering* property and ordering is exactly what a
 * mocked unit test would paper over. The hosted E2E-1 run proved the cost of
 * getting it wrong twice over:
 *
 *   1. `Promise.all` launched every read at once, so a request for a person in
 *      another tenant rejected on `get_tenant_person_competency_expectations_v1`
 *      before `if (!employee) redirect(...)` could run. The user saw an error
 *      boundary instead of being bounced to the list.
 *
 *   2. `read_assessment_administratively` writes an immutable `activity_events`
 *      row through `audit_secure_administrative_read` *before* it checks the
 *      target. A denied read therefore left a permanent audit record of a read
 *      that never happened — and, because `activity_events` has BEFORE
 *      UPDATE/DELETE triggers that always raise, that row made the tenant
 *      undeletable afterwards.
 *
 * Catching the rejection would have hidden (1) while leaving (2) intact. Only the
 * ordering fixes both, so the ordering is what is pinned here.
 *
 * The file lives here rather than beside the route because `tsx --test` treats
 * `[id]` in a path as a glob character class, so a test inside the route folder
 * silently matches nothing and never runs. It reads the route by absolute path
 * instead, which keeps it executable.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const PAGE = resolve(process.cwd(), "src/app/(dashboard)/app/people/[id]/page.tsx")
const source = readFileSync(PAGE, "utf8")

/** The only call permitted to run before the redirect gate. */
const IDENTITY_CALL = "getManagementPersonIncludingTerminated(companyId, id)"

/**
 * Reads that reach an audited boundary. Each writes an `activity_events` row, or
 * can raise a 42501 denial, for a target the page has not yet proven belongs to
 * the current tenant.
 */
const AUDITED_OR_DENYING_READS = [
  "getEmployeeAssessmentSummary",
  "getPersonAssessmentResultDirectoryReadModel",
  "getPersonDirectReportAggregateReadModel",
  "getCanonicalPersonCompetencyCoverage",
]

function indexOfOrFail(needle: string): number {
  const at = source.indexOf(needle)
  assert.notEqual(at, -1, `expected the person page to still contain \`${needle}\``)
  return at
}

test("the tenant identity lookup is awaited on its own, not inside Promise.all", () => {
  const identityAt = indexOfOrFail(IDENTITY_CALL)
  const firstPromiseAll = source.indexOf("await Promise.all(")

  assert.notEqual(firstPromiseAll, -1, "the page should still batch its derived reads")
  assert.ok(
    identityAt < firstPromiseAll,
    "the identity lookup must be resolved before the derived reads are launched",
  )
  assert.match(
    source,
    new RegExp(`const\\s+employee\\s*=\\s*await\\s+${IDENTITY_CALL.replace(/[()]/g, "\\$&")}`),
    "the identity lookup must be a standalone `await`, so its result can gate the rest",
  )
})

test("the redirect gate sits between the identity lookup and every derived read", () => {
  const identityAt = indexOfOrFail(IDENTITY_CALL)
  const redirectAt = indexOfOrFail('redirect("/app/people")')
  const promiseAllAt = indexOfOrFail("await Promise.all(")

  assert.ok(identityAt < redirectAt, "the gate must come after the lookup it depends on")
  assert.ok(
    redirectAt < promiseAllAt,
    "an inaccessible target must leave the page before any derived read is issued",
  )
})

test("no audited or denial-raising read is issued before the redirect gate", () => {
  const redirectAt = indexOfOrFail('redirect("/app/people")')

  for (const call of AUDITED_OR_DENYING_READS) {
    const callAt = source.indexOf(`${call}(companyId, id)`)
    assert.notEqual(callAt, -1, `expected the page to still call ${call}`)
    assert.ok(
      callAt > redirectAt,
      `${call} runs for a target that may not belong to this tenant. It must be ` +
        `issued only after the redirect gate — an audited read leaves an immutable ` +
        `activity_events row that outlives the request and blocks tenant deletion.`,
    )
  }
})

test("the gate checks falsiness of the resolved person, not a truthy batch result", () => {
  assert.match(
    source,
    /if\s*\(\s*!employee\s*\)\s*\{\s*redirect\("\/app\/people"\)/,
    "the redirect must be driven by the absent person, unchanged from before",
  )
})
