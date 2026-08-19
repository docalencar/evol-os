import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const repository = read("./repositories/job-opening-repository.ts")
const changeStatus = read("./services/change-job-opening-status.ts")
const page = read(
  "../../../app/(dashboard)/app/recruitment/page.tsx"
)

test("open transitions through the 0097 trusted boundary", () => {
  assert.match(repository, /open_tenant_job_opening_v1/)
  // The approved -> open branch delegates to the boundary, not direct DML.
  assert.match(
    changeStatus,
    /existing\.status === "approved"[\s\S]*?input\.values\.status === "open"[\s\S]*?repository\.open\(/
  )
})

test("the approved -> open branch performs no direct status DML", () => {
  // The branch returns from repository.open before reaching updateStatus.
  const branch = changeStatus.slice(
    changeStatus.indexOf('existing.status === "approved"'),
    changeStatus.indexOf("const approverId = existing.approverId")
  )
  assert.match(branch, /repository\.open\(/)
  assert.doesNotMatch(branch, /repository\.updateStatus\(/)
})

test("the Recruitment 'Vagas abertas' StatCard derives from the safe read model", () => {
  // Derived from getRecruitmentWorkspaceReadModel via the pure counter.
  assert.match(page, /getRecruitmentWorkspaceReadModel/)
  assert.match(
    page,
    /label="Vagas abertas"[\s\S]*?value=\{countOpenJobOpenings\(jobOpenings\)\}/
  )
})

test("the 'Vagas abertas' StatCard is not hardcoded to zero", () => {
  assert.doesNotMatch(page, /label="Vagas abertas"\s+value=\{0\}/)
  assert.doesNotMatch(
    page,
    /"Vagas abertas"[\s\S]{0,40}value=\{0\}/
  )
})
