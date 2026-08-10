import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const repositoryPath = resolve(
  process.cwd(),
  "src/features/people/repositories/employee-repository.ts"
)
const repositorySource = readFileSync(repositoryPath, "utf8")

test("employee reads use the tenant-safe organization relationships", () => {
  assert.equal(
    repositorySource.match(/teams!people_team_company_fkey\(name\)/g)?.length,
    2
  )
  assert.equal(
    repositorySource.match(
      /positions!people_position_company_fkey\(name\)/g
    )?.length,
    2
  )
  assert.doesNotMatch(repositorySource, /people_team_id_fkey/)
  assert.doesNotMatch(repositorySource, /people_position_id_fkey/)
})
