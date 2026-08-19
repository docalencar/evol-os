import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const detailPage = readFileSync(
  new URL(
    "../../../app/(dashboard)/app/recruitment/job-openings/[jobOpeningId]/page.tsx",
    import.meta.url
  ),
  "utf8"
)
const managementReadModels = readFileSync(
  new URL(
    "../../dashboard-read/queries/get-management-route-read-models.ts",
    import.meta.url
  ),
  "utf8"
)

test("job opening detail loads its timeline through the safe entity-timeline boundary", () => {
  assert.match(
    detailPage,
    /getManagementEntityTimeline\(\s*companyId,\s*"job_opening"/
  )
})

test("job opening detail no longer uses the direct-read timeline path", () => {
  assert.doesNotMatch(detailPage, /getEntityTimeline|getActivityTimeline/)
  assert.doesNotMatch(detailPage, /\.from\(["']activity_events["']\)/)
})

test("the timeline read schema accepts the job_opening entity type", () => {
  // The 0095 boundary returns entity_type='job_opening'; the read model's strict
  // enum must include it or the payload is rejected by Zod (fail-closed).
  assert.match(managementReadModels, /entity_type: z\.enum\(\[[^\]]*"job_opening"/)
})
