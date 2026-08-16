import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const activeEmployeesQuery = readFileSync(
  new URL("./get-active-employees-for-analytics.ts", import.meta.url),
  "utf8",
)
const positionsQuery = readFileSync(
  new URL("../../../organization/positions/queries/get-positions.ts", import.meta.url),
  "utf8",
)
const positionByIdQuery = readFileSync(
  new URL("../../../organization/positions/queries/get-position-by-id.ts", import.meta.url),
  "utf8",
)

test("analytics headcount reads People through the approved tenant projection", () => {
  assert.match(activeEmployeesQuery, /getTenantPeopleDirectory\(companyId\)/)
  assert.doesNotMatch(activeEmployeesQuery, /\.from\(["']people["']\)/)
  assert.doesNotMatch(activeEmployeesQuery, /createClient|createBrowserClient|service_role/)
})

test("legacy position queries do not expose raw database errors", () => {
  for (const source of [positionsQuery, positionByIdQuery]) {
    assert.doesNotMatch(source, /throw error|error\.message/)
    assert.match(source, /throw new Error\("Não foi possível carregar/)
  }
})
